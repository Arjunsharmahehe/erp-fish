import type { Database } from "bun:sqlite";
import { HTTPException } from "hono/http-exception";
import { BROWSER, BrowserPreferenceRowSchema, BrowserSettingsSchema, type BrowserProvider } from "shared";
import { env } from "./env";
import { browserSql } from "./browser-storage";

const FORBIDDEN = 403;
export function requireLocalBrowser() {
  if (env.ERP_FISH_MODE !== BROWSER.local) throw new HTTPException(FORBIDDEN, { message: BROWSER.forbidden });
}
export function browserSettings(db: Database, userId: string) {
  const row = db.query(browserSql.preference).get(userId);
  const preference = row ? BrowserPreferenceRowSchema.parse(row).provider : BROWSER.remote;
  const localAllowed = env.ERP_FISH_MODE === BROWSER.local;
  const forced = localAllowed && !env.TINYFISH_API_KEY;
  return BrowserSettingsSchema.parse({ local_allowed: localAllowed, local_forced: forced, preference, provider: localAllowed && (forced || preference === BROWSER.local) ? BROWSER.local : BROWSER.remote });
}
export function saveBrowserPreference(db: Database, { userId, provider }: { userId: string; provider: BrowserProvider }) {
  requireLocalBrowser();
  db.query(browserSql.savePreference).run(userId, provider);
  return browserSettings(db, userId);
}
