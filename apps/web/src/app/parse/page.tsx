"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { env } from "@/env";
import { API_PATHS, CONTENT_TYPE_HEADER, JobViewSchema, LABEL_SEPARATOR, ParseResultSchema, type ParseResult } from "shared";

const PAGE_TITLE = "Parse invoice" as const;
const PAGE_DESCRIPTION = "Upload the demo PDF or paste JSON to preview trusted invoice data" as const;
const FILE_LABEL = "Invoice PDF" as const;
const PASTE_LABEL = "Manual JSON paste" as const;
const PARSE_FILE_BUTTON = "Parse PDF" as const;
const PARSE_PASTE_BUTTON = "Parse pasted JSON" as const;
const PARSING_LABEL = "Parsing…" as const;
const RESULT_LABEL = "Result" as const;
const ERROR_LABEL = "Error" as const;
const JSON_MIME = "application/json" as const;
const PDF_MIME = "application/pdf" as const;
const INVALID_JSON_MESSAGE = "pasted_text_is_not_valid_json" as const;
const UNKNOWN_ERROR_MESSAGE = "parse_request_failed" as const;
const REQUEST_FAILED_STATUS_MESSAGE = "parse_request_failed_status" as const;
const NO_FILE_MESSAGE = "choose_a_pdf_file_first" as const;
const JSON_INDENT = 2 as const;
const METHOD_POST = "POST" as const;
const INSTRUCTION_LABEL = "Instruction" as const;
const INSTRUCTION_PLACEHOLDER = "Create PO, SO, and Stock Entry…" as const;
const START_JOB_BUTTON = "Start autopilot job" as const;
const JOB_HREF_PREFIX = "/jobs/" as const;
const DEFAULT_INSTRUCTION = "Create PO, SO, and Stock Entry" as const;

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: ParseResult }
  | { kind: "failed"; message: string };

const INITIAL_STATE: ViewState = { kind: "idle" };

export default function ParsePage() {
  const router = useRouter();
  const fileRef = useRef<File | null>(null);
  const [pasted, setPasted] = useState<string>("");
  const [instruction, setInstruction] = useState<string>(DEFAULT_INSTRUCTION);
  const [state, setState] = useState<ViewState>(INITIAL_STATE);

  const parseUrl: string = `${env.NEXT_PUBLIC_API_URL}${API_PATHS.parse}`;

  function parseFailedStatus(status: number): void {
    setState({
      kind: "failed",
      message: `${REQUEST_FAILED_STATUS_MESSAGE}${LABEL_SEPARATOR}${status}`,
    });
  }

  async function parseFile(): Promise<void> {
    const file: File | null = fileRef.current;
    if (file === null) {
      setState({ kind: "failed", message: NO_FILE_MESSAGE });
      return;
    }
    setState({ kind: "loading" });
    try {
      const buffer: ArrayBuffer = await file.arrayBuffer();
      const res = await fetch(parseUrl, {
        method: METHOD_POST,
        headers: { [CONTENT_TYPE_HEADER]: PDF_MIME },
        body: buffer,
      });
      if (!res.ok) {
        parseFailedStatus(res.status);
        return;
      }
      const json: unknown = await res.json();
      setState({ kind: "done", result: ParseResultSchema.parse(json) });
    } catch (error) {
      setState({
        kind: "failed",
        message: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
      });
    }
  }

  async function parsePasted(): Promise<void> {
    setState({ kind: "loading" });
    try {
      const invoiceJson: unknown = JSON.parse(pasted);
      const res = await fetch(parseUrl, {
        method: METHOD_POST,
        headers: { [CONTENT_TYPE_HEADER]: JSON_MIME },
        body: JSON.stringify({ invoiceJson }),
      });
      if (!res.ok) {
        parseFailedStatus(res.status);
        return;
      }
      const json: unknown = await res.json();
      setState({ kind: "done", result: ParseResultSchema.parse(json) });
    } catch (error) {
      if (error instanceof SyntaxError) {
        setState({ kind: "failed", message: INVALID_JSON_MESSAGE });
        return;
      }
      setState({
        kind: "failed",
        message: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
      });
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const selected: File | undefined = event.target.files?.[0];
    fileRef.current = selected ?? null;
  }

  async function startJob(): Promise<void> {
    if (state.kind !== "done" || state.result.status !== "ok") {
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${API_PATHS.jobs}`, {
        method: METHOD_POST,
        headers: { [CONTENT_TYPE_HEADER]: JSON_MIME },
        body: JSON.stringify({
          invoice_json: state.result.invoice,
          instruction,
          erp_host: env.NEXT_PUBLIC_ERP_HOST,
          profile_id: env.NEXT_PUBLIC_PROFILE_ID,
        }),
      });
      if (!res.ok) {
        parseFailedStatus(res.status);
        return;
      }
      const view = JobViewSchema.parse(await res.json());
      router.push(`${JOB_HREF_PREFIX}${view.id}`);
    } catch (error) {
      setState({
        kind: "failed",
        message: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
      });
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <Card>
        <CardHeader>
          <CardTitle>{PAGE_TITLE}</CardTitle>
          <CardDescription>{PAGE_DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>{FILE_LABEL}</Label>
          <Input type="file" accept={PDF_MIME} onChange={onFileChange} />
          <Button onClick={parseFile} disabled={state.kind === "loading"}>
            {state.kind === "loading" ? PARSING_LABEL : PARSE_FILE_BUTTON}
          </Button>
          <Label>{PASTE_LABEL}</Label>
          <Textarea value={pasted} onChange={(event) => setPasted(event.target.value)} />
          <Button onClick={parsePasted} disabled={state.kind === "loading"}>
            {state.kind === "loading" ? PARSING_LABEL : PARSE_PASTE_BUTTON}
          </Button>
          <Label>{RESULT_LABEL}</Label>
          {state.kind === "done" ? (
            <>
              <pre>{JSON.stringify(state.result, null, JSON_INDENT)}</pre>
              {state.result.status === "ok" ? (
                <>
                  <Label>{INSTRUCTION_LABEL}</Label>
                  <Input
                    placeholder={INSTRUCTION_PLACEHOLDER}
                    value={instruction}
                    onChange={(event) => setInstruction(event.target.value)}
                  />
                  <Button onClick={() => void startJob()}>{START_JOB_BUTTON}</Button>
                </>
              ) : null}
            </>
          ) : null}
          {state.kind === "failed" ? (
            <p>
              {ERROR_LABEL}
              {LABEL_SEPARATOR}
              {state.message}
            </p>
          ) : null}
          {state.kind === "loading" ? <p>{PARSING_LABEL}</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
