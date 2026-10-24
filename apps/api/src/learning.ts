import type { Database } from "bun:sqlite";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { AskQuestionSchema, LearningQuestionRowSchema, LearningQuestionSchema, MemoryEditSchema, QuestionAnswerSchema, RememberAnswerSchema, SavedMemorySchema, type LearningQuestion, type MemoryScope } from "shared";

export const LEARNING_SQL = {
  blockedSources: "CREATE TABLE IF NOT EXISTS forgotten_answers(question_id TEXT PRIMARY KEY)",
  questions: `CREATE TABLE IF NOT EXISTS learning_questions(
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, erp_host TEXT NOT NULL,
    source_type TEXT NOT NULL, source_id TEXT NOT NULL, question TEXT NOT NULL,
    context TEXT NOT NULL, choices TEXT NOT NULL, answer TEXT, status TEXT NOT NULL,
    created_at TEXT NOT NULL, invoice_json TEXT, resume_status TEXT NOT NULL DEFAULT 'idle')`,
  memories: `CREATE TABLE IF NOT EXISTS learned_answers(
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, erp_host TEXT NOT NULL,
    question TEXT NOT NULL, answer TEXT NOT NULL, context TEXT NOT NULL,
    memory_key TEXT NOT NULL, source_question_id TEXT NOT NULL, source_type TEXT NOT NULL,
    source_id TEXT NOT NULL, original_question TEXT NOT NULL, original_answer TEXT NOT NULL,
    updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, erp_host, memory_key))`,
  question: "SELECT * FROM learning_questions WHERE id = ? AND user_id = ? AND erp_host = ?",
  questionsForSource: "SELECT * FROM learning_questions WHERE user_id = ? AND erp_host = ? AND source_type = ? AND source_id = ? ORDER BY created_at, rowid",
  insertQuestion: "INSERT INTO learning_questions(id,user_id,erp_host,source_type,source_id,question,context,choices,status,created_at,invoice_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
  answer: "UPDATE learning_questions SET answer = ?, status = 'answered' WHERE id = ? AND user_id = ? AND erp_host = ? AND status = 'pending'",
  memoriesForScope: "SELECT * FROM learned_answers WHERE user_id = ? AND erp_host = ? AND deleted = 0 ORDER BY updated_at DESC, id",
  memory: "SELECT * FROM learned_answers WHERE id = ? AND user_id = ? AND erp_host = ? AND deleted = 0",
  sourceDeleted: "SELECT question_id FROM forgotten_answers WHERE question_id = ?",
  blockSource: "INSERT OR IGNORE INTO forgotten_answers(question_id) SELECT source_question_id FROM learned_answers WHERE id = ? AND user_id = ? AND erp_host = ?",
  remember: `INSERT INTO learned_answers(id,user_id,erp_host,question,answer,context,memory_key,source_question_id,source_type,source_id,original_question,original_answer,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id,erp_host,memory_key) DO UPDATE SET id=excluded.id, question=excluded.question, answer=excluded.answer, context=excluded.context, source_question_id=excluded.source_question_id, source_type=excluded.source_type, source_id=excluded.source_id, original_question=excluded.original_question, original_answer=excluded.original_answer, updated_at=excluded.updated_at, deleted=0 WHERE learned_answers.deleted=1`,
  keyCollision: "SELECT id FROM learned_answers WHERE user_id = ? AND erp_host = ? AND memory_key = ? AND id != ? AND deleted = 0",
  releaseDeletedKey: "DELETE FROM learned_answers WHERE user_id = ? AND erp_host = ? AND memory_key = ? AND deleted = 1",
  edit: "UPDATE learned_answers SET question = ?, answer = ?, context = ?, memory_key = ?, updated_at = ? WHERE id = ? AND user_id = ? AND erp_host = ? AND deleted = 0",
  forget: "UPDATE learned_answers SET deleted = 1 WHERE id = ? AND user_id = ? AND erp_host = ?",
};
const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;
const ERROR = Object.freeze({ missing: "This question or memory is unavailable.", answered: "This question has already been answered.", unanswered: "Only a user-answered question can become a memory.", forgotten: "The user removed this memory. Ask a new question before learning it again.", conflict: CONFLICT_STATUS, missingStatus: NOT_FOUND_STATUS });
const NORMALIZE_SPACE = /\s+/g;
const SEPARATOR = "\n";
const EMPTY = "";
const MEMORY_COLLISION = "Another memory already uses this question and context.";
function normalize(value: string) { return value.trim().toLowerCase().replace(NORMALIZE_SPACE, " "); }
function parseQuestion(row: z.infer<typeof LearningQuestionRowSchema>): LearningQuestion {
  const choices: unknown = JSON.parse(row.choices);
  return LearningQuestionSchema.parse({ ...row, choices });
}
export function learningQuestion(db: Database, { scope, id }: { scope: MemoryScope; id: string }) {
  const row: unknown = db.query(LEARNING_SQL.question).get(id, scope.userId, scope.erpHost);
  if (!row) throw new HTTPException(ERROR.missingStatus, { message: ERROR.missing });
  return parseQuestion(LearningQuestionRowSchema.parse(row));
}
export function listLearningQuestions(db: Database, { scope, sourceType, sourceId }: { scope: MemoryScope; sourceType: LearningQuestion["source_type"]; sourceId: string }) {
  return db.query(LEARNING_SQL.questionsForSource).all(scope.userId, scope.erpHost, sourceType, sourceId).map((row) => parseQuestion(LearningQuestionRowSchema.parse(row)));
}
export function createLearningQuestion(db: Database, options: { scope: MemoryScope; sourceType: LearningQuestion["source_type"]; sourceId: string; input: z.input<typeof AskQuestionSchema>; invoiceJson?: string }) {
  const input = AskQuestionSchema.parse(options.input);
  const pending = listLearningQuestions(db, { scope: options.scope, sourceType: options.sourceType, sourceId: options.sourceId }).find((question) => question.status === "pending");
  if (pending) return pending;
  const id = crypto.randomUUID();
  db.query(LEARNING_SQL.insertQuestion).run(id, options.scope.userId, options.scope.erpHost, options.sourceType, options.sourceId, input.question, input.context, JSON.stringify(input.choices), "pending", new Date().toISOString(), options.invoiceJson ?? null);
  return learningQuestion(db, { scope: options.scope, id: id });
}
export function answerLearningQuestion(db: Database, { scope, id, answer }: { scope: MemoryScope; id: string; answer: string }) {
  learningQuestion(db, { scope: scope, id: id });
  const parsed = QuestionAnswerSchema.parse({ answer });
  const result = db.query(LEARNING_SQL.answer).run(parsed.answer, id, scope.userId, scope.erpHost);
  if (!result.changes) throw new HTTPException(ERROR.conflict, { message: ERROR.answered });
  return learningQuestion(db, { scope: scope, id: id });
}
export function listSavedMemories(db: Database, scope: MemoryScope) {
  return db.query(LEARNING_SQL.memoriesForScope).all(scope.userId, scope.erpHost).map((row) => SavedMemorySchema.parse(row));
}
export function getSavedMemory(db: Database, { scope, id }: { scope: MemoryScope; id: string }) {
  const row: unknown = db.query(LEARNING_SQL.memory).get(id, scope.userId, scope.erpHost);
  if (!row) throw new HTTPException(ERROR.missingStatus, { message: ERROR.missing });
  return SavedMemorySchema.parse(row);
}
export function rememberAnswer(db: Database, { scope, input }: { scope: MemoryScope; input: z.infer<typeof RememberAnswerSchema> }) {
  const parsed = RememberAnswerSchema.parse(input);
  const question = learningQuestion(db, { scope: scope, id: parsed.question_id });
  if (question.answer === null) throw new HTTPException(ERROR.conflict, { message: ERROR.unanswered });
  const forgotten: unknown = db.query(LEARNING_SQL.sourceDeleted).get(question.id);
  if (forgotten) throw new HTTPException(ERROR.conflict, { message: ERROR.forgotten });
  const existing = listSavedMemories(db, scope);
  if (existing.some((entry) => entry.source_question_id === question.id)) return existing;
  const key = [normalize(parsed.question), normalize(parsed.context)].join(SEPARATOR);
  db.query(LEARNING_SQL.remember).run(crypto.randomUUID(), scope.userId, scope.erpHost, parsed.question, question.answer, parsed.context, key, question.id, question.source_type, question.source_id, question.question, question.answer, new Date().toISOString());
  return listSavedMemories(db, scope);
}
export function editSavedMemory(db: Database, { scope, id, input }: { scope: MemoryScope; id: string; input: z.infer<typeof MemoryEditSchema> }) {
  getSavedMemory(db, { scope: scope, id: id });
  const parsed = MemoryEditSchema.parse(input);
  const key = [normalize(parsed.question), normalize(parsed.context)].join(SEPARATOR);
  const collision: unknown = db.query(LEARNING_SQL.keyCollision).get(scope.userId, scope.erpHost, key, id);
  if (collision) throw new HTTPException(ERROR.conflict, { message: MEMORY_COLLISION });
  db.transaction(() => {
    db.query(LEARNING_SQL.releaseDeletedKey).run(scope.userId, scope.erpHost, key);
    db.query(LEARNING_SQL.edit).run(parsed.question, parsed.answer, parsed.context, key, new Date().toISOString(), id, scope.userId, scope.erpHost);
  })();
  return getSavedMemory(db, { scope: scope, id: id });
}
export function deleteSavedMemory(db: Database, { scope, id }: { scope: MemoryScope; id: string }) {
  getSavedMemory(db, { scope: scope, id: id });
  db.transaction(() => {
    db.query(LEARNING_SQL.blockSource).run(id, scope.userId, scope.erpHost);
    db.query(LEARNING_SQL.forget).run(id, scope.userId, scope.erpHost);
  })();
}
export function learnedContext(db: Database, scope: MemoryScope) {
  const memories = listSavedMemories(db, scope);
  return memories.length ? JSON.stringify(memories.map(({ id, question, answer, context }) => ({ id, question, answer, context }))) : EMPTY;
}
