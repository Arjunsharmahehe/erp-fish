const SCHEMA_JOBS = `CREATE TABLE IF NOT EXISTS jobs(
id TEXT PRIMARY KEY,
erp_host TEXT NOT NULL,
profile_id TEXT NOT NULL,
invoice_json TEXT NOT NULL,
instruction TEXT NOT NULL,
status TEXT NOT NULL,
result_ids TEXT,
created_at TEXT NOT NULL
)`;

const SCHEMA_TASKS = `CREATE TABLE IF NOT EXISTS tasks(
id TEXT PRIMARY KEY,
job_id TEXT NOT NULL,
kind TEXT NOT NULL,
status TEXT NOT NULL,
agent_run_id TEXT,
output_id TEXT
)`;

const SCHEMA_QUESTIONS = `CREATE TABLE IF NOT EXISTS questions(
id TEXT PRIMARY KEY,
job_id TEXT NOT NULL,
q_norm TEXT NOT NULL,
q_raw TEXT NOT NULL,
answer TEXT,
status TEXT NOT NULL
)`;

const SCHEMA_MEMORY = `CREATE TABLE IF NOT EXISTS memory(
erp_host TEXT NOT NULL,
q_norm TEXT NOT NULL,
answer TEXT NOT NULL,
updated_at TEXT NOT NULL,
PRIMARY KEY(erp_host, q_norm)
)`;

export const jobSchema = [SCHEMA_JOBS, SCHEMA_TASKS, SCHEMA_QUESTIONS, SCHEMA_MEMORY];
