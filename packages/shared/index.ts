import * as z from "zod";

export const HELLO_STATUS_OK = "ok" as const;
export const HELLO_MESSAGE = "Hello from erp-fish API" as const;
export const MIN_MESSAGE_LENGTH = 1 as const;

export const API_PATHS = {
  hello: "/api/hello",
} as const;

export const HelloResponseSchema = z.object({
  status: z.literal(HELLO_STATUS_OK),
  message: z.string().min(MIN_MESSAGE_LENGTH),
});
