import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";
import { MIN_TEXT_LENGTH } from "shared";

const DEFAULT_API_PORT = 3001 as const;
const MIN_PORT = 1 as const;
const MAX_PORT = 65535 as const;
const DEFAULT_CORS_ORIGIN = "http://localhost:3000" as const;
const DEFAULT_DB_FILE = "erp-fish.db" as const;
const DEMO_AGENT_ON = "true" as const;
const DEMO_AGENT_OFF = "false" as const;

export { DEMO_AGENT_ON };

export const env = createEnv({
  server: {
    PORT: z.coerce.number().min(MIN_PORT).max(MAX_PORT).default(DEFAULT_API_PORT),
    CORS_ORIGIN: z.string().min(MIN_TEXT_LENGTH).default(DEFAULT_CORS_ORIGIN),
    DB_PATH: z.string().min(MIN_TEXT_LENGTH).default(DEFAULT_DB_FILE),
    DEMO_AGENT: z.enum([DEMO_AGENT_ON, DEMO_AGENT_OFF]).default(DEMO_AGENT_OFF),
    ERP_BASE_URL: z.string().min(MIN_TEXT_LENGTH).optional(),
    TUNNEL_PROFILE_ID: z.string().min(MIN_TEXT_LENGTH).optional(),
    TINYFISH_API_KEY: z.string().min(MIN_TEXT_LENGTH).optional(),
    OPENAI_BASE_URL: z.string().min(MIN_TEXT_LENGTH).optional(),
    OPENAI_API_KEY: z.string().min(MIN_TEXT_LENGTH).optional(),
    OPENAI_MODEL: z.string().min(MIN_TEXT_LENGTH).optional(),
  },
  runtimeEnv: process.env,
});
