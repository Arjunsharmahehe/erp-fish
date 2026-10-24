const DESKTOP_QUERY = "(min-width: 768px)";
const MAX_TRANSLATIONS = 200;
export const LANGUAGE_CONFIG = {
  storageKey: "erp-fish-language", changeEvent: "erp-fish-language-change", desktopQuery: DESKTOP_QUERY,
  maxCache: MAX_TRANSLATIONS, timeZone: "Asia/Kolkata",
  defaults: { locale: "en" },
  languages: [{ value: "en", label: "English" }, { value: "hi", label: "हिन्दी" }, { value: "ta", label: "தமிழ்" }],
};
export const LANGUAGE_COPY = {
  title: "Language & voice", description: "Choose how you read, write, and speak in your workspace.",
  language: "Language", languageHint: "One language for the interface, voice input, and responses.",
  display: "Display language", spoken: "Spoken language", auto: "Detect automatically",
  enable: "Enable translation", ready: "Translation ready", preparing: "Preparing language download…",
  unavailable: "Translation needs a desktop browser with the Translator API. Use a supported Chrome browser or switch to English.",
  failed: "Translation failed. Retry or view the original English.",
  required: "Translation needs to be initialized. Choose Retry translation to continue.",
  invalid: "Some ERP details could not be preserved. Your text was not sent. Try rephrasing or use English.",
  privacy: "Text translation runs in your browser. Voice recordings are sent to Groq for transcription. Review your transcript before sending.",
  original: "Show original English", translated: "Show translation", translating: "Translating…", retry: "Retry translation",
  record: "Dictate message", stop: "Stop and transcribe", cancel: "Cancel recording", transcribing: "Transcribing…",
  recording: "Recording · up to 2 minutes", microphone: "Microphone access failed. Check browser permissions and try again.",
  review: "Review the transcript below before sending.", useTranscript: "Use transcript", discard: "Discard transcript",
  englishPreview: "English version to save", prepareMemory: "Preview English changes", reviewMemory: "Review the English version before saving. Unchanged fields keep their original values.",
  preferencesFailed: "Could not save language preferences. Allow browser storage and try again.",
  limit: "Recording stopped at the 2 minute limit. Please record a shorter message.",
  replaceDraft: "Replace draft with transcript",
  cancelTranslation: "Cancel download",
};
