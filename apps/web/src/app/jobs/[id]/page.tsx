import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AGENT, AgentRunViewSchema } from "shared";
import { env } from "@/env";
import { PLAN_HTTP, PLAN_ROUTES } from "@/lib/plan-config";
const ID_PARAM = ":id";
const UNAUTHORIZED = 401;
const MISSING = 404;
const LOAD_ERROR = "The agent run could not be loaded. Please try again.";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense><OpenRun params={params} /></Suspense>;
}
async function OpenRun({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${AGENT.paths.job.replace(ID_PARAM, encodeURIComponent(id))}`, {
    headers: { [PLAN_HTTP.cookie]: (await cookies()).toString() }, cache: PLAN_HTTP.noStore,
  });
  if (response.status === UNAUTHORIZED) redirect(PLAN_ROUTES.login);
  if (response.status === MISSING) notFound();
  if (!response.ok) throw new Error(LOAD_ERROR);
  const run = AgentRunViewSchema.parse(await response.json());
  return redirect(`${PLAN_ROUTES.home}?thread=${encodeURIComponent(run.thread_id)}`);
}
