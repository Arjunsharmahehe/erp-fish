import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { AGENT, AgentRunRequestSchema, AgentAnswerSchema, AgentResolveSchema } from "shared";
import { readSessionUser } from "./auth";
import { ownedThread, resolveThreadId } from "./chat-turn";
import { insertChatMessage } from "./threads";
import { requireThreadScope } from "./thread-scope";
import { userMemoryScope } from "./learning-router";
import { agentAvailability, agentDependencies } from "./agent-dependencies";
import { answerAgentExecution, reconcileStoredAgentExecution, startAgentExecution, resolveAgentExecution } from "./agent-execution";
import { activeRuns, findAgentRun, runView, threadRuns, userRuns } from "./agent-run-store";
import { assertChatIdle } from "./chat-lock";
import { listLearningQuestions } from "./learning";
import { logger } from "./logger";

const CONFIG_ACCEPTED = 202;
const CONFIG_UNAVAILABLE = 503;
const CONFIG_CONFLICT = 409;
const HTTP = Object.freeze({ accepted: CONFIG_ACCEPTED, unavailable: CONFIG_UNAVAILABLE, conflict: CONFIG_CONFLICT, backgroundError: "agent_background_failure" });
function observe(completion: Promise<ReturnType<typeof runView>>, id: string) {
  void completion.catch((cause: unknown) => { logger.error({ jobId: id, errorType: cause instanceof Error ? cause.name : typeof cause }, HTTP.backgroundError); });
}
export function createJobRouter(db: Database) {
  return new Hono()
    .get(AGENT.paths.status, async (c) => c.json(await agentAvailability(db, await readSessionUser(c, db))))
    .get(AGENT.paths.jobs, async (c) => c.json(userRuns(db, (await readSessionUser(c, db)).id).map((row) => runView(db, row))))
    .post(AGENT.paths.jobs, zValidator("json", AgentRunRequestSchema), async (c) => {
      const user = await readSessionUser(c, db);
      const ready = await agentAvailability(db, user);
      if (!ready.ready) throw new HTTPException(HTTP.unavailable, { message: ready.message ?? AGENT.unavailable });
      const request = c.req.valid("json");
      const scope = userMemoryScope(user);
      const now = new Date().toISOString();
      const threadId = resolveThreadId(db, { userId: user.id, now, request: { thread_id: request.thread_id, mode: "planning", messages: [{ role: "user", content: request.instruction, original: request.original }] } });
      requireThreadScope(db, { threadId, scope }); assertChatIdle(threadId);
      if (activeRuns(db, { threadId: threadId, userId: user.id }).length || listLearningQuestions(db, { scope, sourceType: "chat", sourceId: threadId }).some((question) => question.status === "pending")) throw new HTTPException(HTTP.conflict, { message: AGENT.busy });
      const started = startAgentExecution({ threadId, userId: user.id, erpHost: scope.erpHost, request }, agentDependencies(db, { userId: user.id, provider: ready.provider }));
      insertChatMessage(db, { id: crypto.randomUUID(), threadId, role: "user", content: request.instruction, original: request.original, attachment: request.document ? { name: request.document.name } : undefined, createdAt: now });
      observe(started.completion, started.view.id);
      return c.json(started.view, HTTP.accepted);
    })
    .get(AGENT.paths.job, async (c) => {
      const user = await readSessionUser(c, db);
      const row = findAgentRun(db, { id: c.req.param("id"), userId: user.id });
      return c.json(await reconcileStoredAgentExecution(row, { db, dependencies: () => agentDependencies(db, { userId: user.id, provider: row.provider }) }));
    })
    .get(AGENT.paths.thread, async (c) => {
      const user = await readSessionUser(c, db);
      const thread = ownedThread(db, { threadId: c.req.param("id"), userId: user.id });
      const runs = threadRuns(db, { threadId: thread.id, userId: user.id });
      const views = await Promise.all(runs.map((row) => reconcileStoredAgentExecution(row, { db, dependencies: () => agentDependencies(db, { userId: user.id, provider: row.provider }) })));
      return c.json(views);
    })
    .post(AGENT.paths.resolve, zValidator("json", AgentResolveSchema), async (c) => {
      const user = await readSessionUser(c, db);
      const row = findAgentRun(db, { id: c.req.param("id"), userId: user.id });
      ownedThread(db, { threadId: row.thread_id, userId: user.id });
      return c.json(resolveAgentExecution(row, { db }));
    })
    .post(AGENT.paths.answer, zValidator("json", AgentAnswerSchema), async (c) => {
      const user = await readSessionUser(c, db);
      const row = findAgentRun(db, { id: c.req.param("id"), userId: user.id });
      ownedThread(db, { threadId: row.thread_id, userId: user.id });
      requireThreadScope(db, { threadId: row.thread_id, scope: userMemoryScope(user) });
      const started = answerAgentExecution({ row, input: c.req.valid("json") }, agentDependencies(db, { userId: user.id, provider: row.provider }));
      observe(started.completion, row.id);
      return c.json(started.view, HTTP.accepted);
    });
}
