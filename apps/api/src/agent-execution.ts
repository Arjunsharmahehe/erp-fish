import type { Database } from "bun:sqlite";
import { HTTPException } from "hono/http-exception";
import { AGENT, LEARNING, AgentRecordSchema, AgentRunRequestSchema, AgentBrowserResultSchema, type AgentRunRequest, type AgentRunRow, type AgentBrowserResult, type OriginalMessage } from "shared";
import type { BrowserAgentPort, BrowserAuthentication } from "./browser-agent-port";
import { connectionRuns, findAgentRun, insertAgentRun, runView, saveAgentSession, storedAgentSession, updateAgentRun } from "./agent-run-store";
import { buildAgentGoal } from "./build-agent-goal";
import { findChatThread, insertAssistantReply, insertChatMessage } from "./threads";
import { answerLearningQuestion, createLearningQuestion, listLearningQuestions, rememberAnswer } from "./learning";
import { logger } from "./logger";
import { BrowserAgentError } from "./browser-agent-error";
import { agentQuestion } from "./agent-question";
import { BROWSER, type BrowserProvider } from "shared";

const CONFIG_CONFLICT = 409;
const CONFIG_BAD_GATEWAY = 502;
const EXECUTION = Object.freeze({ conflict: CONFIG_CONFLICT, badGateway: CONFIG_BAD_GATEWAY, log: "agent_transition", empty: "", source: "job", role: "user", first: 0 });
const preparing = new Set<string>();
const inspecting = new Map<string, Promise<ReturnType<typeof runView>>>();
export interface AgentExecutionDeps { db: Database; port: BrowserAgentPort; provider?: BrowserProvider; loadAuthentication: (scope: { userId: string; erpHost: string }) => BrowserAuthentication }
function transition(deps: Pick<AgentExecutionDeps, "db">, { row, update }: Parameters<typeof updateAgentRun>[1]) {
  const next = updateAgentRun(deps.db, { row, update });
  logger.info({ jobId: next.id, threadId: next.thread_id, runId: next.provider_run_id, status: next.status }, EXECUTION.log);
  return next;
}
async function launch(row: AgentRunRow, deps: AgentExecutionDeps) {
  preparing.add(row.id);
  let current = row;
  try {
    const authentication = deps.loadAuthentication({ userId: row.user_id, erpHost: row.erp_host });
    const stored = storedAgentSession(deps.db, { threadId: row.thread_id, userId: row.user_id, erpHost: row.erp_host });
    const session = await deps.port.prepare({ erpUrl: row.erp_host, authentication, session: stored?.provider === row.provider ? { profileId: stored.profile_id, credentialRevision: stored.credential_revision } : null });
    if (deps.loadAuthentication({ userId: row.user_id, erpHost: row.erp_host }).revision !== authentication.revision) throw new Error(AGENT.connectionChanged);
    saveAgentSession(deps.db, { thread_id: row.thread_id, user_id: row.user_id, erp_host: row.erp_host, profile_id: session.profileId, credential_revision: session.credentialRevision, provider: row.provider });
    // Persist uncertainty before enqueue: a lost HTTP response must never trigger a duplicate run.
    current = transition(deps, { row: current, update: { status: AGENT.statuses.uncertain, browser_profile_id: session.profileId, error: AGENT.uncertain } });
    const runId = await deps.port.start({ erpUrl: row.erp_host, goal: buildAgentGoal(deps.db, current), session, jobId: row.id, completionMode: AgentRunRequestSchema.parse(JSON.parse(row.input_json)).completion_mode });
    current = transition(deps, { row: current, update: { status: AGENT.statuses.running, provider_run_id: runId, error: null } });
  } catch (error) {
    logger.warn({ jobId: row.id, runId: current.provider_run_id, errorType: error instanceof Error ? error.name : typeof error }, "agent_launch_failed");
    const message = error instanceof BrowserAgentError ? error.message : AGENT.loginFailed;
    current = transition(deps, { row: current, update: { status: current.status === AGENT.statuses.uncertain ? AGENT.statuses.uncertain : AGENT.statuses.failed, error: current.status === AGENT.statuses.uncertain ? AGENT.uncertain : message } });
  } finally { preparing.delete(row.id); }
  return runView(deps.db, current);
}
export function startAgentExecution(input: { threadId: string; userId: string; erpHost: string; request: AgentRunRequest }, deps: AgentExecutionDeps) {
  if (connectionRuns(deps.db, input).length) throw new HTTPException(EXECUTION.conflict, { message: AGENT.busy });
  const row = insertAgentRun(deps.db, { ...input, provider: deps.provider ?? BROWSER.remote });
  return { view: runView(deps.db, row), completion: launch(row, deps) };
}
function finish({ row, result }: { row: AgentRunRow; result: AgentBrowserResult }, deps: AgentExecutionDeps) {
  if (findChatThread(deps.db, row.thread_id)?.user_id !== row.user_id) throw new HTTPException(EXECUTION.conflict, { message: AGENT.notFound });
  const request = AgentRunRequestSchema.parse(JSON.parse(row.input_json));
  const records = new Map([...AgentRecordSchema.array().parse(JSON.parse(row.records_json)), ...result.records].map((record) => [`${record.type}:${record.id}`, record]));
  const recordsJson = JSON.stringify([...records.values()]);
  if (request.completion_mode === AGENT.modes.draft && result.records.some((record) => record.state === "submitted")) {
    return transition(deps, { row: row, update: { status: AGENT.statuses.uncertain, error: AGENT.draftViolation, summary: result.summary, records_json: recordsJson } });
  }
  return deps.db.transaction(() => {
    const scope = { userId: row.user_id, erpHost: row.erp_host };
    if (result.status === "needs_input" && result.question) createLearningQuestion(deps.db, { scope, sourceType: "job", sourceId: row.id, input: { ...agentQuestion(result.question, result.choices), context: request.instruction.slice(EXECUTION.first, LEARNING.maxText) } });
    const answered = listLearningQuestions(deps.db, { scope, sourceType: "job", sourceId: row.id }).findLast((question) => question.status === "answered");
    if (result.memory && answered) {
      try { rememberAnswer(deps.db, { scope, input: { question_id: answered.id, ...result.memory } }); }
      catch (error) { if (!(error instanceof HTTPException) || error.status !== EXECUTION.conflict) throw error; logger.warn({ jobId: row.id, runId: row.provider_run_id, questionId: answered.id }, "agent_memory_declined"); }
    }
    insertAssistantReply(deps.db, { thread_id: row.thread_id, message: result.summary, citations: [] });
    return transition(deps, { row: row, update: { status: result.status === "needs_input" ? AGENT.statuses.waiting : AGENT.statuses.done, summary: result.summary, records_json: recordsJson, question: result.question ?? null, error: null } });
  })();
}
function canInspect(row: AgentRunRow) {
  return row.status === AGENT.statuses.running || (row.status === AGENT.statuses.uncertain && row.error === AGENT.invalidResult);
}
function applyInspection({ row, status }: { row: AgentRunRow; status: Awaited<ReturnType<BrowserAgentPort["inspect"]>> }, deps: AgentExecutionDeps) {
  const current = findAgentRun(deps.db, { id: row.id, userId: row.user_id });
  if (current.status !== row.status || current.updated_at !== row.updated_at || current.provider_run_id !== row.provider_run_id) return runView(deps.db, current);
  if (status.status === "running") return runView(deps.db, row);
  if (status.status === "failed") return runView(deps.db, transition(deps, { row: row, update: { status: AGENT.statuses.uncertain, error: status.error } }));
  return runView(deps.db, finish({ row, result: AgentBrowserResultSchema.parse(status.result) }, deps));
}
async function inspect({ id, userId }: { id: string; userId: string }, deps: AgentExecutionDeps) {
  const row = findAgentRun(deps.db, { id: id, userId: userId });
  if (row.status === AGENT.statuses.uncertain && preparing.has(row.id)) return runView(deps.db, { ...row, status: AGENT.statuses.preparing, error: null });
  if (row.status === AGENT.statuses.preparing && !preparing.has(row.id)) return runView(deps.db, transition(deps, { row: row, update: { status: AGENT.statuses.failed, error: AGENT.loginFailed } }));
  if (!canInspect(row) || !row.provider_run_id) return runView(deps.db, row);
  let status: Awaited<ReturnType<BrowserAgentPort["inspect"]>>;
  try { status = await deps.port.inspect(row.provider_run_id); }
  catch { throw new HTTPException(EXECUTION.badGateway, { message: AGENT.unavailable }); }
  return applyInspection({ row, status }, deps);
}
export function reconcileAgentExecution({ id, userId }: { id: string; userId: string }, deps: AgentExecutionDeps) {
  const key = JSON.stringify([id, userId]);
  const pending = inspecting.get(key);
  if (pending) return pending;
  const result = inspect({ id, userId }, deps).finally(() => { inspecting.delete(key); });
  inspecting.set(key, result); return result;
}
export function reconcileStoredAgentExecution(row: AgentRunRow, options: { db: Database; dependencies: () => AgentExecutionDeps }) {
  if (!canInspect(row) && row.status !== AGENT.statuses.preparing && !preparing.has(row.id)) return Promise.resolve(runView(options.db, row));
  return reconcileAgentExecution({ id: row.id, userId: row.user_id }, options.dependencies());
}
export function resolveAgentExecution(row: AgentRunRow, deps: Pick<AgentExecutionDeps, "db">) {
  if (row.status !== AGENT.statuses.uncertain || preparing.has(row.id) || inspecting.has(JSON.stringify([row.id, row.user_id]))) throw new HTTPException(EXECUTION.conflict, { message: AGENT.busy });
  return runView(deps.db, transition(deps, { row, update: { status: AGENT.statuses.failed, error: AGENT.reviewed } }));
}
export function answerAgentExecution({ row, input }: { row: AgentRunRow; input: { answer: string; original?: OriginalMessage } }, deps: AgentExecutionDeps) {
  if (row.status !== AGENT.statuses.waiting) throw new HTTPException(EXECUTION.conflict, { message: AGENT.invalidQuestion });
  const scope = { userId: row.user_id, erpHost: row.erp_host };
  const question = listLearningQuestions(deps.db, { scope, sourceType: "job", sourceId: row.id }).find((item) => item.status === "pending");
  if (!question) throw new HTTPException(EXECUTION.conflict, { message: AGENT.invalidQuestion });
  const updated = deps.db.transaction(() => {
    answerLearningQuestion(deps.db, { scope, id: question.id, answer: input.answer });
    insertChatMessage(deps.db, { id: crypto.randomUUID(), threadId: row.thread_id, role: "user", content: input.answer, original: input.original, createdAt: new Date().toISOString() });
    return transition(deps, { row: row, update: { status: AGENT.statuses.preparing, provider_run_id: null, question: null, error: null } });
  })();
  return { view: runView(deps.db, updated), completion: launch(updated, deps) };
}
