import { z } from "zod";
import { API_PATHS, InvoiceJSONSchema, PARSE_OK, ParseResultSchema } from "shared";
import { env } from "@/env";
import { PLAN_API, PLAN_COPY, PLAN_HTTP, PLAN_MODE } from "@/lib/plan-config";

// Track 1 bridge: Track 2 owns these shared response schemas. Move these to
// `shared` during reconciliation and replace the local definitions with imports.
export const SessionUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  erp_host: z.string().nullable(),
  profile_id: z.string().nullable().optional(),
  vault: z.string().optional(),
});
const AuthResponseSchema = z.object({ user: SessionUserSchema });
const ThreadSummarySchema = z.object({ id: z.string(), title: z.string(), created_at: z.string() });
const ChatMessageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string() });
const ThreadDetailSchema = z.object({ thread: ThreadSummarySchema, messages: z.array(ChatMessageSchema) });
const ChatResponseSchema = z.object({ message: z.string(), citations: z.array(z.unknown()), thread_id: z.string() });

export type SessionUser = z.infer<typeof SessionUserSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ThreadSummary = z.infer<typeof ThreadSummarySchema>;
export type Invoice = z.infer<typeof InvoiceJSONSchema>;
interface AuthRequest { email: string; password: string }
interface OnboardRequest { erp_host: string; erp_username?: string; erp_password?: string }
interface ChatRequest { messages: ChatMessage[]; mode: typeof PLAN_MODE.planning; thread_id?: string; invoice?: Invoice }
type JsonBody = AuthRequest | OnboardRequest | ChatRequest;

function apiUrl(path: string): string {
  return `${env.NEXT_PUBLIC_API_URL}${path}`;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(apiUrl(path), { credentials: PLAN_HTTP.include, cache: PLAN_HTTP.noStore, ...init });
  } catch {
    throw new Error(PLAN_COPY.authUnavailable);
  }
}

async function decode<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  if (!response.ok) {
    throw new Error(PLAN_COPY.authError);
  }
  return schema.parse(await response.json());
}

function jsonPost(body: JsonBody): RequestInit {
  return {
    method: PLAN_HTTP.post,
    headers: { [PLAN_HTTP.contentType]: PLAN_HTTP.json },
    body: JSON.stringify(body),
  };
}

export async function authenticate(options: { kind: typeof PLAN_API.signup | typeof PLAN_API.login; email: string; password: string }): Promise<SessionUser> {
  const payload = await decode(await request(options.kind, jsonPost({ email: options.email, password: options.password })), AuthResponseSchema);
  return payload.user;
}

export async function onboard(options: { erpHost: string; username: string; password: string }): Promise<SessionUser> {
  const body: OnboardRequest = {
    erp_host: options.erpHost,
    ...(options.username.trim() ? { erp_username: options.username.trim() } : {}),
    ...(options.password ? { erp_password: options.password } : {}),
  };
  const payload = await decode(await request(PLAN_API.onboarding, jsonPost(body)), z.union([AuthResponseSchema, SessionUserSchema]));
  return "user" in payload ? payload.user : payload;
}

export async function logout(): Promise<void> {
  const response = await request(PLAN_API.logout, { method: PLAN_HTTP.post });
  if (!response.ok) throw new Error(PLAN_COPY.authError);
}

export async function listThreads(): Promise<ThreadSummary[]> {
  return decode(await request(PLAN_API.threads), z.array(ThreadSummarySchema));
}

export async function loadThread(id: string): Promise<ChatMessage[]> {
  const payload = await decode(await request(`${PLAN_API.threads}/${encodeURIComponent(id)}`), ThreadDetailSchema);
  return payload.messages;
}

export async function sendChat(options: { messages: ChatMessage[]; threadId: string | null; invoice: Invoice | null }) {
  const body: ChatRequest = {
    messages: options.messages,
    mode: PLAN_MODE.planning,
    ...(options.threadId ? { thread_id: options.threadId } : {}),
    ...(options.invoice ? { invoice: options.invoice } : {}),
  };
  return decode(await request(PLAN_API.chat, jsonPost(body)), ChatResponseSchema);
}

export async function parseInvoice(file: File): Promise<Invoice> {
  const parsed = await decode(await request(API_PATHS.parse, {
    method: PLAN_HTTP.post,
    headers: { [PLAN_HTTP.contentType]: PLAN_HTTP.pdf },
    body: await file.arrayBuffer(),
  }), ParseResultSchema);
  if (parsed.status !== PARSE_OK) {
    throw new Error(PLAN_COPY.parseFailed);
  }
  return InvoiceJSONSchema.parse(parsed.invoice);
}
