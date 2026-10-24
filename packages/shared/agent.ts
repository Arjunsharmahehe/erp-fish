import { z } from "zod";
import { MIN_TEXT_LENGTH } from "./base";
import { OriginalMessageSchema } from "./language";
import { AskQuestionSchema, MemoryDecisionSchema, LEARNING } from "./learning";
const MAX_DOCUMENT_TEXT = 60000;
const MAX_INSTRUCTION = 12000;
const MAX_SUMMARY = 12000;
const MAX_RECORDS = 50;
const MAX_FILE_BYTES = 10485760;

export const AGENT = Object.freeze({
  paths: Object.freeze({ status: "/api/agent/status", document: "/api/agent/document", jobs: "/api/jobs", job: "/api/jobs/:id", answer: "/api/jobs/:id/answer", resolve: "/api/jobs/:id/resolve", thread: "/api/chat/threads/:id/runs" }),
  modes: Object.freeze({ draft: "draft", submit: "submit" }),
  statuses: Object.freeze({ preparing: "preparing", running: "running", waiting: "waiting", done: "done", failed: "failed", uncertain: "uncertain" }),
  provider: "tinyfish", maxText: MAX_DOCUMENT_TEXT, maxInstruction: MAX_INSTRUCTION, maxSummary: MAX_SUMMARY, maxRecords: MAX_RECORDS, maxFileBytes: MAX_FILE_BYTES,
  missingHost: "Save your ERP URL in Settings first.", missingCredentials: "Save your ERP username and password in Settings first.",
  missingProvider: "Agent mode requires TINYFISH_API_KEY on the API server.",
  busy: "An agent run is active for this ERP account. Wait for it or answer its question in the original chat.",
  uncertain: "The browser run could not be confirmed. Check your ERP before starting another request; it may have made changes.",
  loginFailed: "The ERP login could not be completed. Check your credentials in Settings. MFA and unusual login forms may need a saved session.",
  connectionChanged: "This chat belongs to another ERP connection. Restore that connection or start a new chat.",
  unavailable: "The browser service is unavailable. Try checking the run again.",
  sessionFailed: "Your ERP session could not be saved. No agent task was started. Try again or check the browser provider.",
  invalidResult: "The agent did not return a verified result. Check the ERP before repeating this task.",
  providerRejected: "TinyFish rejected this request under its usage policy. Check the browser run with TinyFish support before trying again.",
  reviewed: "You confirmed that you checked the ERP and that this browser run is no longer active. No task was retried.",
  draftViolation: "The result did not confirm the requested draft policy. Check the ERP before continuing.",
  notFound: "Agent run not found.", invalidQuestion: "This run is not waiting for an answer.",
});
const text = z.string().trim().min(MIN_TEXT_LENGTH);
export const AgentDocumentSchema = z.object({ name: text, text: text.max(AGENT.maxText) });
export const CompletionModeSchema = z.enum([AGENT.modes.draft, AGENT.modes.submit]);
export const AgentRunRequestSchema = z.object({
  thread_id: text.optional(), instruction: text.max(AGENT.maxInstruction), completion_mode: CompletionModeSchema,
  document: AgentDocumentSchema.optional(), original: OriginalMessageSchema.optional(),
});
export const AgentRecordSchema = z.object({ type: text, id: text, state: z.enum(["draft", "submitted", "existing"]), url: z.url().optional() });
const EmptyMemoryDecisionSchema = z.object({ question: z.literal(LEARNING.empty), context: z.literal(LEARNING.empty) }).transform(() => null);
export const AgentBrowserResultSchema = z.object({
  status: z.enum(["completed", "needs_input"]), summary: text.max(AGENT.maxSummary),
  records: z.array(AgentRecordSchema).max(AGENT.maxRecords).default([]), question: z.string().trim().max(LEARNING.maxQuestion).nullish().transform((value) => value?.length ? value : undefined),
  choices: AskQuestionSchema.shape.choices,
  memory: MemoryDecisionSchema.or(EmptyMemoryDecisionSchema).optional(),
}).refine((value) => value.status !== "needs_input" || Boolean(value.question));
export const AgentRunStatusSchema = z.enum([AGENT.statuses.preparing, AGENT.statuses.running, AGENT.statuses.waiting, AGENT.statuses.done, AGENT.statuses.failed, AGENT.statuses.uncertain]);
export const AgentRunViewSchema = z.object({
  id: text, thread_id: text, erp_host: z.url(), instruction: text, completion_mode: CompletionModeSchema,
  status: AgentRunStatusSchema, provider_run_id: text.nullable(), summary: z.string(),
  records: z.array(AgentRecordSchema), question: text.nullable(), error: text.nullable(),
  choices: AskQuestionSchema.shape.choices,
  created_at: text, updated_at: text,
});
export const AgentRunRowSchema = AgentRunViewSchema.omit({ records: true, completion_mode: true, instruction: true, choices: true }).extend({
  user_id: text, input_json: text, records_json: text, browser_profile_id: text.nullable(),
});
export const AgentSessionRowSchema = z.object({ thread_id: text, user_id: text, erp_host: z.url(), profile_id: text, credential_revision: text });
export const AgentAttemptSchema = z.object({ job_id: text, provider_run_id: text, created_at: text });
export const AgentAnswerSchema = z.object({ answer: text.max(LEARNING.maxText), original: OriginalMessageSchema.optional() });
export const AgentResolveSchema = z.object({ erp_checked: z.literal(true), run_stopped: z.literal(true) }).strict();
export const AgentStatusSchema = z.object({ ready: z.boolean(), erp_host: z.string().nullable(), message: text.nullable() });
export const PoOkResultSchema = z.object({ purchase_order_id: text });
export const PoQuestionResultSchema = z.object({ question: text });
export type AgentRunRequest = z.infer<typeof AgentRunRequestSchema>;
export type AgentRunView = z.infer<typeof AgentRunViewSchema>;
export type AgentBrowserResult = z.infer<typeof AgentBrowserResultSchema>;
export type AgentRunRow = z.infer<typeof AgentRunRowSchema>;
export type AgentSession = z.infer<typeof AgentSessionRowSchema>;
