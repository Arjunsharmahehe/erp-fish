import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import {
  API_PATHS,
  FIX_REASON_EMPTY_REQUEST,
  HELLO_MESSAGE,
  HELLO_STATUS_OK,
  HelloResponseSchema,
  PARSE_NEEDS_FIX,
  ParseRequestSchema,
} from "shared";
import { env } from "./env";
import { createInvoiceLlm } from "./llm";
import { logger } from "./logger";
import { parseInvoiceJson, parseInvoicePdf, parseInvoiceText } from "./parse";

const CORS_WILDCARD_PATH = "*" as const;
const HELLO_LOG_MESSAGE = "hello_request" as const;
const PARSE_LOG_MESSAGE = "parse_request" as const;
const CONTENT_TYPE_HEADER = "content-type" as const;
const PDF_MIME = "application/pdf" as const;
const OCTET_MIME = "application/octet-stream" as const;
const BAD_REQUEST_STATUS = 400 as const;
const SERVICE_UNAVAILABLE_STATUS = 503 as const;
const INVALID_PARSE_BODY_MESSAGE = "invalid_parse_body" as const;
const MISSING_LLM_CONFIG_MESSAGE = "missing_llm_config_openai" as const;

function requireLlm() {
  try {
    return createInvoiceLlm();
  } catch {
    throw new HTTPException(SERVICE_UNAVAILABLE_STATUS, {
      message: MISSING_LLM_CONFIG_MESSAGE,
    });
  }
}

const app = new Hono()
  .use(CORS_WILDCARD_PATH, cors({ origin: env.CORS_ORIGIN }))
  .get(API_PATHS.hello, (c) => {
    const body = { status: HELLO_STATUS_OK, message: HELLO_MESSAGE };
    const parsed = HelloResponseSchema.parse(body);
    logger.info({ route: API_PATHS.hello }, HELLO_LOG_MESSAGE);
    return c.json(parsed);
  })
  .post(API_PATHS.parse, async (c) => {
    logger.info({ route: API_PATHS.parse }, PARSE_LOG_MESSAGE);
    const contentType: string | undefined = c.req.header(CONTENT_TYPE_HEADER);
    if (contentType?.includes(PDF_MIME) === true || contentType?.includes(OCTET_MIME) === true) {
      const buffer: ArrayBuffer = await c.req.arrayBuffer();
      return c.json(await parseInvoicePdf(new Uint8Array(buffer), requireLlm()));
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
      return c.json(await parseInvoiceText(request.data.text, requireLlm()));
    }
    return c.json({ status: PARSE_NEEDS_FIX, reason: FIX_REASON_EMPTY_REQUEST });
  });

export type AppType = typeof app;

export default {
  port: env.PORT,
  fetch: app.fetch,
};
