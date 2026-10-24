import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { CONNECTION_PATHS, ConnectionUpdateSchema } from "shared";
import { readSessionUser } from "./auth";
import { connectionState, reconnectProfile, refreshConnection, updateConnection } from "./connections";
export function createSettingsRouter(db: Database) {
  return new Hono()
    .get(CONNECTION_PATHS.settings, async (c) => c.json(connectionState(db, await readSessionUser(c, db))))
    .patch(CONNECTION_PATHS.settings, zValidator("json", ConnectionUpdateSchema), async (c) =>
      c.json(updateConnection(db, { user: await readSessionUser(c, db), erpHost: c.req.valid("json").erp_host })))
    .post(CONNECTION_PATHS.reconnect, async (c) => c.json(await reconnectProfile(db, await readSessionUser(c, db))))
    .post(CONNECTION_PATHS.refresh, async (c) => c.json(await refreshConnection(db, await readSessionUser(c, db))));
}
