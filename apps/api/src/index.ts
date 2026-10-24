import { Hono } from "hono";
import { cors } from "hono/cors";
import { API_PATHS, HELLO_MESSAGE, HELLO_STATUS_OK, HelloResponseSchema } from "shared";
import { env } from "./env";
import { logger } from "./logger";

const CORS_WILDCARD_PATH = "*" as const;
const HELLO_LOG_MESSAGE = "hello_request" as const;

const app = new Hono()
  .use(CORS_WILDCARD_PATH, cors({ origin: env.CORS_ORIGIN }))
  .get(API_PATHS.hello, (c) => {
    const body = { status: HELLO_STATUS_OK, message: HELLO_MESSAGE };
    const parsed = HelloResponseSchema.parse(body);
    logger.info({ route: API_PATHS.hello }, HELLO_LOG_MESSAGE);
    return c.json(parsed);
  });

export type AppType = typeof app;

export default {
  port: env.PORT,
  fetch: app.fetch,
};
