import {
  API_PATHS,
  CONTENT_TYPE_HEADER,
  LABEL_SEPARATOR,
  JobViewSchema,
  ParseResultSchema,
  type JobInput,
  type JobView,
  type ParseResult,
} from "shared";

const METHOD_POST = "POST" as const;
const JSON_MIME = "application/json" as const;
const PDF_MIME = "application/pdf" as const;
const NO_FILE_MESSAGE = "choose_a_pdf_file_first" as const;
const INVALID_JSON_MESSAGE = "pasted_text_is_not_valid_json" as const;
const UNKNOWN_ERROR_MESSAGE = "parse_request_failed" as const;
const REQUEST_FAILED_STATUS_MESSAGE = "parse_request_failed_status" as const;

function failedStatusMessage(status: number): string {
  return [REQUEST_FAILED_STATUS_MESSAGE, String(status)].join(LABEL_SEPARATOR);
}

// toParseErrorMessage is the boundary mapper: catch-clause values are
// unknown by definition, so the unknown parameter is intentional.
export function toParseErrorMessage(
  // eslint-disable-next-line llm-core/no-unknown-parameters
  error: unknown,
): string {
  if (error instanceof SyntaxError) {
    return INVALID_JSON_MESSAGE;
  }
  return error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
}

export async function fetchParseFile(parseUrl: string, file: File | null): Promise<ParseResult> {
  if (file === null) {
    throw new Error(NO_FILE_MESSAGE);
  }
  const res = await fetch(parseUrl, {
    method: METHOD_POST,
    headers: { [CONTENT_TYPE_HEADER]: PDF_MIME },
    body: await file.arrayBuffer(),
  });
  if (!res.ok) {
    throw new Error(failedStatusMessage(res.status));
  }
  return ParseResultSchema.parse(await res.json());
}

export async function fetchParseText(parseUrl: string, pasted: string): Promise<ParseResult> {
  const invoiceJson: unknown = JSON.parse(pasted);
  const res = await fetch(parseUrl, {
    method: METHOD_POST,
    headers: { [CONTENT_TYPE_HEADER]: JSON_MIME },
    body: JSON.stringify({ invoiceJson }),
  });
  if (!res.ok) {
    throw new Error(failedStatusMessage(res.status));
  }
  return ParseResultSchema.parse(await res.json());
}

export async function fetchStartJob(request: {
  baseUrl: string;
  invoice: JobInput["invoice_json"];
  instruction: string;
  erpHost: string;
  profileId: string;
}): Promise<JobView> {
  const res = await fetch(`${request.baseUrl}${API_PATHS.jobs}`, {
    method: METHOD_POST,
    headers: { [CONTENT_TYPE_HEADER]: JSON_MIME },
    body: JSON.stringify({
      invoice_json: request.invoice,
      instruction: request.instruction,
      erp_host: request.erpHost,
      profile_id: request.profileId,
    }),
  });
  if (!res.ok) {
    throw new Error(failedStatusMessage(res.status));
  }
  return JobViewSchema.parse(await res.json());
}
