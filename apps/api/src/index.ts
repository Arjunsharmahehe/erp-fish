import type { Database } from "bun:sqlite";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { streamSSE } from "hono/streaming";
import {
  API_PATHS,
  AnswerRequestSchema,
  CONTENT_TYPE_HEADER,
  FIX_REASON_EMPTY_REQUEST,
  HELLO_MESSAGE,
  HELLO_STATUS_OK,
  HelloResponseSchema,
  JobInputSchema,
  MemoryQuerySchema,
  PARSE_NEEDS_FIX,
  ParseRequestSchema,
  ProfileStatusSchema,
  QUESTION_STATUS_QUEUED,
  type JobInput,
} from "shared";
import { currentVault, readSessionUser } from "./auth";
import { createChatRouter } from "./create-chat-router";
import { createAuthRouter } from "./create-auth-router";
import { findJobRow, findQuestionRow, openDb } from "./db";
import { env } from "./env";
import { createInvoiceLlm } from "./create-invoice-llm";
import { isMockErpHost, persistPoRunId, resolveJobAgent, resolveJobSite, storedOrNull } from "./job-agent";
import { canonicalHost } from "./site";
import { logger } from "./logger";
import { answerQuestion, createJob, getJob, listMemory } from "./orchestrator";
import { parseInvoiceJson, parseInvoicePdf, parseInvoiceText } from "./parse";

const CORS_WILDCARD_PATH = "*" as const;
const HELLO_LOG_MESSAGE = "hello_request" as const;
const PARSE_LOG_MESSAGE = "parse_request" as const;
const JOBS_LOG_MESSAGE = "jobs_request" as const;
const QUESTIONS_LOG_MESSAGE = "questions_request" as const;
const PDF_MIME = "application/pdf" as const;
const OCTET_MIME = "application/octet-stream" as const;
const BAD_REQUEST_STATUS = 400 as const;
const NOT_FOUND_STATUS = 404 as const;
const SERVICE_UNAVAILABLE_STATUS = 503 as const;
const CREATED_STATUS = 201 as const;
const INVALID_PARSE_BODY_MESSAGE = "invalid_parse_body" as const;
const MISSING_LLM_CONFIG_MESSAGE = "missing_llm_config_openai" as const;
const JOB_NOT_FOUND_MESSAGE = "job_not_found" as const;
const QUESTION_NOT_FOUND_MESSAGE = "question_not_found" as const;
const QUESTION_NOT_ANSWERABLE_MESSAGE = "question_not_answerable" as const;
const STREAM_TASK_EVENT = "task" as const;
const STREAM_QUESTION_EVENT = "question" as const;
const STREAM_DONE_EVENT = "done" as const;

function requireLlm() {
  try {
    return createInvoiceLlm();
  } catch {
    throw new HTTPException(SERVICE_UNAVAILABLE_STATUS, {
      message: MISSING_LLM_CONFIG_MESSAGE,
    });
  }
}

const jobsDb: Database = openDb(env.DB_PATH);

const app = new Hono()
  .use(CORS_WILDCARD_PATH, cors({ origin: env.CORS_ORIGIN, credentials: true }))
  .get(API_PATHS.hello, (c) => {
    const body = { status: HELLO_STATUS_OK, message: HELLO_MESSAGE };
    const parsed = HelloResponseSchema.parse(body);
    logger.info({ route: API_PATHS.hello }, HELLO_LOG_MESSAGE);
    return c.json(parsed);
  })
  .post(API_PATHS.parse, async (c) => {
    logger.info({ route: API_PATHS.parse }, PARSE_LOG_MESSAGE);
    const contentType: string | undefined = c.req.header(CONTENT_TYPE_HEADER);
    const isPdf: boolean = contentType?.includes(PDF_MIME) ?? false;
    const isOctet: boolean = contentType?.includes(OCTET_MIME) ?? false;
    if (isPdf || isOctet) {
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
  })
  .post(API_PATHS.jobs, zValidator("json", JobInputSchema), async (c) => {
    logger.info({ route: API_PATHS.jobs }, JOBS_LOG_MESSAGE);
    const user = await readSessionUser(c, jobsDb);
    const clientInput = c.req.valid("json");
    const storedHost: string | null = storedOrNull(user.erp_host);
    const storedProfile: string | null = storedOrNull(user.profile_id);
    const erpHost: string = storedHost ?? clientInput.erp_host;
    const profileId: string = storedProfile ?? clientInput.profile_id;
    const input: JobInput = {
      invoice_json: clientInput.invoice_json,
      instruction: clientInput.instruction,
      erp_host: erpHost,
      profile_id: profileId,
    };
    const agent = resolveJobAgent({
      erpHost,
      profileId: storedProfile,
      instruction: input.instruction,
      allowReal: storedHost !== null && (storedProfile !== null || isMockErpHost(erpHost)),
    });
    const view = await createJob(input, { db: jobsDb, agent, site: resolveJobSite(erpHost) });
    persistPoRunId({ db: jobsDb, jobId: view.id, agent });
    return c.json(view, CREATED_STATUS);
  })
  .get(API_PATHS.jobById, (c) => {
    const view = getJob(jobsDb, c.req.param("id"));
    if (view === undefined) {
      throw new HTTPException(NOT_FOUND_STATUS, { message: JOB_NOT_FOUND_MESSAGE });
    }
    return c.json(view);
  })
  .get(API_PATHS.jobStream, (c) => {
    const view = getJob(jobsDb, c.req.param("id"));
    if (view === undefined) {
      throw new HTTPException(NOT_FOUND_STATUS, { message: JOB_NOT_FOUND_MESSAGE });
    }
    return streamSSE(c, async (stream) => {
      for (const task of view.tasks) {
        await stream.writeSSE({
          event: STREAM_TASK_EVENT,
          data: JSON.stringify({ kind: task.kind, status: task.status, output_id: task.output_id }),
        });
      }
      for (const question of view.questions) {
        await stream.writeSSE({
          event: STREAM_QUESTION_EVENT,
          data: JSON.stringify({ q_raw: question.q_raw, status: question.status }),
        });
      }
      await stream.writeSSE({
        event: STREAM_DONE_EVENT,
        data: JSON.stringify({ status: view.status, result_ids: view.result_ids }),
      });
    });
  })
  .post(API_PATHS.questions, zValidator("json", AnswerRequestSchema), async (c) => {
    logger.info({ route: API_PATHS.questions }, QUESTIONS_LOG_MESSAGE);
    const user = await readSessionUser(c, jobsDb);
    const questionId: string = c.req.param("id");
    const question = findQuestionRow(jobsDb, questionId);
    if (question === undefined) {
      throw new HTTPException(NOT_FOUND_STATUS, { message: QUESTION_NOT_FOUND_MESSAGE });
    }
    if (question.status !== QUESTION_STATUS_QUEUED) {
      throw new HTTPException(BAD_REQUEST_STATUS, {
        message: QUESTION_NOT_ANSWERABLE_MESSAGE,
      });
    }
    const job = findJobRow(jobsDb, question.job_id);
    if (job === undefined) {
      throw new HTTPException(NOT_FOUND_STATUS, { message: JOB_NOT_FOUND_MESSAGE });
    }
    const sessionHost: string | null = storedOrNull(user.erp_host);
    const sessionProfile: string | null = storedOrNull(user.profile_id);
    const agent = resolveJobAgent({
      erpHost: job.erp_host,
      profileId: sessionProfile,
      instruction: job.instruction,
      // Job keeps its original ERP affinity: the session host must match
      // the job host, plus a stored profile or the designated mock rig.
      allowReal:
        sessionHost !== null &&
        canonicalHost(sessionHost) === canonicalHost(job.erp_host) &&
        (sessionProfile !== null || isMockErpHost(job.erp_host)),
    });
    const view = await answerQuestion(
      { jobId: question.job_id, questionId, answer: c.req.valid("json").answer },
      { db: jobsDb, agent, site: resolveJobSite(job.erp_host) },
    );
    persistPoRunId({ db: jobsDb, jobId: view.id, agent });
    return c.json(view);
  })
  .get(API_PATHS.memory, zValidator("query", MemoryQuerySchema), (c) => {
    return c.json(listMemory(jobsDb, c.req.valid("query").erp_host));
  })
  .get(API_PATHS.profilesStatus, (c) => {
    return c.json(
      ProfileStatusSchema.parse({
        vault: currentVault(),
        erp_host: env.ERP_BASE_URL ?? null,
      }),
    );
  })
  .route("/", createAuthRouter(jobsDb))
  .route("/", createChatRouter(jobsDb));

export type AppType = typeof app;

export default {
  port: env.PORT,
  fetch: app.fetch,
};
