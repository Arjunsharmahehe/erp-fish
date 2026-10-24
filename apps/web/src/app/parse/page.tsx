"use client";

import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LABEL_SEPARATOR } from "shared";
import { useParsePage, type ParseViewState } from "./use-parse-page";

const PAGE_TITLE = "Parse invoice" as const;
const PAGE_DESCRIPTION = "Upload the demo PDF or paste JSON to preview trusted invoice data" as const;
const FILE_LABEL = "Invoice PDF" as const;
const PASTE_LABEL = "Manual JSON paste" as const;
const PARSE_FILE_BUTTON = "Parse PDF" as const;
const PARSE_PASTE_BUTTON = "Parse pasted JSON" as const;
const PARSING_LABEL = "Parsing…" as const;
const RESULT_LABEL = "Result" as const;
const ERROR_LABEL = "Error" as const;
const PDF_MIME = "application/pdf" as const;
const JSON_INDENT = 2 as const;
const INSTRUCTION_LABEL = "Instruction" as const;
const INSTRUCTION_PLACEHOLDER = "Create PO, SO, and Stock Entry…" as const;
const START_JOB_BUTTON = "Start autopilot job" as const;

export default function Page() {
  const page = useParsePage();
  const loading: boolean = page.state.kind === "loading";

  function handlePastedChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    page.setPasted(event.target.value);
  }

  function handleInstructionChange(event: ChangeEvent<HTMLInputElement>): void {
    page.setInstruction(event.target.value);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <Card>
        <CardHeader>
          <CardTitle>{PAGE_TITLE}</CardTitle>
          <CardDescription>{PAGE_DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent>
          <ParseFilePanel onFileChange={page.onFileChange} onParse={page.parseFile} loading={loading} />
          <ParsePastePanel
            pasted={page.pasted}
            onPastedChange={handlePastedChange}
            onParse={page.parsePasted}
            loading={loading}
          />
          <ParseResultPanel
            state={page.state}
            instruction={page.instruction}
            onInstructionChange={handleInstructionChange}
            onStart={page.startJob}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function ParseFilePanel(request: {
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onParse: () => Promise<void>;
  loading: boolean;
}) {
  return (
    <>
      <Label>{FILE_LABEL}</Label>
      <Input type="file" accept={PDF_MIME} onChange={request.onFileChange} />
      <Button
        onClick={() => {
          void request.onParse();
        }}
        disabled={request.loading}
      >
        {request.loading ? PARSING_LABEL : PARSE_FILE_BUTTON}
      </Button>
    </>
  );
}

function ParsePastePanel(request: {
  pasted: string;
  onPastedChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onParse: () => Promise<void>;
  loading: boolean;
}) {
  return (
    <>
      <Label>{PASTE_LABEL}</Label>
      <Textarea value={request.pasted} onChange={request.onPastedChange} />
      <Button
        onClick={() => {
          void request.onParse();
        }}
        disabled={request.loading}
      >
        {request.loading ? PARSING_LABEL : PARSE_PASTE_BUTTON}
      </Button>
    </>
  );
}

function ParseResultPanel(request: {
  state: ParseViewState;
  instruction: string;
  onInstructionChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onStart: () => Promise<void>;
}) {
  if (request.state.kind === "failed") {
    return (
      <p>
        {ERROR_LABEL}
        {LABEL_SEPARATOR}
        {request.state.message}
      </p>
    );
  }
  if (request.state.kind === "loading") {
    return <p>{PARSING_LABEL}</p>;
  }
  if (request.state.kind !== "done") {
    return null;
  }
  return (
    <>
      <Label>{RESULT_LABEL}</Label>
      <pre>{JSON.stringify(request.state.result, null, JSON_INDENT)}</pre>
      {request.state.result.status === "ok" ? (
        <>
          <Label>{INSTRUCTION_LABEL}</Label>
          <Input
            placeholder={INSTRUCTION_PLACEHOLDER}
            value={request.instruction}
            onChange={request.onInstructionChange}
          />
          <Button
            onClick={() => {
              void request.onStart();
            }}
          >
            {START_JOB_BUTTON}
          </Button>
        </>
      ) : null}
    </>
  );
}
