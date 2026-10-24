import { z } from "zod";
import type { OriginalMessage } from "shared";
import { ChatResponseSchema, ConnectionStateSchema, ConnectionUpdateSchema, LearningQuestionSchema, MemoryEditSchema, QuestionAnswerSchema, SavedMemorySchema } from "shared";
import { api } from "./api";
import { WORKSPACE_COPY, WORKSPACE_LIMITS } from "./workspace-config";

type ResourceResponse = Pick<Response, "ok" | "status" | "json" | "text">;

async function decodeResource<T>(send: () => Promise<ResourceResponse>, schema: z.ZodType<T>) {
  let response: ResourceResponse;
  try { response = await send(); } catch { throw new Error(WORKSPACE_COPY.unavailable); }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message && message.length <= WORKSPACE_LIMITS.maxError ? message : WORKSPACE_COPY.requestError);
  }
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new Error(WORKSPACE_COPY.invalidResponse);
  return parsed.data;
}
export function fetchMemories() { return decodeResource(() => api.api.learning.memories.$get(), z.array(SavedMemorySchema)); }
export function editMemory(id: string, input: z.infer<typeof MemoryEditSchema>) {
  return decodeResource(() => api.api.learning.memories[":id"].$patch({ param: { id }, json: MemoryEditSchema.parse(input) }), SavedMemorySchema);
}
export async function removeMemory(id: string) {
  let response: ResourceResponse;
  try { response = await api.api.learning.memories[":id"].$delete({ param: { id } }); } catch { throw new Error(WORKSPACE_COPY.unavailable); }
  if (!response.ok) throw new Error(WORKSPACE_COPY.requestError);
}
export function fetchConnection() { return decodeResource(() => api.api.auth.settings.$get(), ConnectionStateSchema); }
export function saveConnection(erpHost: string) {
  return decodeResource(() => api.api.auth.settings.$patch({ json: ConnectionUpdateSchema.parse({ erp_host: erpHost }) }), ConnectionStateSchema);
}
export function prepareConnection() { return decodeResource(() => api.api.auth.connection.reconnect.$post(), ConnectionStateSchema); }
export function refreshConnection() { return decodeResource(() => api.api.auth.connection.refresh.$post(), ConnectionStateSchema); }
export function fetchQuestions(id: string) { return decodeResource(() => api.api.chat.threads[":id"].questions.$get({ param: { id } }), z.array(LearningQuestionSchema)); }
export function answerQuestion(id: string, input: { answer: string; original?: OriginalMessage }) {
  return decodeResource(() => api.api.chat.questions[":id"].answer.$post({ param: { id }, json: QuestionAnswerSchema.parse(input) }), ChatResponseSchema);
}
export function retryQuestion(id: string) { return decodeResource(() => api.api.chat.questions[":id"].retry.$post({ param: { id } }), ChatResponseSchema); }
