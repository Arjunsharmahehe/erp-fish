import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { BROWSER, BrowserSettingsUpdateSchema } from "shared";
import { readSessionUser } from "./auth";
import { browserSettings, saveBrowserPreference, requireLocalBrowser } from "./browser-settings";
import { findAgentRun } from "./agent-run-store";
import { localBrowserFrame, stopLocalBrowser } from "./local-browser-runtime";
import { reconcileAgentExecution } from "./agent-execution";
import { agentDependencies } from "./agent-dependencies";

const NOT_FOUND = 404;
const HTTP = Object.freeze({ missing: NOT_FOUND, noStore: "no-store", cache: "Cache-Control", type: "Content-Type", jpeg: "image/jpeg" });
function localRun(db: Database, { id, userId }: { id: string; userId: string }) {
  requireLocalBrowser();
  const row = findAgentRun(db, { id, userId });
  if (row.provider !== BROWSER.local || !row.provider_run_id) throw new HTTPException(HTTP.missing, { message: BROWSER.noFrame });
  return { row, runId: row.provider_run_id };
}
export function createBrowserRouter(db: Database) {
  return new Hono()
    .get(BROWSER.settings, async (c) => c.json(browserSettings(db, (await readSessionUser(c, db)).id)))
    .patch(BROWSER.settings, zValidator("json", BrowserSettingsUpdateSchema), async (c) => c.json(saveBrowserPreference(db, { userId: (await readSessionUser(c, db)).id, provider: c.req.valid("json").local ? BROWSER.local : BROWSER.remote })))
    .get(BROWSER.frame, async (c) => {
      const { runId } = localRun(db, { id: c.req.param("id"), userId: (await readSessionUser(c, db)).id });
      const image = await localBrowserFrame(runId);
      if (!image) throw new HTTPException(HTTP.missing, { message: BROWSER.noFrame });
      return c.body(new Uint8Array(image), { headers: { [HTTP.type]: HTTP.jpeg, [HTTP.cache]: HTTP.noStore } });
    })
    .post(BROWSER.stop, async (c) => {
      const user = await readSessionUser(c, db);
      const { row, runId } = localRun(db, { id: c.req.param("id"), userId: user.id });
      await stopLocalBrowser(db, runId);
      return c.json(await reconcileAgentExecution({ id: row.id, userId: user.id }, agentDependencies(db, { userId: user.id, provider: row.provider })));
    });
}
