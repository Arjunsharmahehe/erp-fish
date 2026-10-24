import * as z from "zod";

export const MIN_TEXT_LENGTH = 1 as const;
export const SPACE = " " as const;
export const LABEL_SEPARATOR = ": " as const;
export const CONTENT_TYPE_HEADER = "Content-Type" as const;

export const HELLO_STATUS_OK = "ok" as const;
export const HELLO_MESSAGE = "Hello from erp-fish API" as const;

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

export const VAULT_CONNECTED = "connected" as const;
export const VAULT_NOT_CONFIGURED = "not_configured" as const;
