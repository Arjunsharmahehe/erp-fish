import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { generateTranscription } from "@tanstack/ai";
import { createGroqTranscription } from "@tanstack/ai-groq";
import { SPEECH, SPEECH_ERROR, SpeechLanguageFormSchema, TranscriptionSchema, type Locale } from "shared";
import { readSessionUser } from "./auth";
import { env } from "./env";
import { logger } from "./logger";

const INVALID_STATUS = 400;
const TOO_LARGE_STATUS = 413;
const BUSY_STATUS = 429;
const UNAVAILABLE_STATUS = 503;
const TIMEOUT_STATUS = 504;
const FAILED_STATUS = 502;
const HTTP = Object.freeze({ invalid: INVALID_STATUS, tooLarge: TOO_LARGE_STATUS, busy: BUSY_STATUS, unavailable: UNAVAILABLE_STATUS, timeout: TIMEOUT_STATUS, failed: FAILED_STATUS });
const MULTIPART_OVERHEAD = 65536;
const TRANSCRIPTION_LOG = "speech_transcription_failed";
const INPUT_REJECTED_LOG = "speech_input_rejected";
const activeUsers = new Set<string>();
const MIME_SEPARATOR = ";";
const MIME_INDEX = 0;

function readAudio(value: FormDataEntryValue | null) {
  if (!(value instanceof File)) throw new HTTPException(HTTP.invalid, { message: SPEECH_ERROR.invalid });
  if (!value.size) throw new HTTPException(HTTP.invalid, { message: SPEECH_ERROR.empty });
  if (value.size > SPEECH.maxBytes) throw new HTTPException(HTTP.tooLarge, { message: SPEECH_ERROR.tooLarge });
  const mime = value.type.split(MIME_SEPARATOR)[MIME_INDEX]?.trim().toLowerCase();
  if (!mime || !SPEECH.mimeTypes.includes(mime)) {
    logger.warn({ mime, bytes: value.size }, INPUT_REJECTED_LOG);
    throw new HTTPException(HTTP.invalid, { message: SPEECH_ERROR.format });
  }
  return value;
}

async function transcribe(options: { audio: File; language?: Locale; userId: string; signal: AbortSignal }) {
  const key = env.GROQ_API_KEY;
  if (!key) throw new HTTPException(HTTP.unavailable, { message: SPEECH_ERROR.unavailable });
  const timeout = AbortSignal.timeout(SPEECH.timeoutMs);
  try {
    const result = await generateTranscription({
      adapter: createGroqTranscription("whisper-large-v3", key),
      audio: options.audio, language: options.language, debug: false,
      threadId: options.userId, runId: crypto.randomUUID(), abortSignal: AbortSignal.any([options.signal, timeout]),
    });
    return TranscriptionSchema.parse(result);
  } catch (error) {
    logger.warn({ errorType: error instanceof Error ? error.name : typeof error }, TRANSCRIPTION_LOG);
    if (timeout.aborted) throw new HTTPException(HTTP.timeout, { message: SPEECH_ERROR.timeout });
    throw new HTTPException(HTTP.failed, { message: SPEECH_ERROR.failed });
  }
}

export function createSpeechRouter(db: Database) {
  return new Hono()
    .get(SPEECH.statusPath, async (c) => {
      await readSessionUser(c, db);
      return c.json({ available: Boolean(env.GROQ_API_KEY) });
    })
    .post(SPEECH.transcribePath, bodyLimit({ maxSize: SPEECH.maxBytes + MULTIPART_OVERHEAD, onError: () => { throw new HTTPException(HTTP.tooLarge, { message: SPEECH_ERROR.tooLarge }); } }), async (c) => {
      const user = await readSessionUser(c, db);
      if (activeUsers.has(user.id)) throw new HTTPException(HTTP.busy, { message: SPEECH_ERROR.busy });
      activeUsers.add(user.id);
      try {
        const form = await c.req.formData().catch(() => { throw new HTTPException(HTTP.invalid, { message: SPEECH_ERROR.invalid }); });
        const audio = readAudio(form.get(SPEECH.fileField));
        const language = SpeechLanguageFormSchema.safeParse({ language: form.get(SPEECH.languageField) ?? undefined });
        if (!language.success) {
          throw new HTTPException(HTTP.invalid, { message: SPEECH_ERROR.invalid });
        }
        return c.json(await transcribe({ audio, language: language.data.language === "auto" ? undefined : language.data.language, userId: user.id, signal: c.req.raw.signal }));
      } finally { activeUsers.delete(user.id); }
    });
}
