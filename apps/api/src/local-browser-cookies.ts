import type { Database } from "bun:sqlite";
import type { BrowserContext } from "playwright";
import { BrowserCookiesSchema, BrowserCookiesRowSchema, ERP_CREDENTIALS } from "shared";
import { encryptPayload, decryptPayload } from "./encrypted-payload";
import { browserSql as SQL } from "./browser-storage";
import { env } from "./env";

const FORMAT = Object.freeze({ encoding: "base64", purpose: "erp-fish/browser-cookies/v1", domainPrefix: /^\./u, empty: "", dot: "." });
interface CookieScope { db: Database; userId: string; erpUrl: string; profileId: string }
function encryption(scope: CookieScope) {
  if (!env.ERP_CREDENTIALS_KEY) throw new Error(ERP_CREDENTIALS.unavailable);
  return { key: Buffer.from(env.ERP_CREDENTIALS_KEY, FORMAT.encoding), associatedData: Buffer.from(JSON.stringify([FORMAT.purpose, scope.userId, scope.erpUrl, scope.profileId])) };
}
export async function restoreBrowserCookies(context: BrowserContext, scope: CookieScope) {
  const row = scope.db.query(SQL.readCookies).get(scope.profileId);
  if (!row) return;
  const stored = BrowserCookiesRowSchema.parse(row);
  const cookies = BrowserCookiesSchema.parse(JSON.parse(decryptPayload(stored.encrypted_cookies, encryption(scope))));
  await context.addCookies(cookies);
}
export async function saveBrowserCookies(context: BrowserContext, scope: CookieScope) {
  const hostname = new URL(scope.erpUrl).hostname;
  const cookies = BrowserCookiesSchema.parse(await context.cookies()).filter((cookie) => {
    const domain = cookie.domain.replace(FORMAT.domainPrefix, FORMAT.empty);
    return hostname === domain || hostname.endsWith(`${FORMAT.dot}${domain}`);
  });
  scope.db.query(SQL.saveCookies).run(scope.profileId, encryptPayload(JSON.stringify(cookies), encryption(scope)));
}
