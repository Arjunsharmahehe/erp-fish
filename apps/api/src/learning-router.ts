import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { LEARNING_PATHS, MemoryEditSchema } from "shared";
import { readSessionUser } from "./auth";
import { deleteSavedMemory, editSavedMemory, listSavedMemories } from "./learning";
import type { UserRow } from "./users";

const HOST_REQUIRED = "Set your ERP URL in Settings first.";
const CONFLICT = 409;
const NO_CONTENT = 204;
export function userMemoryScope(user: UserRow) {
  if (!user.erp_host) throw new HTTPException(CONFLICT, { message: HOST_REQUIRED });
  return { userId: user.id, erpHost: user.erp_host };
}
export function createLearningRouter(db: Database) {
  return new Hono()
    .get(LEARNING_PATHS.memories, async (c) => c.json(listSavedMemories(db, userMemoryScope(await readSessionUser(c, db)))))
    .patch(LEARNING_PATHS.memory, zValidator("json", MemoryEditSchema), async (c) => c.json(editSavedMemory(db, { scope: userMemoryScope(await readSessionUser(c, db)), id: c.req.param("id"), input: c.req.valid("json") })))
    .delete(LEARNING_PATHS.memory, async (c) => {
      deleteSavedMemory(db, { scope: userMemoryScope(await readSessionUser(c, db)), id: c.req.param("id") });
      return c.body(null, NO_CONTENT);
    });
}
