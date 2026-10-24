import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { CONNECTION_PATHS, ConnectionUpdateSchema, ERP_CREDENTIALS, ErpCredentialsSchema } from "shared";
import { MODEL_SETTINGS, ModelSettingsUpdateSchema } from "shared";
import { modelSettingsState, saveModelSettings, removeModelSettings } from "./model-settings";
import { readSessionUser } from "./auth";
import { connectionState, checkedConnectionState, updateConnection } from "./connections";
import { saveCredentials, removeCredentials } from "./erp-credentials";
import { userMemoryScope } from "./learning-router";
export function createSettingsRouter(db: Database) {
  return new Hono()
    .get(MODEL_SETTINGS.path, async (c) => c.json(modelSettingsState(db, (await readSessionUser(c, db)).id)))
    .patch(MODEL_SETTINGS.path, zValidator("json", ModelSettingsUpdateSchema), async (c) => c.json(await saveModelSettings(db, { userId: (await readSessionUser(c, db)).id, input: c.req.valid("json") })))
    .delete(MODEL_SETTINGS.path, async (c) => c.json(removeModelSettings(db, (await readSessionUser(c, db)).id)))
    .get(CONNECTION_PATHS.settings, async (c) => c.json(await checkedConnectionState(db, await readSessionUser(c, db))))
    .patch(CONNECTION_PATHS.settings, zValidator("json", ConnectionUpdateSchema), async (c) => {
      const user = await readSessionUser(c, db);
      const erpHost = c.req.valid("json").erp_host;
      updateConnection(db, { user, erpHost });
      return c.json(await checkedConnectionState(db, { ...user, erp_host: erpHost }));
    })
    .put(ERP_CREDENTIALS.path, zValidator("json", ErpCredentialsSchema), async (c) => {
      const user = await readSessionUser(c, db);
      saveCredentials(db, { scope: userMemoryScope(user), input: c.req.valid("json") });
      return c.json(connectionState(db, user));
    })
    .delete(ERP_CREDENTIALS.path, async (c) => {
      const user = await readSessionUser(c, db);
      removeCredentials(db, user.id);
      return c.json(connectionState(db, user));
    });
}
