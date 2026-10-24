"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { env } from "@/env";
import { API_PATHS, type ParseResult } from "shared";
import {
  fetchParseFile,
  fetchParseText,
  fetchStartJob,
  toParseErrorMessage,
} from "@/lib/parse-requests";

const DEFAULT_INSTRUCTION = "Create PO, SO, and Stock Entry" as const;
const JOB_HREF_PREFIX = "/jobs/" as const;

export type ParseViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: ParseResult }
  | { kind: "failed"; message: string };

const INITIAL_STATE: ParseViewState = { kind: "idle" };

export function useParsePage() {
  const router = useRouter();
  const fileRef = useRef<File | null>(null);
  const [pasted, setPasted] = useState("");
  const [instruction, setInstruction] = useState<string>(DEFAULT_INSTRUCTION);
  const [state, setState] = useState<ParseViewState>(INITIAL_STATE);
  const parseUrl = `${env.NEXT_PUBLIC_API_URL}${API_PATHS.parse}`;

  async function runTask(task: () => Promise<ParseResult>): Promise<void> {
    setState({ kind: "loading" });
    try {
      setState({ kind: "done", result: await task() });
    } catch (error) {
      setState({ kind: "failed", message: toParseErrorMessage(error) });
    }
  }

  async function parseFile(): Promise<void> {
    await runTask(() => fetchParseFile(parseUrl, fileRef.current));
  }

  async function parsePasted(): Promise<void> {
    await runTask(() => fetchParseText(parseUrl, pasted));
  }

  async function startJob(): Promise<void> {
    if (state.kind !== "done" || state.result.status !== "ok") {
      return;
    }
    setState({ kind: "loading" });
    try {
      const view = await fetchStartJob({
        baseUrl: env.NEXT_PUBLIC_API_URL,
        invoice: state.result.invoice,
        instruction,
        erpHost: env.NEXT_PUBLIC_ERP_HOST,
        profileId: env.NEXT_PUBLIC_PROFILE_ID,
      });
      router.push(`${JOB_HREF_PREFIX}${view.id}`);
    } catch (error) {
      setState({ kind: "failed", message: toParseErrorMessage(error) });
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>): void {
    fileRef.current = event.target.files?.[0] ?? null;
  }

  return { pasted, setPasted, instruction, setInstruction, state, parseFile, parsePasted, startJob, onFileChange };
}
