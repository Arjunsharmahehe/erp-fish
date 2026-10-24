import { AGENT, AgentAnswerSchema, AgentDocumentSchema, AgentRunRequestSchema, AgentRunViewSchema, AgentStatusSchema, type AgentRunRequest, type OriginalMessage } from "shared";
import { api } from "./api";
import { decodeResource } from "./workspace-api";
import { agentUi as AGENT_UI } from "./agent-ui";
import { PLAN_HTTP } from "./plan-config";

export function fetchAgentStatus() { return decodeResource(() => api.api.agent.status.$get(), AgentStatusSchema); }
export function startAgent(input: AgentRunRequest) { return decodeResource(() => api.api.jobs.$post({ json: AgentRunRequestSchema.parse(input) }), AgentRunViewSchema); }
export function fetchAgentRuns(threadId: string) { return decodeResource(() => api.api.chat.threads[":id"].runs.$get({ param: { id: threadId } }), AgentRunViewSchema.array()); }
export function fetchAgentRun(id: string) { return decodeResource(() => api.api.jobs[":id"].$get({ param: { id } }), AgentRunViewSchema); }
export function resolveAgent(id: string) { return decodeResource(() => api.api.jobs[":id"].resolve.$post({ param: { id }, json: { erp_checked: true, run_stopped: true } }), AgentRunViewSchema); }
export function answerAgent(id: string, input: { answer: string; original?: OriginalMessage }) { return decodeResource(() => api.api.jobs[":id"].answer.$post({ param: { id }, json: AgentAnswerSchema.parse(input) }), AgentRunViewSchema); }
export async function parseAgentDocument(file: File) {
  const pdf = file.type === PLAN_HTTP.pdf || file.name.toLowerCase().endsWith(AGENT_UI.pdfExtension);
  const allowed = [pdf, AGENT_UI.textExtensions.some((extension) => file.name.toLowerCase().endsWith(extension))].some(Boolean);
  if (!allowed || file.size > AGENT.maxFileBytes) throw new Error(AGENT_UI.fileError);
  const body = await file.arrayBuffer();
  return decodeResource(() => api.api.agent.document.$post(undefined, { init: { body, headers: { [PLAN_HTTP.contentType]: pdf ? PLAN_HTTP.pdf : AGENT_UI.textMime, [AGENT_UI.fileNameHeader]: encodeURIComponent(file.name) } } }), AgentDocumentSchema);
}
