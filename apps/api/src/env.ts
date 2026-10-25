import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";
import { MIN_TEXT_LENGTH, ERP_CREDENTIALS, RemoteVaultBindingsSchema, DeploymentModeSchema, BROWSER } from "shared";

const DEFAULT_API_PORT = 3001 as const;
const MIN_PORT = 1 as const;
const MAX_PORT = 65535 as const;
const DEFAULT_CORS_ORIGIN = "http://localhost:3000" as const;
const DEFAULT_DB_FILE = "erp-fish.db" as const;
const DEMO_AGENT_ON = "true" as const;
const DEMO_AGENT_OFF = "false" as const;
const DEFAULT_JWT_TTL_SECONDS = 604800 as const;
const MIN_JWT_TTL_SECONDS = 60 as const;
const MAX_JWT_TTL_SECONDS = 2592000 as const;
const ENV_DEVELOPMENT = "development" as const;
const ENV_TEST = "test" as const;
const ENV_PRODUCTION = "production" as const;
const KEY_ENCODING = "base64";
const EMPTY_BINDINGS = "[]";
const JSON_BINDINGS_ERROR = "TINYFISH_VAULT_BINDINGS must be a valid JSON array of account assignments.";

export { DEMO_AGENT_ON, ENV_PRODUCTION };

export const env = createEnv({
  server: {
    PORT: z.coerce.number().min(MIN_PORT).max(MAX_PORT).default(DEFAULT_API_PORT),
    CORS_ORIGIN: z.string().min(MIN_TEXT_LENGTH).default(DEFAULT_CORS_ORIGIN),
    DB_PATH: z.string().min(MIN_TEXT_LENGTH).default(DEFAULT_DB_FILE),
    DEMO_AGENT: z.enum([DEMO_AGENT_ON, DEMO_AGENT_OFF]).default(DEMO_AGENT_OFF),
    JWT_SECRET: z.string().min(MIN_TEXT_LENGTH),
    ERP_CREDENTIALS_KEY: z.string().refine((value) => Buffer.from(value, KEY_ENCODING).length === ERP_CREDENTIALS.keyBytes, ERP_CREDENTIALS.keyError).optional(),
    TINYFISH_VAULT_BINDINGS: z.string().default(EMPTY_BINDINGS).transform((value, context) => {
      try { const parsed: unknown = JSON.parse(value); return parsed; }
      catch { context.addIssue({ code: "custom", message: JSON_BINDINGS_ERROR }); return z.NEVER; }
    }).pipe(RemoteVaultBindingsSchema),
    JWT_TTL_SECONDS: z.coerce
      .number()
      .min(MIN_JWT_TTL_SECONDS)
      .max(MAX_JWT_TTL_SECONDS)
      .default(DEFAULT_JWT_TTL_SECONDS),
    NODE_ENV: z.enum([ENV_DEVELOPMENT, ENV_TEST, ENV_PRODUCTION]).default(ENV_DEVELOPMENT),
    ERP_FISH_MODE: DeploymentModeSchema.default(BROWSER.production),
    LOCAL_BROWSER_DATA_DIR: z.string().min(MIN_TEXT_LENGTH).default(".browser-data"),
    LOCAL_BROWSER_HEADLESS: z.enum([DEMO_AGENT_ON, DEMO_AGENT_OFF]).default(DEMO_AGENT_OFF).transform((value) => value === DEMO_AGENT_ON),
    LOCAL_BROWSER_EXECUTABLE: z.string().min(MIN_TEXT_LENGTH).optional(),
    ERP_BASE_URL: z.string().min(MIN_TEXT_LENGTH).optional(),
    TUNNEL_PROFILE_ID: z.string().min(MIN_TEXT_LENGTH).optional(),
    TINYFISH_API_KEY: z.string().min(MIN_TEXT_LENGTH).optional(),
    MOCK_ERP_URL: z.url().optional(),
    OPENAI_BASE_URL: z.string().min(MIN_TEXT_LENGTH).optional(),
    OPENAI_API_KEY: z.string().min(MIN_TEXT_LENGTH).optional(),
    OPENAI_MODEL: z.string().min(MIN_TEXT_LENGTH).optional(),
    GROQ_API_KEY: z.string().min(MIN_TEXT_LENGTH).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

if (env.ERP_FISH_MODE === BROWSER.local && !env.ERP_CREDENTIALS_KEY) throw new Error(ERP_CREDENTIALS.unavailable);
