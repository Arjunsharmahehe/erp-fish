import * as z from "zod";

export const HELLO_STATUS_OK = "ok" as const;
export const HELLO_MESSAGE = "Hello from erp-fish API" as const;
export const MIN_TEXT_LENGTH = 1 as const;

export const API_PATHS = {
  hello: "/api/hello",
  parse: "/api/parse",
} as const;

export const HelloResponseSchema = z.object({
  status: z.literal(HELLO_STATUS_OK),
  message: z.string().min(MIN_TEXT_LENGTH),
});

export const MIN_ITEMS_COUNT = 1 as const;

export const InvoiceItemSchema = z.object({
  name: z.string().min(MIN_TEXT_LENGTH),
  qty: z.number().positive(),
  rate: z.number().positive(),
});

export const InvoiceJSONSchema = z.object({
  supplier: z.string().min(MIN_TEXT_LENGTH),
  invoice_no: z.string().min(MIN_TEXT_LENGTH),
  items: z.array(InvoiceItemSchema).min(MIN_ITEMS_COUNT),
  warehouse_hint: z.string().min(MIN_TEXT_LENGTH).optional(),
});

export type InvoiceJSON = z.infer<typeof InvoiceJSONSchema>;

export const PARSE_OK = "ok" as const;
export const PARSE_NEEDS_FIX = "needs_fix" as const;

export const FIX_REASON_LLM_FAILED = "llm_failed" as const;
export const FIX_REASON_VALIDATION_FAILED = "validation_failed" as const;
export const FIX_REASON_EXTRACT_FAILED = "extract_failed" as const;
export const FIX_REASON_EMPTY_REQUEST = "empty_request" as const;

export const ParseFixReasonSchema = z.enum([
  FIX_REASON_LLM_FAILED,
  FIX_REASON_VALIDATION_FAILED,
  FIX_REASON_EXTRACT_FAILED,
  FIX_REASON_EMPTY_REQUEST,
]);

export const ParseOkSchema = z.object({
  status: z.literal(PARSE_OK),
  invoice: InvoiceJSONSchema,
});

export const ParseNeedsFixSchema = z.object({
  status: z.literal(PARSE_NEEDS_FIX),
  reason: ParseFixReasonSchema,
});

export const ParseResultSchema = z.discriminatedUnion("status", [
  ParseOkSchema,
  ParseNeedsFixSchema,
]);

export type ParseResult = z.infer<typeof ParseResultSchema>;

export const ParseRequestSchema = z.object({
  text: z.string().min(MIN_TEXT_LENGTH).optional(),
  invoiceJson: z.unknown().optional(),
});

export type ParseRequest = z.infer<typeof ParseRequestSchema>;

export const DEMO_SUPPLIER = "DEMO-SUP-001" as const;
export const DEMO_INVOICE_NO = "INV-DEMO-0001" as const;
export const DEMO_ITEM_1 = "DEMO-ITEM-01" as const;
export const DEMO_ITEM_2 = "DEMO-ITEM-02" as const;
export const DEMO_QTY_1 = 10 as const;
export const DEMO_RATE_1 = 150 as const;
export const DEMO_QTY_2 = 5 as const;
export const DEMO_RATE_2 = 200 as const;

export const DEMO_INVOICE: InvoiceJSON = {
  supplier: DEMO_SUPPLIER,
  invoice_no: DEMO_INVOICE_NO,
  items: [
    { name: DEMO_ITEM_1, qty: DEMO_QTY_1, rate: DEMO_RATE_1 },
    { name: DEMO_ITEM_2, qty: DEMO_QTY_2, rate: DEMO_RATE_2 },
  ],
};
