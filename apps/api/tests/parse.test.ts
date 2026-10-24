import { expect, test } from "bun:test";
import {
  DEMO_INVOICE,
  DEMO_INVOICE_NO,
  FIX_REASON_EXTRACT_FAILED,
  FIX_REASON_LLM_FAILED,
  FIX_REASON_VALIDATION_FAILED,
  PARSE_NEEDS_FIX,
  PARSE_OK,
} from "shared";
import type { LlmPort } from "../src/parse";
import { parseInvoiceJson, parseInvoicePdf, parseInvoiceText } from "../src/parse";

const FIXTURE_PDF_URL = "./fixtures/demo-invoice.pdf" as const;
const STUB_OUTAGE_MESSAGE = "stub_llm_outage" as const;
const GARBAGE_OUTPUT = { nonsense: true } as const;
const KNOWN_TEXT = `INVOICE ${DEMO_INVOICE_NO}` as const;
const EMPTY_TEXT = "" as const;
const BLANK_TEXT = "   " as const;
const CORRUPT_PDF_BYTES = [0, 1, 2, 3] as const;
const INVALID_JSON = {} as const;

const cannedLlm: LlmPort = {
  completeInvoiceJson: () => Promise.resolve(DEMO_INVOICE),
};

const failingLlm: LlmPort = {
  completeInvoiceJson: () => Promise.reject(new Error(STUB_OUTAGE_MESSAGE)),
};

const garbageLlm: LlmPort = {
  completeInvoiceJson: () => Promise.resolve(GARBAGE_OUTPUT),
};

test("demo PDF bytes parse to the frozen demo invoice", async () => {
  const seen: string[] = [];
  const recordingLlm: LlmPort = {
    completeInvoiceJson: (text: string) => {
      seen.push(text);
      return Promise.resolve(DEMO_INVOICE);
    },
  };
  const bytes: Uint8Array = await Bun.file(new URL(FIXTURE_PDF_URL, import.meta.url)).bytes();
  const result = await parseInvoicePdf(bytes, recordingLlm);
  expect(result).toEqual({ status: PARSE_OK, invoice: DEMO_INVOICE });
  expect(seen.join("")).toContain(DEMO_INVOICE_NO);
});

test("known invoice text parses to the frozen demo invoice", async () => {
  const result = await parseInvoiceText(KNOWN_TEXT, cannedLlm);
  expect(result).toEqual({ status: PARSE_OK, invoice: DEMO_INVOICE });
});

test("LLM outage yields a manual-fix request, never a hallucinated order", async () => {
  const result = await parseInvoiceText(KNOWN_TEXT, failingLlm);
  expect(result).toEqual({ status: PARSE_NEEDS_FIX, reason: FIX_REASON_LLM_FAILED });
});

test("garbage LLM output yields a manual-fix request", async () => {
  const result = await parseInvoiceText(KNOWN_TEXT, garbageLlm);
  expect(result).toEqual({ status: PARSE_NEEDS_FIX, reason: FIX_REASON_VALIDATION_FAILED });
});

test("manual JSON paste validates through the same interface", () => {
  const result = parseInvoiceJson(DEMO_INVOICE);
  expect(result).toEqual({ status: PARSE_OK, invoice: DEMO_INVOICE });
});

test("empty extracted text never reaches the LLM", async () => {
  const emptyResult = await parseInvoiceText(EMPTY_TEXT, cannedLlm);
  expect(emptyResult).toEqual({ status: PARSE_NEEDS_FIX, reason: FIX_REASON_EXTRACT_FAILED });
  const blankResult = await parseInvoiceText(BLANK_TEXT, cannedLlm);
  expect(blankResult).toEqual({ status: PARSE_NEEDS_FIX, reason: FIX_REASON_EXTRACT_FAILED });
});

test("corrupt PDF bytes yield a manual-fix request", async () => {
  const result = await parseInvoicePdf(new Uint8Array(CORRUPT_PDF_BYTES), cannedLlm);
  expect(result).toEqual({ status: PARSE_NEEDS_FIX, reason: FIX_REASON_EXTRACT_FAILED });
});

test("invalid pasted JSON yields a manual-fix request", () => {
  const result = parseInvoiceJson(INVALID_JSON);
  expect(result).toEqual({ status: PARSE_NEEDS_FIX, reason: FIX_REASON_VALIDATION_FAILED });
});
