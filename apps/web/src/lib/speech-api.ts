import { SPEECH, SPEECH_ERROR, SpeechErrorMessageSchema, SpeechStatusSchema, TranscriptionSchema, type Locale } from "shared";
import { api } from "./api";
import { env } from "@/env";
import { PLAN_COPY, PLAN_STATUS } from "./plan-config";
const METHOD = "POST";
const CREDENTIALS = "include";
const AUDIO_FILENAMES: Partial<Record<string, string>> = { "audio/webm": "dictation.webm", "video/webm": "dictation.webm", "audio/mp4": "dictation.mp4", "video/mp4": "dictation.mp4", "audio/ogg": "dictation.ogg", "audio/wav": "dictation.wav", "audio/x-wav": "dictation.wav", "audio/mpeg": "dictation.mp3" };
const BAD_REQUEST = 400;
const TOO_LARGE = 413;
const TOO_MANY_REQUESTS = 429;
const UNAVAILABLE = 503;
const TIMEOUT = 504;
const ERROR_STATUS: Partial<Record<number, string>> = { [BAD_REQUEST]: SPEECH_ERROR.invalid, [TOO_LARGE]: SPEECH_ERROR.tooLarge, [TOO_MANY_REQUESTS]: SPEECH_ERROR.busy, [UNAVAILABLE]: SPEECH_ERROR.unavailable, [TIMEOUT]: SPEECH_ERROR.timeout, [PLAN_STATUS.unauthorized]: PLAN_COPY.unauthorized };
const MIME_SEPARATOR = ";";
const MIME_INDEX = 0;
const DETECTED_LANGUAGES: Partial<Record<string, Locale>> = { en: "en", english: "en", hi: "hi", hindi: "hi", ta: "ta", tamil: "ta" };
export async function speechStatus() {
  const response = await api.api.speech.status.$get();
  if (!response.ok) throw new Error(response.status === PLAN_STATUS.unauthorized ? PLAN_COPY.unauthorized : PLAN_COPY.authUnavailable);
  return SpeechStatusSchema.parse(await response.json());
}
async function speechFailure(response: Response) {
  const message = SpeechErrorMessageSchema.safeParse(await response.text());
  return new Error(message.success ? message.data : ERROR_STATUS[response.status] ?? SPEECH_ERROR.failed);
}
export async function transcribeAudio(options: { blob: Blob; language: string; signal: AbortSignal }) {
  const form = new FormData();
  const mime = options.blob.type.split(MIME_SEPARATOR)[MIME_INDEX] ?? options.blob.type;
  form.set(SPEECH.fileField, options.blob, AUDIO_FILENAMES[mime] ?? SPEECH.fileName);
  form.set(SPEECH.languageField, options.language);
  const response = await fetch(new URL(SPEECH.transcribePath, env.NEXT_PUBLIC_API_URL), { method: METHOD, credentials: CREDENTIALS, body: form, signal: options.signal });
  if (!response.ok) throw await speechFailure(response);
  const result = TranscriptionSchema.parse(await response.json());
  const language = DETECTED_LANGUAGES[(result.language ?? options.language).toLowerCase()];
  if (!language) throw new Error(SPEECH_ERROR.language);
  return { text: result.text, language };
}
