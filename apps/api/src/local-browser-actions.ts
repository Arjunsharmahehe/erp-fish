import type { Locator, Page } from "playwright";
import { BROWSER, type BrowserAction, type ErpCredentials } from "shared";
import { localBrowserConfig as CONFIG } from "./local-browser-config";
import { observeBrowser, requireErpOrigin } from "./local-browser-page";

export interface LocalBrowserPage { page: Page; erpUrl: string; credentials: ErpCredentials; refs: Map<string, Locator>; completionMode: "draft" | "submit"; signal: AbortSignal }
function element(runtime: LocalBrowserPage, ref: string) {
  const locator = runtime.refs.get(ref);
  if (!locator) throw new Error(BROWSER.stale);
  return locator;
}
async function signIn(runtime: LocalBrowserPage, action: Extract<BrowserAction, { action: "sign_in" }>) {
  const username = element(runtime, action.username_ref); const password = element(runtime, action.password_ref);
  requireErpOrigin(await password.evaluate((node) => node.ownerDocument.location.href), runtime.erpUrl);
  requireErpOrigin(await username.evaluate((node) => node.ownerDocument.location.href), runtime.erpUrl);
  if (await password.getAttribute(CONFIG.type) !== CONFIG.password) throw new Error(BROWSER.credentialField);
  for (const field of [username, password]) await field.evaluate((node, attribute) => { node.setAttribute(attribute, attribute); }, CONFIG.protectedAttribute);
  await username.fill(runtime.credentials.username); await password.fill(runtime.credentials.password);
}
async function useElement(runtime: LocalBrowserPage, action: Exclude<BrowserAction, { action: "read" | "navigate" | "sign_in" }>) {
  const locator = element(runtime, action.ref);
  requireErpOrigin(await locator.evaluate((node) => node.ownerDocument.location.href), runtime.erpUrl);
  const type = await locator.getAttribute(CONFIG.type);
  if (action.action === "fill" && type === CONFIG.password) throw new Error(BROWSER.credentialField);
  if (action.action === "click" || action.action === "press") await checkDraftAction(runtime, { locator, action });
  if (action.action === "click") await locator.click();
  else if (action.action === "fill") await locator.fill(action.value);
  else if (action.action === "select") await locator.selectOption(action.value);
  else await locator.press(action.key);
}
async function checkDraftAction(runtime: LocalBrowserPage, { locator, action }: { locator: Locator; action: Extract<BrowserAction, { action: "click" | "press" }> }) {
  if (runtime.completionMode !== "draft") return;
  const target = await locator.evaluate((node, config) => {
    const control = node instanceof HTMLButtonElement || node instanceof HTMLInputElement;
    const form = control ? node.form : node.closest("form");
    return { login: Boolean(form?.querySelector(config.loginField)), submitting: control && node.type === config.submit,
      label: [node.getAttribute(config.ariaLabel), node.getAttribute(config.title), node instanceof HTMLInputElement ? node.value : node.textContent].filter(Boolean).join(" ").trim() };
  }, CONFIG);
  if (target.login) return;
  const implicitSubmission = action.action === "press" && action.key === CONFIG.enter;
  if (implicitSubmission || CONFIG.finalAction.test(target.label) || (target.submitting && !target.label)) throw new Error(BROWSER.draftBlocked);
}
export async function actInBrowser(runtime: LocalBrowserPage, action: BrowserAction) {
  runtime.signal.throwIfAborted(); requireErpOrigin(runtime.page.url(), runtime.erpUrl);
  if (action.action === "navigate") { requireErpOrigin(action.url, runtime.erpUrl); await runtime.page.goto(action.url); }
  else if (action.action === "sign_in") await signIn(runtime, action);
  else if (action.action !== "read") await useElement(runtime, action);
  runtime.signal.throwIfAborted();
  return observeBrowser(runtime.page, runtime);
}
