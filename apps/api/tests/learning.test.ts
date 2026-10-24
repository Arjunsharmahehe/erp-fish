import { expect, test } from "bun:test";
import { DEMO_ANSWER, DEMO_ERP_HOST, DEMO_QUESTION_RAW } from "shared";
import { openDb } from "../src/db";
import { createLearningQuestion, answerLearningQuestion, rememberAnswer, listSavedMemories, editSavedMemory, deleteSavedMemory, learnedContext } from "../src/learning";

const OWNER = "learning-owner";
const SOURCE = "learning-conversation";
const CONTEXT = "Default receiving warehouse";
test("an answered question becomes reusable only when the agent chooses to remember it", () => {
  const db = openDb();
  const scope = { userId: OWNER, erpHost: DEMO_ERP_HOST };
  const question = createLearningQuestion(db, { scope, sourceType: "chat", sourceId: SOURCE, input: { question: DEMO_QUESTION_RAW, context: CONTEXT, choices: [] } });
  answerLearningQuestion(db, { scope: scope, id: question.id, answer: DEMO_ANSWER });
  expect(listSavedMemories(db, scope)).toEqual([]);
  rememberAnswer(db, { scope: scope, input: { question_id: question.id, question: DEMO_QUESTION_RAW, context: CONTEXT } });
  expect(listSavedMemories(db, scope).map((entry) => entry.answer)).toEqual([DEMO_ANSWER]);
  db.close();
});

test("user edits are reused, deletion blocks resurrection, and a fresh answer can be learned again", () => {
  const db = openDb();
  const scope = { userId: OWNER, erpHost: DEMO_ERP_HOST };
  const input = { question: DEMO_QUESTION_RAW, context: CONTEXT, choices: [] };
  const question = createLearningQuestion(db, { scope, sourceType: "chat", sourceId: SOURCE, input });
  answerLearningQuestion(db, { scope: scope, id: question.id, answer: DEMO_ANSWER });
  const decision = { question_id: question.id, question: DEMO_QUESTION_RAW, context: CONTEXT };
  const memory = rememberAnswer(db, { scope: scope, input: decision }).at(0);
  if (!memory) throw new Error("Expected saved memory");
  const corrected = "Stores - DEMO";
  const editedQuestion = "Which receiving warehouse should this supplier use?";
  editSavedMemory(db, { scope: scope, id: memory.id, input: { question: editedQuestion, context: CONTEXT, answer: corrected } });
  expect(learnedContext(db, scope)).toContain(corrected);
  rememberAnswer(db, { scope: scope, input: decision });
  rememberAnswer(db, { scope: scope, input: { ...decision, question: editedQuestion } });
  expect(listSavedMemories(db, scope)).toHaveLength(1);
  expect(listSavedMemories(db, scope).at(0)?.answer).toBe(corrected);
  deleteSavedMemory(db, { scope: scope, id: memory.id });
  expect(learnedContext(db, scope)).toBe("");
  expect(() => rememberAnswer(db, { scope: scope, input: decision })).toThrow();
  const fresh = createLearningQuestion(db, { scope, sourceType: "chat", sourceId: SOURCE, input });
  answerLearningQuestion(db, { scope: scope, id: fresh.id, answer: DEMO_ANSWER });
  expect(rememberAnswer(db, { scope: scope, input: { ...decision, question_id: fresh.id } }).map((entry) => entry.answer)).toEqual([DEMO_ANSWER]);
  expect(() => rememberAnswer(db, { scope: scope, input: decision })).toThrow();
  expect(listSavedMemories(db, { ...scope, userId: "another-user" })).toEqual([]);
  expect(listSavedMemories(db, { ...scope, erpHost: "https://another-erp.test" })).toEqual([]);
  db.close();
});
