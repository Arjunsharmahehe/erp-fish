import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { LEARNING_PATHS, QuestionAnswerSchema, QuestionResumeRowSchema, InvoiceJSONSchema, type LearningQuestion, type MemoryScope } from "shared";
import { readSessionUser } from "./auth";
import { ownedThread, runAssistantTurn } from "./chat-turn";
import { answerLearningQuestion, LEARNING_SQL, learningQuestion, listLearningQuestions } from "./learning";
import { userMemoryScope } from "./learning-router";
import { insertChatMessage, listChatMessages } from "./threads";
import { logger } from "./logger";
import { assertChatIdle } from "./chat-lock";

const CONFLICT_STATUS = 409;
const BAD_GATEWAY_STATUS = 502;
const RESUME = Object.freeze({
  claim: "UPDATE learning_questions SET resume_status='running' WHERE id=? AND user_id=? AND status='answered' AND resume_status IN ('idle','failed')",
  complete: "UPDATE learning_questions SET resume_status=? WHERE id=?",
  conflict: CONFLICT_STATUS, badGateway: BAD_GATEWAY_STATUS,
  busy: "This answer is already being processed or has completed.",
  failure: "Your answer was saved, but the agent could not continue. Retry to resume.",
  wrongSource: "This question belongs to a job. Answer it from that job.",
  logged: "question_resume_failed",
});
async function resumeQuestion(db: Database, { scope, question }: { scope: MemoryScope; question: LearningQuestion }) {
  if (question.source_type !== "chat") throw new HTTPException(RESUME.conflict, { message: RESUME.wrongSource });
  ownedThread(db, { threadId: question.source_id, userId: scope.userId });
  if (listLearningQuestions(db, { scope: scope, sourceType: "chat", sourceId: question.source_id }).some((item) => item.id !== question.id && (item.status === "pending" || item.resume_status === "running"))) {
    throw new HTTPException(RESUME.conflict, { message: RESUME.busy });
  }
  const claimed = db.query(RESUME.claim).run(question.id, scope.userId);
  if (!claimed.changes) throw new HTTPException(RESUME.conflict, { message: RESUME.busy });
  try {
    const raw: unknown = db.query(LEARNING_SQL.question).get(question.id, scope.userId, scope.erpHost);
    const row = QuestionResumeRowSchema.parse(raw);
    const invoice = row.invoice_json ? InvoiceJSONSchema.parse(JSON.parse(row.invoice_json)) : undefined;
    const reply = await runAssistantTurn({ db, threadId: question.source_id, request: { thread_id: question.source_id, messages: listChatMessages(db, question.source_id), mode: "planning", invoice } });
    db.query(RESUME.complete).run("done", question.id);
    return reply;
  } catch (error) {
    db.query(RESUME.complete).run("failed", question.id);
    logger.error({ threadId: question.source_id, questionId: question.id, errorType: error instanceof Error ? error.name : typeof error }, RESUME.logged);
    throw new HTTPException(RESUME.badGateway, { message: RESUME.failure });
  }
}
export function createQuestionRouter(db: Database) {
  return new Hono()
    .get(LEARNING_PATHS.questions, async (c) => {
      const scope = userMemoryScope(await readSessionUser(c, db));
      const thread = ownedThread(db, { threadId: c.req.param("id"), userId: scope.userId });
      return c.json(listLearningQuestions(db, { scope: scope, sourceType: "chat", sourceId: thread.id }));
    })
    .post(LEARNING_PATHS.answer, zValidator("json", QuestionAnswerSchema), async (c) => {
      const scope = userMemoryScope(await readSessionUser(c, db));
      const id = c.req.param("id");
      const question = learningQuestion(db, { scope: scope, id: id });
      ownedThread(db, { threadId: question.source_id, userId: scope.userId });
      assertChatIdle(question.source_id);
      if (question.source_type !== "chat") throw new HTTPException(RESUME.conflict, { message: RESUME.wrongSource });
      const answer = c.req.valid("json").answer;
      const answered = db.transaction(() => {
        const updated = answerLearningQuestion(db, { scope: scope, id: id, answer: answer });
        insertChatMessage(db, { id: crypto.randomUUID(), threadId: question.source_id, role: "user", content: answer, createdAt: new Date().toISOString() });
        return updated;
      })();
      return c.json(await resumeQuestion(db, { scope: scope, question: answered }));
    })
    .post(LEARNING_PATHS.retry, async (c) => {
      const scope = userMemoryScope(await readSessionUser(c, db));
      return c.json(await resumeQuestion(db, { scope, question: learningQuestion(db, { scope, id: c.req.param("id") }) }));
    });
}
