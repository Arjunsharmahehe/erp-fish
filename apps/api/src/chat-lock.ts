import { HTTPException } from "hono/http-exception";
const activeThreads = new Set<string>();
const BUSY = "The agent is already working in this conversation.";
const CONFLICT = 409;
export function assertChatIdle(threadId: string) {
  if (activeThreads.has(threadId)) throw new HTTPException(CONFLICT, { message: BUSY });
}
export async function withChatLock<T>(threadId: string, run: () => Promise<T>): Promise<T> {
  assertChatIdle(threadId);
  activeThreads.add(threadId);
  try { return await run(); } finally { activeThreads.delete(threadId); }
}
