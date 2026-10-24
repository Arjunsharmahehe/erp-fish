import { extractText, getDocumentProxy } from "unpdf";
import * as z from "zod";
import {
  FIX_REASON_EXTRACT_FAILED,
  FIX_REASON_LLM_FAILED,
  FIX_REASON_VALIDATION_FAILED,
  InvoiceJSONSchema,
  PARSE_NEEDS_FIX,
  PARSE_OK,
  ParseFixReasonSchema,
  type ParseResult,
} from "shared";
import { logger } from "./logger";

export interface LlmPort {
  completeInvoiceJson: (text: string) => Promise<unknown>;
}

type ParseFixReason = z.infer<typeof ParseFixReasonSchema>;

const MERGE_PAGES = true as const;
const PARSE_LOG_MESSAGE = "parse_needs_fix" as const;
const EMPTY_TEXT = "" as const;

function needsFix(reason: ParseFixReason): ParseResult {
  logger.warn({ reason }, PARSE_LOG_MESSAGE);
  return { status: PARSE_NEEDS_FIX, reason };
}

function isBlank(text: string): boolean {
  return text.trim() === EMPTY_TEXT;
}

// parseInvoiceJson is the boundary decoder: unknown input (LLM output,
// request body, fixture) is validated here, so the unknown parameter is
// intentional and callers must not pre-parse.
export function parseInvoiceJson(
  // eslint-disable-next-line llm-core/no-unknown-parameters
  json: unknown,
): ParseResult {
  const parsed = InvoiceJSONSchema.safeParse(json);
  if (!parsed.success) {
    return needsFix(FIX_REASON_VALIDATION_FAILED);
  }
  return { status: PARSE_OK, invoice: parsed.data };
}

export async function parseInvoiceText(text: string, llm: LlmPort): Promise<ParseResult> {
  if (isBlank(text)) {
    return needsFix(FIX_REASON_EXTRACT_FAILED);
  }
  let raw: unknown;
  try {
    raw = await llm.completeInvoiceJson(text);
  } catch {
    return needsFix(FIX_REASON_LLM_FAILED);
  }
  return parseInvoiceJson(raw);
}

export async function parseInvoicePdf(bytes: Uint8Array, llm: LlmPort): Promise<ParseResult> {
  let text: string;
  try {
    const pdf = await getDocumentProxy(bytes);
    const extracted = await extractText(pdf, { mergePages: MERGE_PAGES });
    text = extracted.text;
  } catch {
    return needsFix(FIX_REASON_EXTRACT_FAILED);
  }
  return parseInvoiceText(text, llm);
}
