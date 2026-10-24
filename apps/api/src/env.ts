import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";
import { MIN_TEXT_LENGTH } from "shared";

const DEFAULT_API_PORT = 3001 as const;
const MIN_PORT = 1 as const;
const MAX_PORT = 65535 as const;
const DEFAULT_CORS_ORIGIN = "http://localhost:3000" as const;

export const env = createEnv({
  server: {
    PORT: z.coerce.number().min(MIN_PORT).max(MAX_PORT).default(DEFAULT_API_PORT),
    CORS_ORIGIN: z.string().min(MIN_TEXT_LENGTH).default(DEFAULT_CORS_ORIGIN),
    OPENAI_BASE_URL: z.string().min(MIN_TEXT_LENGTH).optional(),
    OPENAI_API_KEY: z.string().min(MIN_TEXT_LENGTH).optional(),
    OPENAI_MODEL: z.string().min(MIN_TEXT_LENGTH).optional(),
  },
  runtimeEnv: process.env,
});
