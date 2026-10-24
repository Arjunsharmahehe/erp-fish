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

export const DEMO_SUPPLIER = "DEMO-SUP-001" as const;
export const DEMO_INVOICE_NO = "INV-DEMO-0001" as const;
export const DEMO_ITEM_1 = "DEMO-ITEM-01" as const;
export const DEMO_ITEM_2 = "DEMO-ITEM-02" as const;
export const DEMO_QTY_1 = 10 as const;
export const DEMO_RATE_1 = 150 as const;
export const DEMO_QTY_2 = 5 as const;
export const DEMO_RATE_2 = 200 as const;

export const DEMO_INVOICE: z.infer<typeof InvoiceJSONSchema> = {
  supplier: DEMO_SUPPLIER,
  invoice_no: DEMO_INVOICE_NO,
  items: [
    { name: DEMO_ITEM_1, qty: DEMO_QTY_1, rate: DEMO_RATE_1 },
    { name: DEMO_ITEM_2, qty: DEMO_QTY_2, rate: DEMO_RATE_2 },
  ],
};

export const JOB_STATUS_RUNNING = "running" as const;
export const JOB_STATUS_WAITING = "waiting" as const;
export const JOB_STATUS_DONE = "done" as const;
export const JOB_STATUS_FAILED = "failed" as const;

export const JobStatusSchema = z.enum([
  JOB_STATUS_RUNNING,
  JOB_STATUS_WAITING,
  JOB_STATUS_DONE,
  JOB_STATUS_FAILED,
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;

export const TASK_KIND_PO = "PO" as const;
export const TASK_KIND_SO = "SO" as const;
export const TASK_KIND_STOCK = "STOCK" as const;

export const TaskKindSchema = z.enum([TASK_KIND_PO, TASK_KIND_SO, TASK_KIND_STOCK]);

export type TaskKind = z.infer<typeof TaskKindSchema>;

export const TASK_STATUS_RUNNING = "running" as const;
export const TASK_STATUS_DONE = "done" as const;
export const TASK_STATUS_FAILED = "failed" as const;
export const TASK_STATUS_PAUSED = "paused" as const;

export const TaskStatusSchema = z.enum([
  TASK_STATUS_RUNNING,
  TASK_STATUS_DONE,
  TASK_STATUS_FAILED,
  TASK_STATUS_PAUSED,
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const QUESTION_STATUS_QUEUED = "queued" as const;
export const QUESTION_STATUS_ANSWERED = "answered" as const;

export const QuestionStatusSchema = z.enum([QUESTION_STATUS_QUEUED, QUESTION_STATUS_ANSWERED]);

export type QuestionStatus = z.infer<typeof QuestionStatusSchema>;

export const JobInputSchema = z.object({
  invoice_json: InvoiceJSONSchema,
  instruction: z.string().min(MIN_TEXT_LENGTH),
  erp_host: z.string().min(MIN_TEXT_LENGTH),
  profile_id: z.string().min(MIN_TEXT_LENGTH),
});

export type JobInput = z.infer<typeof JobInputSchema>;

export const AgentResultIdsSchema = z.object({
  purchase_order_id: z.string().min(MIN_TEXT_LENGTH).optional(),
  sales_order_id: z.string().min(MIN_TEXT_LENGTH).optional(),
  stock_entry_id: z.string().min(MIN_TEXT_LENGTH).optional(),
});

export type AgentResultIds = z.infer<typeof AgentResultIdsSchema>;

export const TaskViewSchema = z.object({
  id: z.string().min(MIN_TEXT_LENGTH),
  kind: TaskKindSchema,
  status: TaskStatusSchema,
  output_id: z.string().min(MIN_TEXT_LENGTH).nullable(),
});

export type TaskView = z.infer<typeof TaskViewSchema>;

export const QuestionViewSchema = z.object({
  id: z.string().min(MIN_TEXT_LENGTH),
  q_raw: z.string().min(MIN_TEXT_LENGTH),
  q_norm: z.string().min(MIN_TEXT_LENGTH),
  status: QuestionStatusSchema,
});

export type QuestionView = z.infer<typeof QuestionViewSchema>;

export const JobViewSchema = z.object({
  id: z.string().min(MIN_TEXT_LENGTH),
  status: JobStatusSchema,
  result_ids: AgentResultIdsSchema,
  tasks: z.array(TaskViewSchema),
  questions: z.array(QuestionViewSchema),
});

export type JobView = z.infer<typeof JobViewSchema>;

export const MemoryEntrySchema = z.object({
  erp_host: z.string().min(MIN_TEXT_LENGTH),
  q_norm: z.string().min(MIN_TEXT_LENGTH),
  answer: z.string().min(MIN_TEXT_LENGTH),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

export const DEMO_ERP_HOST = "https://erp.demo.local" as const;
export const DEMO_ERP_HOST_2 = "https://erp2.demo.local" as const;
export const DEMO_INVOICE_NO_2 = "INV-DEMO-0002" as const;
export const DEMO_INVOICE_NO_3 = "INV-DEMO-0003" as const;
export const DEMO_ANSWER = "Main Warehouse" as const;
export const DEMO_PROFILE_ID = "profile-demo-001" as const;
export const DEMO_INSTRUCTION = "Create PO only" as const;
export const DEMO_PO_ID = "PO-DEMO-0001" as const;
export const DEMO_SO_ID = "SO-DEMO-0001" as const;
export const DEMO_STOCK_ID = "ST-DEMO-0001" as const;
export const DEMO_QUESTION_RAW = "Which warehouse should receive this stock?" as const;
export const DEMO_QUESTION_NORM = "which warehouse should receive this stock?" as const;
