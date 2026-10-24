import { z } from "zod";

export const LANGUAGE = { english: "en", hindi: "hi", tamil: "ta", auto: "auto" };
export const LocaleSchema = z.enum(["en", "hi", "ta"]);
export type Locale = z.infer<typeof LocaleSchema>;
export const SpokenLanguageSchema = z.enum(["auto", "en", "hi", "ta"]);
export const LanguagePreferencesSchema = z.object({ locale: LocaleSchema });
const MAX_DISPLAY_TEXT = 32000;
const MIN_TEXT = 1;
export const OriginalMessageSchema = z.object({ text: z.string().min(MIN_TEXT).max(MAX_DISPLAY_TEXT), language: LocaleSchema });
export type OriginalMessage = z.infer<typeof OriginalMessageSchema>;
export const StoredOriginalSchema = z.object({ original: z.string().nullable() });
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_RECORDING_MS = 120000;
const REQUEST_TIMEOUT_MS = 60000;
export const SPEECH = Object.freeze({
  statusPath: "/api/speech/status", transcribePath: "/api/speech/transcribe",
  model: "whisper-large-v3", maxBytes: MAX_AUDIO_BYTES, maxRecordingMs: MAX_RECORDING_MS, timeoutMs: REQUEST_TIMEOUT_MS,
  fileField: "audio", languageField: "language", fileName: "dictation.webm",
  // Multipart parsers can identify WebM/MP4 audio containers by their video MIME aliases.
  mimeTypes: ["audio/webm", "video/webm", "audio/mp4", "video/mp4", "audio/ogg", "audio/wav", "audio/x-wav", "audio/mpeg"],
});
export const SpeechStatusSchema = z.object({ available: z.boolean() });
export const TranscriptionSchema = z.object({ text: z.string().trim().min(MIN_TEXT).max(MAX_DISPLAY_TEXT), language: z.string().optional() });
export const SpeechLanguageFormSchema = z.object({ language: SpokenLanguageSchema.default("auto") });
export const SPEECH_ERROR = {
  unavailable: "Voice input is unavailable. Add GROQ_API_KEY on the server.",
  invalid: "The recording could not be read. Please record again.",
  tooLarge: "Upload an audio recording smaller than 10 MB.",
  empty: "No audio was captured. Record a little longer and try again.",
  format: "This recording format is not supported. Try recording in Chrome.",
  busy: "A recording is already being transcribed. Please wait.",
  failed: "Transcription failed. Try recording again.",
  timeout: "Transcription timed out. Please try again.",
  language: "This recording's language was not recognized as English, Hindi, or Tamil. Select the spoken language and try again.",
};
export const SpeechErrorMessageSchema = z.enum(SPEECH_ERROR);
