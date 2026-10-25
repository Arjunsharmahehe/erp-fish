import type { Database } from "bun:sqlite";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { createJobRouter } from "./create-job-router";
import { createBrowserRouter } from "./create-browser-router";
import { recoverLocalBrowsers } from "./local-browser-runtime";
import { createAgentDocumentRouter } from "./create-agent-document-router";
import {
  API_PATHS,
  CONTENT_TYPE_HEADER,
  FIX_REASON_EMPTY_REQUEST,
  HELLO_MESSAGE,
  HELLO_STATUS_OK,
  HelloResponseSchema,
  MemoryQuerySchema,
  PARSE_NEEDS_FIX,
  ParseRequestSchema,
  ProfileStatusSchema,
  VAULT_CONNECTED,
  VAULT_NOT_CONFIGURED,
} from "shared";
import { readSessionUser } from "./auth";

import { userMemoryScope } from "./learning-router";
import { connectionState } from "./connections";
import { createChatRouter } from "./create-chat-router";
import { createAuthRouter } from "./create-auth-router";
import { createLearningRouter } from "./learning-router";
import { createQuestionRouter } from "./create-question-router";
import { createSettingsRouter } from "./create-settings-router";
import { createSpeechRouter } from "./create-speech-router";
import { openDb } from "./db";

import { env } from "./env";
import { createInvoiceLlm } from "./create-invoice-llm";
import { resolveModelConfig } from "./model-settings";
import { logger } from "./logger";
import { listMemory } from "./orchestrator";
import { parseInvoiceJson, parseInvoicePdf, parseInvoiceText } from "./parse";

const CORS_WILDCARD_PATH = "*" as const;
const HELLO_LOG_MESSAGE = "hello_request" as const;
const PARSE_LOG_MESSAGE = "parse_request" as const;
const PDF_MIME = "application/pdf" as const;
const OCTET_MIME = "application/octet-stream" as const;
const BAD_REQUEST_STATUS = 400 as const;
const SERVICE_UNAVAILABLE_STATUS = 503 as const;
const INVALID_PARSE_BODY_MESSAGE = "invalid_parse_body" as const;
const MISSING_LLM_CONFIG_MESSAGE = "missing_llm_config_openai" as const;

function requireLlm(userId: string) {
  try {
    return createInvoiceLlm(resolveModelConfig(jobsDb, userId));
  } catch {
    throw new HTTPException(SERVICE_UNAVAILABLE_STATUS, {
      message: MISSING_LLM_CONFIG_MESSAGE,
    });
  }
}

const jobsDb: Database = openDb(env.DB_PATH);
const RECOVER_INTERRUPTED_RESUMES = "UPDATE learning_questions SET resume_status='failed' WHERE resume_status='running'";
jobsDb.run(RECOVER_INTERRUPTED_RESUMES);
recoverLocalBrowsers(jobsDb);

const app = new Hono()
  .use(CORS_WILDCARD_PATH, cors({ origin: env.CORS_ORIGIN, credentials: true }))
  .get(API_PATHS.hello, (c) => {
    const body = { status: HELLO_STATUS_OK, message: HELLO_MESSAGE };
    const parsed = HelloResponseSchema.parse(body);
    logger.info({ route: API_PATHS.hello }, HELLO_LOG_MESSAGE);
    return c.json(parsed);
  })
  .post(API_PATHS.parse, async (c) => {
    const user = await readSessionUser(c, jobsDb);
    logger.info({ route: API_PATHS.parse }, PARSE_LOG_MESSAGE);
    const contentType: string | undefined = c.req.header(CONTENT_TYPE_HEADER);
    const isPdf: boolean = contentType?.includes(PDF_MIME) ?? false;
    const isOctet: boolean = contentType?.includes(OCTET_MIME) ?? false;
    if (isPdf || isOctet) {
      const buffer: ArrayBuffer = await c.req.arrayBuffer();
      return c.json(await parseInvoicePdf(new Uint8Array(buffer), requireLlm(user.id)));
    }
    const body: unknown = await c.req.json().catch(() => {
      throw new HTTPException(BAD_REQUEST_STATUS, { message: INVALID_PARSE_BODY_MESSAGE });
    });
    const request = ParseRequestSchema.safeParse(body);
    if (!request.success) {
      throw new HTTPException(BAD_REQUEST_STATUS, { message: INVALID_PARSE_BODY_MESSAGE });
    }
    if (request.data.invoiceJson !== undefined) {
      return c.json(parseInvoiceJson(request.data.invoiceJson));
    }
    if (request.data.text !== undefined) {
    return c.json(await parseInvoiceText(request.data.text, requireLlm(user.id)));
    }
    return c.json({ status: PARSE_NEEDS_FIX, reason: FIX_REASON_EMPTY_REQUEST });
  })
  .get(API_PATHS.memory, zValidator("query", MemoryQuerySchema), async (c) => {
    const scope = userMemoryScope(await readSessionUser(c, jobsDb));
    return c.json(listMemory(jobsDb, scope));
  })
  .get(API_PATHS.profilesStatus, async (c) => {
    const user = await readSessionUser(c, jobsDb);
    const connection = connectionState(jobsDb, user);
    return c.json(
      ProfileStatusSchema.parse({
        vault: connection.vault_available ? VAULT_CONNECTED : VAULT_NOT_CONFIGURED,
        erp_host: user.erp_host,
      }),
    );
  })
  .route("/", createJobRouter(jobsDb))
  .route("/", createBrowserRouter(jobsDb))
  .route("/", createAgentDocumentRouter(jobsDb))
  .route("/", createAuthRouter(jobsDb))
  .route("/", createLearningRouter(jobsDb))
  .route("/", createQuestionRouter(jobsDb))
  .route("/", createSettingsRouter(jobsDb))
  .route("/", createSpeechRouter(jobsDb))
  .route("/", createChatRouter(jobsDb));

export type AppType = typeof app;

export default {
  port: env.PORT,
  fetch: app.fetch,
};
