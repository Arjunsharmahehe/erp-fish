import { expect, test } from "bun:test";
import {
  CHAT_ROLE_ASSISTANT,
  CHAT_ROLE_USER,
  DEMO_INVOICE,
  DEMO_INVOICE_NO,
  DEMO_SUPPLIER,
  type ChatMessage,
} from "shared";
import { planChat, type PlanChatLlmPort } from "../src/chat";

// Seam D (planning chat), confirmed for the backend plan-mode lane:
// POST /api/chat with a stubbed chat LLM returns the canned answer.
// Expected values are frozen literals below, never recomputed from chat.ts.

const USER_MESSAGE: ChatMessage = {
  role: CHAT_ROLE_USER,
  content: "What is the total for this invoice?",
} as const;

const FROZEN_FETCH_URL_TOOL = "fetch_url" as const;
const FROZEN_WEB_SEARCH_TOOL = "web_search" as const;

const CANNED_MESSAGE =
  `Invoice ${DEMO_INVOICE_NO} from ${DEMO_SUPPLIER} totals 2500 across 2 lines.` as const;
const CANNED_CITATION = "https://example.com/gst-rate-guide" as const;

const cannedLlm: PlanChatLlmPort = {
  completePlanningChat: () =>
    Promise.resolve({ message: CANNED_MESSAGE, citations: [CANNED_CITATION] }),
};

test("planning answer over an attached invoice cites invoice values", async () => {
  const seenSystems: string[] = [];
  const recordingLlm: PlanChatLlmPort = {
    completePlanningChat: (request) => {
      seenSystems.push(request.system);
      return cannedLlm.completePlanningChat(request);
    },
  };
  const result = await planChat(
    { messages: [USER_MESSAGE], invoice: DEMO_INVOICE },
    { llm: recordingLlm, toolsAvailable: true },
  );
  expect(result).toEqual({ message: CANNED_MESSAGE, citations: [CANNED_CITATION] });
  expect(seenSystems.join("")).toContain(DEMO_INVOICE_NO);
  expect(seenSystems.join("")).toContain(DEMO_SUPPLIER);
});

test("planning answer without an invoice still reaches the chat LLM", async () => {
  const result = await planChat(
    { messages: [USER_MESSAGE] },
    { llm: cannedLlm, toolsAvailable: true },
  );
  expect(result).toEqual({ message: CANNED_MESSAGE, citations: [CANNED_CITATION] });
});

test("keyless chat degrades to a notice without calling the LLM", async () => {
  const result = await planChat(
    { messages: [USER_MESSAGE], invoice: DEMO_INVOICE },
    { llm: undefined, toolsAvailable: false },
  );
  expect(result).toEqual({
    message:
      "I cannot browse the web or reach a model in this environment yet, so I cannot answer. Configure the OpenAI-compatible model and TinyFish keys to enable planning chat.",
    citations: [],
  });
});

test("tools are exposed with keys and omitted without them", async () => {
  const seenTools: string[][] = [];
  const recordingLlm: PlanChatLlmPort = {
    completePlanningChat: (request) => {
      seenTools.push(request.tools.map((tool) => tool.name));
      return cannedLlm.completePlanningChat(request);
    },
  };
  await planChat({ messages: [USER_MESSAGE] }, { llm: recordingLlm, toolsAvailable: true });
  const [firstTools = []] = seenTools;
  expect(firstTools).toContain(FROZEN_FETCH_URL_TOOL);
  expect(firstTools).toContain(FROZEN_WEB_SEARCH_TOOL);
  await planChat({ messages: [USER_MESSAGE] }, { llm: recordingLlm, toolsAvailable: false });
  const [, secondTools = []] = seenTools;
  expect(secondTools).toEqual([]);
});

test("assistant history round-trips through the chat LLM untouched", async () => {
  const history: ChatMessage[] = [
    USER_MESSAGE,
    { role: CHAT_ROLE_ASSISTANT, content: CANNED_MESSAGE },
  ];
  const seenMessages: ChatMessage[][] = [];
  const recordingLlm: PlanChatLlmPort = {
    completePlanningChat: (request) => {
      seenMessages.push(request.messages);
      return cannedLlm.completePlanningChat(request);
    },
  };
  await planChat({ messages: history }, { llm: recordingLlm, toolsAvailable: false });
  const [firstSeen = []] = seenMessages;
  expect(firstSeen).toEqual(history);
});
