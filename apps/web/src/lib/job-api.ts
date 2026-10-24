import {
  API_PATHS,
  CONTENT_TYPE_HEADER,
  JobViewSchema,
  type JobView,
} from "shared";

const METHOD_POST = "POST" as const;
const JSON_MIME = "application/json" as const;
const ID_PARAM = ":id" as const;
const QUERY_HOST_PARAM = "erp_host" as const;

export async function fetchJobView(baseUrl: string, jobId: string): Promise<JobView | null> {
  const res = await fetch(`${baseUrl}${API_PATHS.jobById.replace(ID_PARAM, jobId)}`);
  if (!res.ok) {
    return null;
  }
  return JobViewSchema.parse(await res.json());
}

export async function fetchLearnedCount(baseUrl: string, erpHost: string): Promise<number | null> {
  try {
    const mem = await fetch(
      `${baseUrl}${API_PATHS.memory}?${QUERY_HOST_PARAM}=${encodeURIComponent(erpHost)}`,
    );
    if (!mem.ok) {
      return null;
    }
    const entries: unknown = await mem.json();
    return Array.isArray(entries) ? entries.length : null;
  } catch {
    return null;
  }
}

export async function postAnswer(request: {
  baseUrl: string;
  questionId: string;
  answer: string;
}): Promise<JobView | null> {
  const res = await fetch(
    `${request.baseUrl}${API_PATHS.questions.replace(ID_PARAM, request.questionId)}`,
    {
      method: METHOD_POST,
      headers: { [CONTENT_TYPE_HEADER]: JSON_MIME },
      body: JSON.stringify({ answer: request.answer }),
    },
  );
  if (!res.ok) {
    return null;
  }
  return JobViewSchema.parse(await res.json());
}
