import { Database } from "bun:sqlite";
import * as z from "zod";
import {
  AgentResultIdsSchema,
  InvoiceJSONSchema,
  JobInputSchema,
  JobStatusSchema,
  QuestionStatusSchema,
  TASK_STATUS_DONE,
  TaskKindSchema,
  TaskStatusSchema,
  type AgentResultIds,
  type JobInput,
  type JobStatus,
  type QuestionStatus,
  type TaskKind,
  type TaskStatus,
} from "shared";

export const IN_MEMORY_DB_PATH = ":memory:" as const;

const JobRowSchema = z.object({
  id: z.string(),
  erp_host: z.string(),
  profile_id: z.string(),
  invoice_json: z.string(),
  instruction: z.string(),
  status: JobStatusSchema,
  result_ids: z.string().nullable(),
  created_at: z.string(),
});

export type JobRow = z.infer<typeof JobRowSchema>;

const TaskRowSchema = z.object({
  id: z.string(),
  job_id: z.string(),
  kind: TaskKindSchema,
  status: TaskStatusSchema,
  agent_run_id: z.string().nullable(),
  output_id: z.string().nullable(),
});

export type TaskRow = z.infer<typeof TaskRowSchema>;

const QuestionRowSchema = z.object({
  id: z.string(),
  job_id: z.string(),
  q_norm: z.string(),
  q_raw: z.string(),
  answer: z.string().nullable(),
  status: QuestionStatusSchema,
});

export type QuestionRow = z.infer<typeof QuestionRowSchema>;

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

const QUERY_INSERT_JOB =
  "INSERT INTO jobs(id, erp_host, profile_id, invoice_json, instruction, status, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)" as const;
const QUERY_UPDATE_JOB_STATUS = "UPDATE jobs SET status = ? WHERE id = ?" as const;
const QUERY_UPDATE_JOB_RESULT_IDS = "UPDATE jobs SET result_ids = ? WHERE id = ?" as const;
const QUERY_FIND_JOB = "SELECT * FROM jobs WHERE id = ?" as const;
const QUERY_FIND_COMPLETED_OUTPUT =
  "SELECT tasks.output_id AS output_id, jobs.invoice_json AS invoice_json FROM tasks JOIN jobs ON jobs.id = tasks.job_id WHERE tasks.kind = ? AND tasks.status = ? AND jobs.erp_host = ?" as const;
const QUERY_INSERT_TASK =
  "INSERT INTO tasks(id, job_id, kind, status, output_id) VALUES(?, ?, ?, ?, ?)" as const;
const QUERY_UPDATE_TASK = "UPDATE tasks SET status = ?, output_id = ? WHERE id = ?" as const;
const QUERY_FIND_TASKS = "SELECT * FROM tasks WHERE job_id = ?" as const;
const QUERY_INSERT_QUESTION =
  "INSERT INTO questions(id, job_id, q_norm, q_raw, status) VALUES(?, ?, ?, ?, ?)" as const;
const QUERY_FIND_QUESTIONS = "SELECT * FROM questions WHERE job_id = ?" as const;

const CompletedOutputRowSchema = z.object({
  output_id: z.string().nullable(),
  invoice_json: z.string(),
});

function safeParseJson(text: string): z.infer<typeof InvoiceJSONSchema> | undefined {
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
  db.exec(SCHEMA_JOBS);
  db.exec(SCHEMA_TASKS);
  db.exec(SCHEMA_QUESTIONS);
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

export function updateJobStatus(db: Database, jobId: string, status: JobStatus): void {
  db.query(QUERY_UPDATE_JOB_STATUS).run(status, jobId);
}

export function updateJobResultIds(db: Database, jobId: string, resultIds: AgentResultIds): void {
  const parsed = AgentResultIdsSchema.parse(resultIds);
  db.query(QUERY_UPDATE_JOB_RESULT_IDS).run(JSON.stringify(parsed), jobId);
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
  kind: TaskKind,
  invoiceNo: string,
  supplier: string,
  erpHost: string,
): string | undefined {
  const rows: unknown[] = db.query(QUERY_FIND_COMPLETED_OUTPUT).all(kind, TASK_STATUS_DONE, erpHost);
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
    if (invoice.invoice_no === invoiceNo && invoice.supplier === supplier) {
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
  taskId: string,
  status: TaskStatus,
  outputId: string | null,
): void {
  db.query(QUERY_UPDATE_TASK).run(status, outputId, taskId);
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
