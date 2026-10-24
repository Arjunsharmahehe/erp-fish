import type { Locale } from "shared";
import { LANGUAGE_CONFIG, LANGUAGE_COPY } from "./language-config";

type Availability = "unavailable" | "downloadable" | "downloading" | "available";
interface TranslatorInstance {
  translate: (text: string, options?: { signal?: AbortSignal }) => Promise<string>;
  destroy: () => void;
}
interface LanguagePair { sourceLanguage: string; targetLanguage: string }
interface TranslatorFactory {
  availability: (pair: LanguagePair) => Promise<Availability>;
  create: (options: LanguagePair & { signal?: AbortSignal; monitor?: (monitor: EventTarget) => void }) => Promise<TranslatorInstance>;
}
declare global { interface Window { Translator?: TranslatorFactory } }

const engines = new Map<string, TranslatorInstance>();
const restorations = new Map<Locale, Promise<void>>();
const cache = new Map<string, string>();
const PROTECTED = /https?:\/\/[^\s<>]+|`[^`]*`|\b[\w./:@-]*\d[\w.,/:@%-]*\b|\b(?:ERPNext|ERP Fish|TinyFish|Purchase Order|Purchase Invoice|Sales Order|Sales Invoice|Stock Entry|Material Receipt|Item Code|Item Name|Warehouse|Supplier|Customer|Company|Cost Center|Posting Date|Due Date|Currency|Quantity|Rate|Amount|Taxes|Grand Total|invoice_no|item_code|supplier|warehouse|qty|rate|UOM|INR|USD|GST|CGST|SGST|IGST)\b/gi;
const PROTECTED_SEGMENTS = new RegExp(`(${PROTECTED.source})`, PROTECTED.flags);
const LETTER = /\p{L}/u;
const SEGMENT_PAIR = 2;
const LITERAL_SEGMENT = 1;
const SEPARATOR = ":";

export function translatorSupported() { return typeof window !== "undefined" && Boolean(window.Translator) && window.matchMedia(LANGUAGE_CONFIG.desktopQuery).matches; }
export function translationReady(locale: Locale) { return locale === "en" || (engines.has(`en:${locale}`) && engines.has(`${locale}:en`)); }

export async function prepareTranslation(locale: Locale, signal: AbortSignal) {
  const restoration = restorations.get(locale);
  // An automatic attempt may require user activation. This explicit action retries
  // that failure with download permission, and reports its own failure to the UI.
  if (restoration) await Promise.allSettled([restoration]);
  return createTranslation({ locale, signal, allowDownload: true });
}

async function createTranslation({ locale, signal, allowDownload }: { locale: Locale; signal: AbortSignal; allowDownload: boolean }) {
  signal.throwIfAborted();
  if (locale === "en" || translationReady(locale)) return;
  const factory = window.Translator;
  if (!factory || !translatorSupported()) throw new Error(LANGUAGE_COPY.unavailable);
  const pairs = [{ sourceLanguage: "en", targetLanguage: locale }, { sourceLanguage: locale, targetLanguage: "en" }];
  const availability = await Promise.all(pairs.map((pair) => factory.availability(pair)));
  signal.throwIfAborted();
  if (availability.includes("unavailable")) throw new Error(LANGUAGE_COPY.unavailable);
  if (!allowDownload && availability.some((state) => state !== "available")) throw new Error(LANGUAGE_COPY.required);
  const created: TranslatorInstance[] = [];
  const download = new AbortController();
  const cancelDownload = () => { download.abort(); };
  signal.addEventListener("abort", cancelDownload, { once: true });
  try {
    // Downloads require a user action; automatic restoration only uses available packs.
    const results = await Promise.allSettled(pairs.map(async (pair) => {
      const engine = await factory.create({ ...pair, signal: download.signal });
      created.push(engine);
      return { pair, engine };
    }));
    signal.throwIfAborted();
    installEngines(results);
  } catch (error) { for (const engine of created) engine.destroy(); throw error; }
  finally { signal.removeEventListener("abort", cancelDownload); }
}
async function restoreTranslation(locale: Locale) {
  if (translationReady(locale)) return;
  const existing = restorations.get(locale);
  if (existing) return existing;
  const pending = createTranslation({ locale, signal: new AbortController().signal, allowDownload: false });
  restorations.set(locale, pending);
  try { await pending; } finally { restorations.delete(locale); }
}
function installEngines(results: PromiseSettledResult<{ pair: LanguagePair; engine: TranslatorInstance }>[]) {
  for (const result of results) { if (result.status === "rejected") throw new Error(LANGUAGE_COPY.failed); }
  for (const result of results) {
    if (result.status === "fulfilled") engines.set(`${result.value.pair.sourceLanguage}:${result.value.pair.targetLanguage}`, result.value.engine);
  }
}

interface ProseTranslation { text: string; engine: TranslatorInstance; signal?: AbortSignal }
async function translateProse({ text, engine, signal }: ProseTranslation) {
  const prose = text.trim();
  const start = text.indexOf(prose);
  const translated = await engine.translate(prose, { signal });
  return `${text.slice(0, start)}${translated}${text.slice(start + prose.length)}`;
}
async function translateProtected({ text, engine, signal }: ProseTranslation) {
  // Captured delimiters occupy odd positions. Exact literals never enter the model.
  const parts = await Promise.all(text.split(PROTECTED_SEGMENTS).map(async (part, index) =>
    index % SEGMENT_PAIR === LITERAL_SEGMENT || !LETTER.test(part) ? part : translateProse({ text: part, engine, signal })));
  return parts.join("");
}
interface TranslationOptions { source: Locale; target: Locale; signal?: AbortSignal }
async function getEngine(options: TranslationOptions) {
  if (!engines.has(`${options.source}:${options.target}`)) await restoreTranslation(options.source === "en" ? options.target : options.source);
  options.signal?.throwIfAborted();
  const engine = engines.get(`${options.source}:${options.target}`);
  if (!engine || !translatorSupported()) throw new Error(LANGUAGE_COPY.required);
  return engine;
}
export async function translateText(text: string, options: TranslationOptions) {
  options.signal?.throwIfAborted();
  if (options.source === options.target || !text.trim()) return text;
  const key = [options.source, options.target, text].join(SEPARATOR);
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const engine = await getEngine(options);
  const result = await translateProtected({ text, engine, signal: options.signal }).catch(() => {
    options.signal?.throwIfAborted();
    throw new Error(LANGUAGE_COPY.failed);
  });
  options.signal?.throwIfAborted();
  if (cache.size >= LANGUAGE_CONFIG.maxCache) cache.clear();
  cache.set(key, result);
  return result;
}
