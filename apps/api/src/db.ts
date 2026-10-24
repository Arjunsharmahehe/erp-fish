import { Database } from "bun:sqlite";
import {
  AgentResultIdsSchema,
  InvoiceJSONSchema,
  JobInputSchema,
  MemoryEntrySchema,
  QUESTION_STATUS_ANSWERED,
  TASK_STATUS_DONE,
  type AgentResultIds,
  type JobInput,
  type JobStatus,
  type MemoryEntry,
  type QuestionStatus,
  type TaskKind,
  type TaskStatus,
} from "shared";
import {
  CompletedOutputRowSchema,
  JobRowSchema,
  MemoryAnswerRowSchema,
  QuestionRowSchema,
  TaskRowSchema,
  type JobRow,
  type ParsedInvoice,
  type QuestionRow,
  type TaskRow,
} from "./rows";
import { SCHEMA_CHAT_MESSAGES, SCHEMA_CHAT_THREADS, SCHEMA_THREAD_STATE, SCHEMA_CHAT_DETAILS, SCHEMA_CHAT_ORIGINALS } from "./threads";
import { SCHEMA_USERS } from "./users";
import { LEARNING_SQL } from "./learning";
import { JOB_OWNERS_SQL } from "./job-ownership";
import { connectionSql as CONNECTION_SQL } from "./connection-sql";
import { THREAD_SCOPE_SQL } from "./thread-scope";
import { modelSettingsSql as MODEL_SETTINGS_SQL } from "./model-settings-sql";

export const IN_MEMORY_DB_PATH = ":memory:" as const;

export type { JobRow, QuestionRow, TaskRow } from "./rows";

const SCHEMA_JOBS = `CREATE TABLE IF NOT EXISTS jobs(
id TEXT PRIMARY KEY,
erp_host TEXT NOT NULL,
profile_id TEXT NOT NULL,
invoice_json TEXT NOT NULL,
instruction TEXT NOT NULL,
status TEXT NOT NULL,
result_ids TEXT,
created_at TEXT NOT NULL
)` as const;

const SCHEMA_TASKS = `CREATE TABLE IF NOT EXISTS tasks(
id TEXT PRIMARY KEY,
job_id TEXT NOT NULL,
kind TEXT NOT NULL,
status TEXT NOT NULL,
agent_run_id TEXT,
output_id TEXT
)` as const;

const SCHEMA_QUESTIONS = `CREATE TABLE IF NOT EXISTS questions(
id TEXT PRIMARY KEY,
job_id TEXT NOT NULL,
q_norm TEXT NOT NULL,
q_raw TEXT NOT NULL,
answer TEXT,
status TEXT NOT NULL
)` as const;

const SCHEMA_MEMORY = `CREATE TABLE IF NOT EXISTS memory(
erp_host TEXT NOT NULL,
q_norm TEXT NOT NULL,
answer TEXT NOT NULL,
updated_at TEXT NOT NULL,
PRIMARY KEY(erp_host, q_norm)
)` as const;

const QUERY_INSERT_JOB =
  "INSERT INTO jobs(id, erp_host, profile_id, invoice_json, instruction, status, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)" as const;
const QUERY_UPDATE_JOB_STATUS = "UPDATE jobs SET status = ? WHERE id = ?" as const;
const QUERY_UPDATE_JOB_RESULT_IDS = "UPDATE jobs SET result_ids = ? WHERE id = ?" as const;
const QUERY_FIND_JOB = "SELECT * FROM jobs WHERE id = ?" as const;
const QUERY_FIND_COMPLETED_OUTPUT =
  "SELECT tasks.output_id AS output_id, jobs.invoice_json AS invoice_json FROM tasks JOIN jobs ON jobs.id = tasks.job_id LEFT JOIN job_owners ON job_owners.job_id=jobs.id WHERE tasks.kind = ? AND tasks.status = ? AND jobs.erp_host = ? AND job_owners.user_id IS ?" as const;
const QUERY_INSERT_TASK =
  "INSERT INTO tasks(id, job_id, kind, status, output_id) VALUES(?, ?, ?, ?, ?)" as const;
const QUERY_UPDATE_TASK = "UPDATE tasks SET status = ?, output_id = ? WHERE id = ?" as const;
const QUERY_FIND_TASKS = "SELECT * FROM tasks WHERE job_id = ?" as const;
const QUERY_INSERT_QUESTION =
  "INSERT INTO questions(id, job_id, q_norm, q_raw, status) VALUES(?, ?, ?, ?, ?)" as const;
const QUERY_FIND_QUESTIONS = "SELECT * FROM questions WHERE job_id = ?" as const;
const QUERY_FIND_QUESTION = "SELECT * FROM questions WHERE id = ?" as const;
const QUERY_ANSWER_QUESTION = "UPDATE questions SET answer = ?, status = ? WHERE id = ?" as const;
const QUERY_UPSERT_MEMORY =
  "INSERT INTO memory(erp_host, q_norm, answer, updated_at) VALUES(?, ?, ?, ?) ON CONFLICT(erp_host, q_norm) DO UPDATE SET answer = excluded.answer, updated_at = excluded.updated_at" as const;
const QUERY_FIND_MEMORY_ANSWER =
  "SELECT answer FROM memory WHERE erp_host = ? AND q_norm = ?" as const;
const QUERY_LIST_MEMORY = "SELECT erp_host, q_norm, answer FROM memory WHERE erp_host = ?" as const;

function safeParseJson(text: string): ParsedInvoice | undefined {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return undefined;
  }
  const parsed = InvoiceJSONSchema.safeParse(json);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}

export function openDb(path: string = IN_MEMORY_DB_PATH): Database {
  const db = new Database(path, { create: true });
  db.run(SCHEMA_JOBS);
  db.run(SCHEMA_TASKS);
  db.run(SCHEMA_QUESTIONS);
  db.run(SCHEMA_MEMORY);
  db.run(SCHEMA_USERS);
  db.run(SCHEMA_CHAT_THREADS);
  db.run(SCHEMA_CHAT_MESSAGES);
  db.run(SCHEMA_THREAD_STATE);
  db.run(SCHEMA_CHAT_DETAILS);
  db.run(SCHEMA_CHAT_ORIGINALS);
  db.run(LEARNING_SQL.questions);
  db.run(LEARNING_SQL.memories);
  db.run(LEARNING_SQL.blockedSources);
  db.run(JOB_OWNERS_SQL.schema);
  db.run(CONNECTION_SQL.schema);
  db.run(THREAD_SCOPE_SQL.schema);
  db.run(MODEL_SETTINGS_SQL.schema);
  return db;
}

export function insertJob(
  db: Database,
  row: {
    id: string;
    input: JobInput;
    status: JobStatus;
    createdAt: string;
  },
): void {
  const parsed = JobInputSchema.parse(row.input);
  db.query(QUERY_INSERT_JOB).run(
    row.id,
    parsed.erp_host,
    parsed.profile_id,
    JSON.stringify(parsed.invoice_json),
    parsed.instruction,
    row.status,
    row.createdAt,
  );
}

export function updateJobStatus(db: Database, update: { jobId: string; status: JobStatus }): void {
  db.query(QUERY_UPDATE_JOB_STATUS).run(update.status, update.jobId);
}

export function updateJobResultIds(
  db: Database,
  update: { jobId: string; resultIds: AgentResultIds },
): void {
  const parsed = AgentResultIdsSchema.parse(update.resultIds);
  db.query(QUERY_UPDATE_JOB_RESULT_IDS).run(JSON.stringify(parsed), update.jobId);
}

export function findJobRow(db: Database, jobId: string): JobRow | undefined {
  const row: unknown = db.query(QUERY_FIND_JOB).get(jobId);
  if (row === undefined || row === null) {
    return undefined;
  }
  return JobRowSchema.parse(row);
}

export function findCompletedOutput(
  db: Database,
  search: { kind: TaskKind; invoiceNo: string; supplier: string; erpHost: string; userId?: string },
): string | undefined {
  const rows: unknown[] = db
    .query(QUERY_FIND_COMPLETED_OUTPUT)
    .all(search.kind, TASK_STATUS_DONE, search.erpHost, search.userId ?? null);
  for (const row of rows) {
    const candidate = CompletedOutputRowSchema.safeParse(row);
    if (!candidate.success) {
      continue;
    }
    if (candidate.data.output_id === null) {
      continue;
    }
    const invoice = safeParseJson(candidate.data.invoice_json);
    if (invoice === undefined) {
      continue;
    }
    if (invoice.invoice_no === search.invoiceNo && invoice.supplier === search.supplier) {
      return candidate.data.output_id;
    }
  }
  return undefined;
}

export function insertTask(
  db: Database,
  row: { id: string; jobId: string; kind: TaskKind; status: TaskStatus; outputId?: string },
): void {
  db.query(QUERY_INSERT_TASK).run(row.id, row.jobId, row.kind, row.status, row.outputId ?? null);
}

export function updateTask(
  db: Database,
  update: { taskId: string; status: TaskStatus; outputId: string | null },
): void {
  db.query(QUERY_UPDATE_TASK).run(update.status, update.outputId, update.taskId);
}

export function findTaskRows(db: Database, jobId: string): TaskRow[] {
  const rows: unknown[] = db.query(QUERY_FIND_TASKS).all(jobId);
  return rows.map((row) => TaskRowSchema.parse(row));
}

export function insertQuestion(
  db: Database,
  row: { id: string; jobId: string; qNorm: string; qRaw: string; status: QuestionStatus },
): void {
  db.query(QUERY_INSERT_QUESTION).run(row.id, row.jobId, row.qNorm, row.qRaw, row.status);
}

export function findQuestionRows(db: Database, jobId: string): QuestionRow[] {
  const rows: unknown[] = db.query(QUERY_FIND_QUESTIONS).all(jobId);
  return rows.map((row) => QuestionRowSchema.parse(row));
}

export function findQuestionRow(db: Database, questionId: string): QuestionRow | undefined {
  const row: unknown = db.query(QUERY_FIND_QUESTION).get(questionId);
  if (row === undefined || row === null) {
    return undefined;
  }
  return QuestionRowSchema.parse(row);
}

export function answerQuestionRow(
  db: Database,
  update: { questionId: string; answer: string },
): void {
  db.query(QUERY_ANSWER_QUESTION).run(update.answer, QUESTION_STATUS_ANSWERED, update.questionId);
}

export function upsertMemory(
  db: Database,
  row: { erpHost: string; qNorm: string; answer: string; updatedAt: string },
): void {
  db.query(QUERY_UPSERT_MEMORY).run(row.erpHost, row.qNorm, row.answer, row.updatedAt);
}

export function findMemoryAnswer(
  db: Database,
  search: { erpHost: string; qNorm: string },
): string | undefined {
  const row: unknown = db.query(QUERY_FIND_MEMORY_ANSWER).get(search.erpHost, search.qNorm);
  if (row === undefined || row === null) {
    return undefined;
  }
  return MemoryAnswerRowSchema.parse(row).answer;
}

export function listMemoryRows(db: Database, erpHost: string): MemoryEntry[] {
  const rows: unknown[] = db.query(QUERY_LIST_MEMORY).all(erpHost);
  return rows.map((row) => MemoryEntrySchema.parse(row));
}
