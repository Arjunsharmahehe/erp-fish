import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { CONNECTION_PATHS, ConnectionUpdateSchema } from "shared";
import { MODEL_SETTINGS, ModelSettingsUpdateSchema } from "shared";
import { modelSettingsState, saveModelSettings, removeModelSettings } from "./model-settings";
import { readSessionUser } from "./auth";
import { connectionState, reconnectProfile, refreshConnection, updateConnection } from "./connections";
export function createSettingsRouter(db: Database) {
  return new Hono()
    .get(MODEL_SETTINGS.path, async (c) => c.json(modelSettingsState(db, (await readSessionUser(c, db)).id)))
    .patch(MODEL_SETTINGS.path, zValidator("json", ModelSettingsUpdateSchema), async (c) => c.json(await saveModelSettings(db, { userId: (await readSessionUser(c, db)).id, input: c.req.valid("json") })))
    .delete(MODEL_SETTINGS.path, async (c) => c.json(removeModelSettings(db, (await readSessionUser(c, db)).id)))
    .get(CONNECTION_PATHS.settings, async (c) => c.json(connectionState(db, await readSessionUser(c, db))))
    .patch(CONNECTION_PATHS.settings, zValidator("json", ConnectionUpdateSchema), async (c) =>
      c.json(updateConnection(db, { user: await readSessionUser(c, db), erpHost: c.req.valid("json").erp_host })))
    .post(CONNECTION_PATHS.reconnect, async (c) => c.json(await reconnectProfile(db, await readSessionUser(c, db))))
    .post(CONNECTION_PATHS.refresh, async (c) => c.json(await refreshConnection(db, await readSessionUser(c, db))));
}
