import * as z from "zod";
import { env } from "@/env";
import { API_PATHS, JobViewSchema, type JobView } from "shared";
import { JobViewPanel } from "./job-view";

const MIN_ID_LENGTH = 1 as const;
const ID_PARAM = ":id" as const;

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobId: string = z.string().min(MIN_ID_LENGTH).parse(id);
  let initial: JobView | null = null;
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${API_PATHS.jobById.replace(ID_PARAM, jobId)}`);
    if (res.ok) {
      initial = JobViewSchema.parse(await res.json());
    }
  } catch {
    initial = null;
  }
  return <JobViewPanel jobId={jobId} initial={initial} />;
}
