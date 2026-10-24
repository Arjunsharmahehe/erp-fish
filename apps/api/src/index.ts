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
  VAULT_CONNECTED,
  VAULT_NOT_CONFIGURED,
} from "shared";
import { readSessionUser } from "./auth";
import { requireOwnedJob } from "./job-ownership";
import { userMemoryScope } from "./learning-router";
import { connectionState } from "./connections";
import { createChatRouter } from "./create-chat-router";
import { createAuthRouter } from "./create-auth-router";
import { createLearningRouter } from "./learning-router";
import { createQuestionRouter } from "./create-question-router";
import { createSettingsRouter } from "./create-settings-router";
import { createSpeechRouter } from "./create-speech-router";
import { findJobRow, findQuestionRow, openDb } from "./db";
import { MISSING_DEMO_CONFIG_MESSAGE, createDemoAgent } from "./demoAgent";
import { DEMO_AGENT_ON, env } from "./env";
import { createInvoiceLlm } from "./create-invoice-llm";
import { resolveModelConfig } from "./model-settings";
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
const PROFILE_REQUIRED = "Connect your ERP login in Settings before starting a job.";

function requireLlm(userId: string) {
  try {
    return createInvoiceLlm(resolveModelConfig(jobsDb, userId));
  } catch {
    throw new HTTPException(SERVICE_UNAVAILABLE_STATUS, {
      message: MISSING_LLM_CONFIG_MESSAGE,
    });
  }
}

function requireDemoAgent(instruction: string) {
  if (env.DEMO_AGENT !== DEMO_AGENT_ON) {
    throw new HTTPException(SERVICE_UNAVAILABLE_STATUS, {
      message: MISSING_DEMO_CONFIG_MESSAGE,
    });
  }
  return createDemoAgent(instruction);
}

const jobsDb: Database = openDb(env.DB_PATH);
const RECOVER_INTERRUPTED_RESUMES = "UPDATE learning_questions SET resume_status='failed' WHERE resume_status='running'";
jobsDb.run(RECOVER_INTERRUPTED_RESUMES);

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
  .post(API_PATHS.jobs, zValidator("json", JobInputSchema), async (c) => {
    logger.info({ route: API_PATHS.jobs }, JOBS_LOG_MESSAGE);
    const user = await readSessionUser(c, jobsDb);
    const scope = userMemoryScope(user);
    if (!user.profile_id) throw new HTTPException(SERVICE_UNAVAILABLE_STATUS, { message: PROFILE_REQUIRED });
    const input = { ...c.req.valid("json"), erp_host: scope.erpHost, profile_id: user.profile_id };
    const view = await createJob(input, {
      db: jobsDb,
      userId: user.id,
      agent: requireDemoAgent(input.instruction),
    });
    return c.json(view, CREATED_STATUS);
  })
  .get(API_PATHS.jobById, async (c) => {
    requireOwnedJob(jobsDb, { jobId: c.req.param("id"), userId: (await readSessionUser(c, jobsDb)).id });
    const view = getJob(jobsDb, c.req.param("id"));
    if (view === undefined) {
      throw new HTTPException(NOT_FOUND_STATUS, { message: JOB_NOT_FOUND_MESSAGE });
    }
    return c.json(view);
  })
  .get(API_PATHS.jobStream, async (c) => {
    requireOwnedJob(jobsDb, { jobId: c.req.param("id"), userId: (await readSessionUser(c, jobsDb)).id });
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
    const user = await readSessionUser(c, jobsDb);
    logger.info({ route: API_PATHS.questions }, QUESTIONS_LOG_MESSAGE);
    const questionId: string = c.req.param("id");
    const question = findQuestionRow(jobsDb, questionId);
    if (question === undefined) {
      throw new HTTPException(NOT_FOUND_STATUS, { message: QUESTION_NOT_FOUND_MESSAGE });
    }
    requireOwnedJob(jobsDb, { jobId: question.job_id, userId: user.id });
    if (question.status !== QUESTION_STATUS_QUEUED) {
      throw new HTTPException(BAD_REQUEST_STATUS, {
        message: QUESTION_NOT_ANSWERABLE_MESSAGE,
      });
    }
    const job = findJobRow(jobsDb, question.job_id);
    if (job === undefined) {
      throw new HTTPException(NOT_FOUND_STATUS, { message: JOB_NOT_FOUND_MESSAGE });
    }
    const view = await answerQuestion(
      { jobId: question.job_id, questionId, answer: c.req.valid("json").answer },
      { db: jobsDb, userId: user.id, agent: requireDemoAgent(job.instruction) },
    );
    return c.json(view);
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
