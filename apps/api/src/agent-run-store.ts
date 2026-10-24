import type { Database } from "bun:sqlite";
import { HTTPException } from "hono/http-exception";
import { AGENT, AgentAttemptSchema, AgentRunRequestSchema, AgentRunRowSchema, AgentRunViewSchema, AgentRecordSchema, AgentSessionRowSchema, type AgentRunRow, type AgentRunRequest, type AgentSession } from "shared";
import { agentRunSql as SQL } from "./agent-run-sql";
import { listLearningQuestions } from "./learning";
import { agentQuestion } from "./agent-question";

const CONFIG_MISSING = 404;
const CONFIG_LIMIT = 30;
const STORE = Object.freeze({ missing: CONFIG_MISSING, limit: CONFIG_LIMIT, empty: "", records: "[]" });
export function runView(db: Database, row: AgentRunRow) {
  const request = AgentRunRequestSchema.parse(JSON.parse(row.input_json));
  const pending = row.status === AGENT.statuses.waiting ? listLearningQuestions(db, { scope: { userId: row.user_id, erpHost: row.erp_host }, sourceType: "job", sourceId: row.id }).find((question) => question.status === "pending") : undefined;
  const prompt = pending ? agentQuestion(pending.question, pending.choices) : undefined;
  return AgentRunViewSchema.parse({ ...row, ...prompt, instruction: request.instruction, completion_mode: request.completion_mode, records: AgentRecordSchema.array().parse(JSON.parse(row.records_json)) });
}
export function findAgentRun(db: Database, { id, userId }: { id: string; userId: string }) {
  const row = db.query(SQL.find).get(id, userId);
  if (!row) throw new HTTPException(STORE.missing, { message: AGENT.notFound });
  return AgentRunRowSchema.parse(row);
}
export function threadRuns(db: Database, { threadId, userId }: { threadId: string; userId: string }) { return AgentRunRowSchema.array().parse(db.query(SQL.thread).all(threadId, userId)); }
export function userRuns(db: Database, userId: string) { return AgentRunRowSchema.array().parse(db.query(SQL.list).all(userId, STORE.limit)); }
export function connectionRuns(db: Database, scope: { userId: string; erpHost: string }) { return AgentRunRowSchema.array().parse(db.query(SQL.activeConnection).all(scope.userId, scope.erpHost)); }
export function agentAttempts(db: Database, scope: { id: string; userId: string }) { return AgentAttemptSchema.array().parse(db.query(SQL.readAttempts).all(scope.id, scope.userId)); }
export function activeRuns(db: Database, { threadId, userId }: { threadId: string; userId: string }) { return AgentRunRowSchema.array().parse(db.query(SQL.active).all(threadId, userId)); }
export function insertAgentRun(db: Database, input: { threadId: string; userId: string; erpHost: string; request: AgentRunRequest }) {
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  db.query(SQL.insert).run(id, input.threadId, input.userId, input.erpHost, JSON.stringify(input.request), AGENT.statuses.preparing, STORE.empty, STORE.records, now, now);
  return findAgentRun(db, { id: id, userId: input.userId });
}
export function updateAgentRun(db: Database, { row, update }: { row: AgentRunRow; update: Partial<Pick<AgentRunRow, "status" | "provider_run_id" | "browser_profile_id" | "summary" | "records_json" | "question" | "error">> }) {
  const next = AgentRunRowSchema.parse({ ...row, ...update, updated_at: new Date().toISOString() });
  db.query(SQL.update).run(next.status, next.provider_run_id, next.browser_profile_id, next.summary, next.records_json, next.question, next.error, next.updated_at, next.id, next.user_id);
  if (next.provider_run_id && next.provider_run_id !== row.provider_run_id) db.query(SQL.recordAttempt).run(row.id, next.provider_run_id, next.updated_at);
  return next;
}
export function storedAgentSession(db: Database, input: { threadId: string; userId: string; erpHost: string }) {
  const row = db.query(SQL.session).get(input.threadId, input.userId, input.erpHost);
  return row ? AgentSessionRowSchema.parse(row) : null;
}
export function saveAgentSession(db: Database, session: AgentSession) {
  db.query(SQL.saveSession).run(session.thread_id, session.user_id, session.erp_host, session.profile_id, session.credential_revision);
}
