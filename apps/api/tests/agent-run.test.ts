import { test, expect } from "bun:test";
import { AGENT, LEARNING, DEMO_ERP_HOST, DEMO_INSTRUCTION, DEMO_PO_ID, DEMO_PROFILE_ID, DEMO_INVOICE, DEMO_WAREHOUSE, DEMO_QUESTION_RAW } from "shared";
import { openDb } from "../src/db";
import { insertChatThread } from "../src/threads";
import { startAgentExecution, reconcileAgentExecution, answerAgentExecution, resolveAgentExecution } from "../src/agent-execution";
import { findAgentRun, agentAttempts, runView } from "../src/agent-run-store";
import type { BrowserAgentPort } from "../src/browser-agent-port";
import { listLearningQuestions } from "../src/learning";

const FIXTURE = Object.freeze({ user: "fixture-user", thread: "fixture-thread", revision: "fixture-revision", reference: "fixture-vault-item", password: "fixture-password", run: "fixture-run", now: "2026-10-25T00:00:00.000Z", file: "invoice.json", title: "Invoice" });
test("a completed draft with empty optional metadata persists its verified result", async () => {
  const db = openDb();
  insertChatThread(db, { id: FIXTURE.thread, userId: FIXTURE.user, title: FIXTURE.title, createdAt: FIXTURE.now });
  const goals: string[] = [];
  const port: BrowserAgentPort = {
    prepare: () => Promise.resolve({ profileId: DEMO_PROFILE_ID, credentialRevision: FIXTURE.revision, credentialReference: FIXTURE.reference }),
    start: ({ goal }) => { goals.push(goal); return Promise.resolve(FIXTURE.run); },
    inspect: () => Promise.resolve({ status: "completed", result: { status: "completed", summary: DEMO_PO_ID, question: "", choices: [], memory: { question: LEARNING.empty, context: LEARNING.empty }, records: [{ type: "Purchase Order", id: DEMO_PO_ID, state: "draft" }] } }),
  };
  const deps = { db, port, loadAuthentication: () => ({ credentialReference: FIXTURE.reference, revision: FIXTURE.revision }) };
  const started = startAgentExecution({ threadId: FIXTURE.thread, userId: FIXTURE.user, erpHost: DEMO_ERP_HOST, request: { instruction: DEMO_INSTRUCTION, completion_mode: AGENT.modes.draft, document: { name: FIXTURE.file, text: JSON.stringify(DEMO_INVOICE) } } }, deps);
  expect(started.view.status).toBe(AGENT.statuses.preparing);
  const running = await started.completion;
  expect(running.provider_run_id).toBe(FIXTURE.run);
  const view = await reconcileAgentExecution({ id: running.id, userId: FIXTURE.user }, deps);
  expect(view.thread_id).toBe(FIXTURE.thread);
  expect(view.status).toBe(AGENT.statuses.done);
  expect(view.question).toBeNull();
  expect(view.records).toEqual([{ type: "Purchase Order", id: DEMO_PO_ID, state: "draft" }]);
  expect(goals.join()).toContain(DEMO_INSTRUCTION);
  expect(goals.join()).not.toContain(FIXTURE.password);
  expect(goals.join()).not.toContain(FIXTURE.reference);
  db.close();
});

test("a lost enqueue response blocks new tasks until the user verifies the ERP", async () => {
  const db = openDb();
  insertChatThread(db, { id: FIXTURE.thread, userId: FIXTURE.user, title: FIXTURE.title, createdAt: FIXTURE.now });
  let starts = 0;
  const port: BrowserAgentPort = {
    prepare: () => Promise.resolve({ profileId: DEMO_PROFILE_ID, credentialRevision: FIXTURE.revision, credentialReference: FIXTURE.reference }),
    start: () => { starts++; return Promise.reject(new Error("Connection lost after enqueue")); },
    inspect: () => Promise.resolve({ status: "running" }),
  };
  const deps = { db, port, loadAuthentication: () => ({ credentialReference: FIXTURE.reference, revision: FIXTURE.revision }) };
  const input = { threadId: FIXTURE.thread, userId: FIXTURE.user, erpHost: DEMO_ERP_HOST, request: { instruction: DEMO_INSTRUCTION, completion_mode: AGENT.modes.draft } };
  const started = startAgentExecution(input, deps);
  expect((await started.completion).status).toBe(AGENT.statuses.uncertain);
  expect(() => startAgentExecution(input, deps)).toThrow(AGENT.busy);
  expect(starts).toBe(1);
  const scope = { id: started.view.id, userId: FIXTURE.user };
  expect(resolveAgentExecution(findAgentRun(db, scope), deps).status).toBe(AGENT.statuses.failed);
  expect(starts).toBe(1);
  db.close();
});

test("answering an agent question reuses its session and retains both browser attempts", async () => {
  const db = openDb();
  insertChatThread(db, { id: FIXTURE.thread, userId: FIXTURE.user, title: FIXTURE.title, createdAt: FIXTURE.now });
  const question = "Which warehouse should I use?";
  const choices = [DEMO_WAREHOUSE, "I will provide another warehouse"];
  const answer = "Use Stores - DMPL for purchases.";
  const secondRun = "fixture-run-resumed";
  const goals: string[] = [];
  const sessions: (string | undefined)[] = [];
  const port: BrowserAgentPort = {
    prepare: ({ session }) => { sessions.push(session?.profileId); return Promise.resolve({ profileId: DEMO_PROFILE_ID, credentialRevision: FIXTURE.revision, credentialReference: FIXTURE.reference }); },
    start: ({ goal }) => { goals.push(goal); return Promise.resolve(goals.length === 1 ? FIXTURE.run : secondRun); },
    inspect: () => Promise.resolve({ status: "completed", result: { status: "needs_input", summary: question, question, choices, records: [] } }),
  };
  const deps = { db, port, loadAuthentication: () => ({ credentialReference: FIXTURE.reference, revision: FIXTURE.revision }) };
  const started = startAgentExecution({ threadId: FIXTURE.thread, userId: FIXTURE.user, erpHost: DEMO_ERP_HOST, request: { instruction: DEMO_INSTRUCTION, completion_mode: AGENT.modes.draft } }, deps);
  await started.completion;
  const scope = { id: started.view.id, userId: FIXTURE.user };
  const waiting = await reconcileAgentExecution(scope, deps);
  expect(waiting.status).toBe(AGENT.statuses.waiting);
  expect(waiting.choices).toEqual([DEMO_WAREHOUSE, "I will provide another warehouse"]);
  expect(listLearningQuestions(db, { scope: { userId: FIXTURE.user, erpHost: DEMO_ERP_HOST }, sourceType: "job", sourceId: waiting.id }).at(0)?.choices).toEqual([DEMO_WAREHOUSE, "I will provide another warehouse"]);
  await answerAgentExecution({ row: findAgentRun(db, scope), input: { answer } }, deps).completion;
  expect(sessions).toEqual([undefined, DEMO_PROFILE_ID]);
  expect(goals.at(-1)).toContain(answer);
  expect(agentAttempts(db, scope).map((attempt) => attempt.provider_run_id)).toEqual([FIXTURE.run, secondRun]);
  db.close();
});

test("rechecking an unverified result cannot race closure or enqueue another browser run", async () => {
  const db = openDb();
  insertChatThread(db, { id: FIXTURE.thread, userId: FIXTURE.user, title: FIXTURE.title, createdAt: FIXTURE.now });
  const pending = Promise.withResolvers<Awaited<ReturnType<BrowserAgentPort["inspect"]>>>();
  let inspected = false;
  let starts = 0;
  const port: BrowserAgentPort = {
    prepare: ({ authentication }) => {
      expect(authentication.credentialReference).toBe(FIXTURE.reference);
      return Promise.resolve({ profileId: DEMO_PROFILE_ID, credentialRevision: authentication.revision, credentialReference: authentication.credentialReference });
    },
    start: ({ session }) => { expect(session.credentialReference).toBe(FIXTURE.reference); starts++; return Promise.resolve(FIXTURE.run); },
    inspect: () => {
      if (inspected) return pending.promise;
      inspected = true; return Promise.resolve({ status: "failed", error: AGENT.invalidResult });
    },
  };
  const deps = { db, port, loadAuthentication: () => ({ credentialReference: FIXTURE.reference, revision: FIXTURE.revision }) };
  const started = startAgentExecution({ threadId: FIXTURE.thread, userId: FIXTURE.user, erpHost: DEMO_ERP_HOST, request: { instruction: DEMO_INSTRUCTION, completion_mode: AGENT.modes.draft } }, deps);
  await started.completion;
  const scope = { id: started.view.id, userId: FIXTURE.user };
  expect((await reconcileAgentExecution(scope, deps)).status).toBe(AGENT.statuses.uncertain);
  const recovery = reconcileAgentExecution(scope, deps);
  expect(() => resolveAgentExecution(findAgentRun(db, scope), deps)).toThrow(AGENT.busy);
  pending.resolve({ status: "completed", result: { status: "completed", summary: DEMO_PO_ID, question: "", choices: [], records: [{ type: "Purchase Order", id: DEMO_PO_ID, state: "draft" }] } });
  const result = await recovery;
  expect(result.status).toBe(AGENT.statuses.done);
  expect(result.records).toEqual([{ type: "Purchase Order", id: DEMO_PO_ID, state: "draft" }]);
  expect(starts).toBe(1);
  db.close();
});

const NUMBERED_QUESTIONS = [
  { label: "numbered browser choices become persisted options without losing question context", question: `${DEMO_QUESTION_RAW}\n1) ${DEMO_WAREHOUSE}\n2) I will provide another warehouse\nPlease confirm before I continue.`, prompt: `${DEMO_QUESTION_RAW}\nPlease confirm before I continue.`, choices: [DEMO_WAREHOUSE, "I will provide another warehouse"] },
  { label: "numbered required details stay freeform instead of becoming alternative answers", question: "Please provide both missing details:\n1) Warehouse\n2) Delivery date", prompt: "Please provide both missing details:\n1) Warehouse\n2) Delivery date", choices: [] },
];
test.each(NUMBERED_QUESTIONS)("$label", async ({ question, prompt, choices }) => {
  const db = openDb();
  insertChatThread(db, { id: FIXTURE.thread, userId: FIXTURE.user, title: FIXTURE.title, createdAt: FIXTURE.now });
  const port: BrowserAgentPort = {
    prepare: () => Promise.resolve({ profileId: DEMO_PROFILE_ID, credentialRevision: FIXTURE.revision, credentialReference: FIXTURE.reference }),
    start: () => Promise.resolve(FIXTURE.run),
    inspect: () => Promise.resolve({ status: "completed", result: { status: "needs_input", summary: DEMO_QUESTION_RAW, question, choices: [], records: [] } }),
  };
  const deps = { db, port, loadAuthentication: () => ({ credentialReference: FIXTURE.reference, revision: FIXTURE.revision }) };
  const started = startAgentExecution({ threadId: FIXTURE.thread, userId: FIXTURE.user, erpHost: DEMO_ERP_HOST, request: { instruction: DEMO_INSTRUCTION, completion_mode: AGENT.modes.draft } }, deps);
  await started.completion;
  const scope = { id: started.view.id, userId: FIXTURE.user };
  const waiting = await reconcileAgentExecution(scope, deps);
  expect(waiting.choices).toEqual(choices);
  expect(waiting.question).toBe(prompt);
  expect(runView(db, findAgentRun(db, scope)).choices).toEqual(choices);
  db.close();
});
