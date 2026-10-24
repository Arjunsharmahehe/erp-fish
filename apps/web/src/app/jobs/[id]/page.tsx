import { Suspense } from "react";
import { cookies } from "next/headers";
import * as z from "zod";
import { env } from "@/env";
import { API_PATHS, JobViewSchema, type JobView } from "shared";
import { JobViewPanel } from "./job-view-panel";

const MIN_ID_LENGTH = 1 as const;
const ID_PARAM = ":id" as const;
const LOADING_LABEL = "Loading…" as const;
const COOKIE_HEADER = "Cookie";
const CACHE_MODE = "no-store";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>{LOADING_LABEL}</p>}>
      <JobPageContent params={params} />
    </Suspense>
  );
}

async function JobPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId: string = z.string().min(MIN_ID_LENGTH).parse(id);
  let initial: JobView | null = null;
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${API_PATHS.jobById.replace(ID_PARAM, jobId)}`, { headers: { [COOKIE_HEADER]: (await cookies()).toString() }, cache: CACHE_MODE });
    if (res.ok) {
      initial = JobViewSchema.parse(await res.json());
    }
  } catch {
    initial = null;
  }
  return <JobViewPanel jobId={jobId} initial={initial} />;
}
