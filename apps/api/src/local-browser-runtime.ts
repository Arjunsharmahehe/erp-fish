import type { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, type BrowserContext, type Page, type Locator } from "playwright";
import { AGENT, BROWSER, AgentBrowserResultSchema, LocalBrowserRunSchema, MODEL_SETTINGS } from "shared";
import { env } from "./env";
import { readCredentials } from "./erp-credentials";
import { resolveModelConfig } from "./model-settings";
import { runLocalBrowserModel } from "./run-local-browser-model";
import { browserSql as SQL } from "./browser-storage";
import { localBrowserConfig as CONFIG } from "./local-browser-config";
import { logger } from "./logger";
import type { BrowserAgentPort } from "./browser-agent-port";
import { requireLocalBrowser } from "./browser-settings";
import { restoreBrowserCookies, saveBrowserCookies } from "./local-browser-cookies";

interface RunningBrowser { controller: AbortController; context: BrowserContext | null; page: Page | null; completion: Promise<void> | null }
const active = new Map<string, RunningBrowser>();
export function recoverLocalBrowsers(db: Database) { db.query(SQL.interrupted).run(BROWSER.interrupted); }
async function closeBrowser(runId: string, browser: RunningBrowser) {
  try { await browser.context?.close(); }
  catch (error) { logger.warn({ runId, errorType: error instanceof Error ? error.name : typeof error }, CONFIG.logClose); }
}
async function openBrowser(input: { db: Database; userId: string; profileId: string; erpUrl: string }, browser: RunningBrowser) {
  const directory = resolve(env.LOCAL_BROWSER_DATA_DIR, input.profileId);
  await mkdir(directory, { recursive: true });
  const context = await chromium.launchPersistentContext(directory, { headless: env.LOCAL_BROWSER_HEADLESS, executablePath: env.LOCAL_BROWSER_EXECUTABLE, viewport: { width: CONFIG.width, height: CONFIG.height }, acceptDownloads: false, chromiumSandbox: true });
  browser.context = context;
  await restoreBrowserCookies(context, input);
  context.setDefaultTimeout(CONFIG.timeout);
  await context.route("**/*", async (route) => {
    if (route.request().isNavigationRequest() && new URL(route.request().url()).origin !== new URL(input.erpUrl).origin) await route.abort();
    else await route.continue();
  });
  browser.controller.signal.throwIfAborted();
  const page = context.pages().at(CONFIG.first) ?? await context.newPage(); browser.page = page;
  await page.goto(input.erpUrl);
  return page;
}
async function execute(db: Database, options: { input: Parameters<BrowserAgentPort["start"]>[0] & { userId: string; runId: string }; browser: RunningBrowser }) {
  const { input, browser } = options;
  const timer = setTimeout(() => { browser.controller.abort(); }, CONFIG.runTimeout);
  try {
    requireLocalBrowser();
    const config = resolveModelConfig(db, input.userId);
    if (!config) throw new Error(MODEL_SETTINGS.missing);
    const saved = readCredentials(db, { userId: input.userId, erpHost: input.erpUrl });
    if (saved.revision !== input.session.credentialRevision) throw new Error(AGENT.connectionChanged);
    const scope = { db, userId: input.userId, profileId: input.session.profileId, erpUrl: input.erpUrl };
    const page = await openBrowser(scope, browser);
    const runtime = { page, erpUrl: input.erpUrl, credentials: saved.credentials, refs: new Map<string, Locator>(), completionMode: input.completionMode, signal: browser.controller.signal };
    const result = AgentBrowserResultSchema.parse(await runLocalBrowserModel({ runtime, config, goal: input.goal, runId: input.runId, jobId: input.jobId, controller: browser.controller }));
    if (browser.context) await saveBrowserCookies(browser.context, scope);
    await closeBrowser(input.runId, browser);
    browser.controller.signal.throwIfAborted();
    db.query(SQL.finishRun).run("completed", JSON.stringify(result), null, input.runId);
  } catch (error) {
    await closeBrowser(input.runId, browser);
    logger.warn({ jobId: input.jobId, runId: input.runId, errorType: error instanceof Error ? error.name : typeof error, errorFrame: error instanceof Error ? error.stack?.split(CONFIG.newline).find((line) => line.trim().startsWith(CONFIG.stackPrefix)) : undefined }, CONFIG.logFailed);
    db.query(SQL.finishRun).run("failed", null, browser.controller.signal.reason === BROWSER.stopped ? BROWSER.stopped : BROWSER.unavailable, input.runId);
  } finally { clearTimeout(timer); active.delete(input.runId); }
}
export function startLocalBrowser(db: Database, input: Parameters<BrowserAgentPort["start"]>[0] & { userId: string }) {
  requireLocalBrowser();
  const runId = crypto.randomUUID();
  const browser: RunningBrowser = { controller: new AbortController(), context: null, page: null, completion: null };
  db.query(SQL.insertRun).run(runId); active.set(runId, browser);
  browser.completion = execute(db, { input: { ...input, runId }, browser });
  void browser.completion.catch((cause: unknown) => { logger.error({ jobId: input.jobId, runId, errorType: cause instanceof Error ? cause.name : typeof cause }, CONFIG.logFailed); });
  return runId;
}
export function inspectLocalBrowser(db: Database, runId: string): Awaited<ReturnType<BrowserAgentPort["inspect"]>> {
  const row = db.query(SQL.readRun).get(runId);
  if (!row) return { status: "failed", error: BROWSER.interrupted };
  const run = LocalBrowserRunSchema.parse(row);
  if (run.status === "running") return { status: "running" };
  if (run.status === "completed" && run.result_json) return { status: "completed", result: AgentBrowserResultSchema.parse(JSON.parse(run.result_json)) };
  return { status: "failed", error: run.error ?? BROWSER.interrupted };
}
export async function localBrowserFrame(runId: string) {
  requireLocalBrowser();
  const page = active.get(runId)?.page;
  if (!page || page.isClosed()) return null;
  try { return await page.screenshot({ type: "jpeg", quality: CONFIG.jpegQuality, mask: page.frames().map((frame) => frame.locator(CONFIG.protectedSelector)) }); }
  catch (error) {
    logger.debug({ runId, errorType: error instanceof Error ? error.name : typeof error }, CONFIG.logFrame);
    // Navigation can invalidate a frame between polls; return no image and let the next poll retry.
    return null;
  }
}
export async function stopLocalBrowser(db: Database, runId: string) {
  requireLocalBrowser();
  const browser = active.get(runId);
  if (browser) { browser.controller.abort(BROWSER.stopped); await closeBrowser(runId, browser); await browser.completion; }
  db.query(SQL.finishRun).run("failed", null, BROWSER.stopped, runId);
}
