"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { env } from "@/env";
import {
  API_PATHS,
  JOB_STATUS_DONE,
  JOB_STATUS_FAILED,
  JOB_STATUS_WAITING,
  SPACE,
  type JobView,
} from "shared";
import { fetchJobView, fetchLearnedCount, postAnswer } from "@/lib/job-api";

const POLL_INTERVAL_MS = 3000 as const;
const TICK_INTERVAL_MS = 1000 as const;
const TICK_SECONDS = 1 as const;
const ZERO_SECONDS = 0 as const;
const LOADING_LABEL = "Loading…" as const;
const ID_PARAM = ":id" as const;
const STREAM_TASK_EVENT = "task" as const;
const STREAM_QUESTION_EVENT = "question" as const;
const STREAM_DONE_EVENT = "done" as const;

export function isTerminal(view: JobView | null): boolean {
  return (
    view?.status === JOB_STATUS_DONE ||
    view?.status === JOB_STATUS_WAITING ||
    view?.status === JOB_STATUS_FAILED
  );
}

export function useJobView(jobId: string, initial: JobView | null) {
  const [view, setView] = useState<JobView | null>(initial);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [learnedCount, setLearnedCount] = useState<number | null>(null);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const next = await fetchJobView(env.NEXT_PUBLIC_API_URL, jobId);
      if (next === null || !mountedRef.current) {
        return;
      }
      setView(next);
      const count = await fetchLearnedCount(env.NEXT_PUBLIC_API_URL, next.erp_host);
      if (count !== null) {
        // mountedRef is mutated to false in the unmount cleanup above,
        // which this rule cannot see.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (mountedRef.current) {
          setLearnedCount(count);
        }
      }
    } catch {
      if (mountedRef.current) {
        setError(LOADING_LABEL);
      }
    }
  }, [jobId]);

  const appendLog = useCallback((line: string): void => {
    if (mountedRef.current) {
      setLog((prev) => [...prev, line]);
    }
  }, []);

  useJobStream({ jobId, refresh, append: appendLog });

  return { view, log, error, learnedCount, refresh, setView, setError };
}

function useJobStream(request: {
  jobId: string;
  refresh: () => Promise<void>;
  append: (line: string) => void;
}): void {
  const { jobId, refresh, append } = request;
  useEffect(() => {
    const source = new EventSource(
      `${env.NEXT_PUBLIC_API_URL}${API_PATHS.jobStream.replace(ID_PARAM, jobId)}`,
      { withCredentials: true },
    );
    source.addEventListener(STREAM_TASK_EVENT, (event: MessageEvent) => {
      append([STREAM_TASK_EVENT, event.data].join(SPACE));
    });
    source.addEventListener(STREAM_QUESTION_EVENT, (event: MessageEvent) => {
      append([STREAM_QUESTION_EVENT, event.data].join(SPACE));
    });
    source.addEventListener(STREAM_DONE_EVENT, (event: MessageEvent) => {
      append([STREAM_DONE_EVENT, event.data].join(SPACE));
      source.close();
      void refresh();
    });
    source.onerror = () => {
      source.close();
      void refresh();
    };
    // The initial load must run in the effect; every setState inside
    // refresh happens after an await, so no cascading render occurs.
    void refresh();
    return () => {
      source.close();
    };
  }, [jobId, refresh, append]);
}

export function useElapsedSeconds(terminal: boolean): number {
  const [elapsedSec, setElapsedSec] = useState<number>(ZERO_SECONDS);

  useEffect(() => {
    if (terminal) {
      return;
    }
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + TICK_SECONDS);
    }, TICK_INTERVAL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [terminal]);

  return elapsedSec;
}

export function useJobPolling(terminal: boolean, refresh: () => Promise<void>): void {
  const onPoll = useEffectEvent((): void => {
    void refresh();
  });

  useEffect(() => {
    if (terminal) {
      return;
    }
    const poll = setInterval(onPoll, POLL_INTERVAL_MS);
    return () => {
      clearInterval(poll);
    };
  }, [terminal]);
}

export function useAnswerForm(request: {
  onView: (view: JobView) => void;
  onError: (message: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string | undefined>>({});

  function updateDraft(questionId: string, value: string): void {
    setDrafts((prev) => ({ ...prev, [questionId]: value }));
  }

  async function submitAnswer(questionId: string): Promise<void> {
    const answer: string | undefined = drafts[questionId];
    if (answer === undefined) {
      return;
    }
    try {
      const next = await postAnswer({
        baseUrl: env.NEXT_PUBLIC_API_URL,
        questionId,
        answer,
      });
      if (next === null) {
        return;
      }
      request.onView(next);
    } catch {
      request.onError(LOADING_LABEL);
    }
  }

  return { drafts, updateDraft, submitAnswer };
}
