import { z } from "zod";
import {
  AuthResponseSchema, ChatResponseSchema, ChatThreadSchema, ChatThreadDetailSchema,
  InvoiceJSONSchema, PARSE_OK, ParseResultSchema, SessionUserSchema,
  SignupRequestSchema, OnboardingRequestSchema, ChatRequestSchema,
  ThreadUpdateSchema, type ThreadUpdate,
  type ChatMessage, type InvoiceJSON, type SessionUser, type ChatThread,
} from "shared";
import { api } from "@/lib/api";
import { PLAN_API, PLAN_COPY, PLAN_HTTP, PLAN_MODE, PLAN_STATUS, INVOICE_FILE } from "@/lib/plan-config";

export type { ChatMessage, SessionUser } from "shared";
export type ThreadSummary = ChatThread;
export type Invoice = InvoiceJSON;

type ApiResponse = Pick<Response, "ok" | "status" | "json">;

async function request(send: () => Promise<ApiResponse>): Promise<ApiResponse> {
  try {
    return await send();
  } catch {
    throw new Error(PLAN_COPY.authUnavailable);
  }
}

async function decode<T>(response: ApiResponse, schema: z.ZodType<T>): Promise<T> {
  if (!response.ok) {
    switch (response.status) {
      case PLAN_STATUS.unauthorized: throw new Error(PLAN_COPY.unauthorized);
      case PLAN_STATUS.conflict: throw new Error(PLAN_COPY.duplicateEmail);
      case PLAN_STATUS.notFound: throw new Error(PLAN_COPY.notFound);
      case PLAN_STATUS.unavailable: throw new Error(PLAN_COPY.featureUnavailable);
      default: throw new Error(PLAN_COPY.authError);
    }
  }
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new Error(PLAN_COPY.invalidResponse);
  return parsed.data;
}

export async function authenticate(options: { kind: typeof PLAN_API.signup | typeof PLAN_API.login; email: string; password: string }): Promise<SessionUser> {
  const json = SignupRequestSchema.parse({ email: options.email.trim(), password: options.password });
  const response = await request(() => options.kind === PLAN_API.signup ? api.api.auth.signup.$post({ json }) : api.api.auth.login.$post({ json }));
  return (await decode(response, AuthResponseSchema)).user;
}

export async function onboard(options: { erpHost: string }): Promise<SessionUser> {
  const json = OnboardingRequestSchema.parse({
    erp_host: options.erpHost,
  });
  return decode(await request(() => api.api.onboarding.$post({ json })), SessionUserSchema);
}

export async function logout(): Promise<void> {
  const response = await request(() => api.api.auth.logout.$post());
  if (!response.ok) throw new Error(PLAN_COPY.authError);
}

export async function listThreads(): Promise<ThreadSummary[]> {
  return decode(await request(() => api.api.chat.threads.$get()), z.array(ChatThreadSchema));
}

export async function updateThread(id: string, update: ThreadUpdate): Promise<ThreadSummary> {
  const json = ThreadUpdateSchema.parse(update);
  return decode(await request(() => api.api.chat.threads[":id"].$patch({ param: { id }, json })), ChatThreadSchema);
}

export async function deleteThread(id: string): Promise<void> {
  const response = await request(() => api.api.chat.threads[":id"].$delete({ param: { id } }));
  if (!response.ok) throw new Error(PLAN_COPY.authError);
}

export async function loadThread(id: string): Promise<ChatMessage[]> {
  return (await decode(await request(() => api.api.chat.threads[":id"].$get({ param: { id } })), ChatThreadDetailSchema)).messages;
}

export async function sendChat(options: { messages: ChatMessage[]; threadId: string | null; invoice: Invoice | null }) {
  const json = ChatRequestSchema.parse({
    messages: options.messages,
    mode: PLAN_MODE.planning,
    ...(options.threadId ? { thread_id: options.threadId } : {}),
    ...(options.invoice ? { invoice: options.invoice } : {}),
  });
  return decode(await request(() => api.api.chat.$post({ json })), ChatResponseSchema);
}

export async function parseInvoice(file: File): Promise<Invoice> {
  const isJson = file.type === PLAN_HTTP.json || file.name.toLowerCase().endsWith(INVOICE_FILE.jsonExtension);
  const isPdf = file.type === PLAN_HTTP.pdf || file.name.toLowerCase().endsWith(INVOICE_FILE.pdfExtension);
  if (!isJson && !isPdf) throw new Error(PLAN_COPY.unsupportedFile);
  let body: string | ArrayBuffer;
  if (isJson) {
    try {
      const invoiceJson: unknown = JSON.parse(await file.text());
      body = JSON.stringify({ invoiceJson: InvoiceJSONSchema.parse(invoiceJson) });
    } catch {
      throw new Error(PLAN_COPY.invalidInvoiceJson);
    }
  } else {
    body = await file.arrayBuffer();
  }
  const parsed = await decode(await request(() => api.api.parse.$post(undefined, {
    init: { headers: { [PLAN_HTTP.contentType]: isJson ? PLAN_HTTP.json : PLAN_HTTP.pdf }, body },
  })), ParseResultSchema);
  if (parsed.status !== PARSE_OK) throw new Error(PLAN_COPY.parseFailed);
  return parsed.invoice;
}
