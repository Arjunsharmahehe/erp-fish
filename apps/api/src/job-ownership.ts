import type { Database } from "bun:sqlite";
import { HTTPException } from "hono/http-exception";

export const JOB_OWNERS_SQL = {
  schema: "CREATE TABLE IF NOT EXISTS job_owners(job_id TEXT PRIMARY KEY,user_id TEXT NOT NULL)",
  insert: "INSERT INTO job_owners(job_id,user_id) VALUES(?,?)",
  owned: "SELECT job_id FROM job_owners WHERE job_id=? AND user_id=?",
};
const MISSING = "Job not found.";
const NOT_FOUND = 404;
export function requireOwnedJob(db: Database, { jobId, userId }: { jobId: string; userId: string }) {
  const row: unknown = db.query(JOB_OWNERS_SQL.owned).get(jobId, userId);
  if (!row) throw new HTTPException(NOT_FOUND, { message: MISSING });
}
