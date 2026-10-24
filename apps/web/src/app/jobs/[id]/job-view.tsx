"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { env } from "@/env";
import {
  API_PATHS,
  CONTENT_TYPE_HEADER,
  JOB_STATUS_DONE,
  JOB_STATUS_FAILED,
  JOB_STATUS_WAITING,
  LABEL_SEPARATOR,
  QUESTION_STATUS_QUEUED,
  SPACE,
  JobViewSchema,
  type JobView,
} from "shared";

const PAGE_TITLE = "Autopilot job" as const;
const PAGE_DESCRIPTION = "Live progress, questions, and results" as const;
const STATUS_LABEL = "Status" as const;
const ELAPSED_LABEL = "Elapsed" as const;
const BASELINE_LABEL = "Manual baseline" as const;
const SAVED_LABEL = "Time saved" as const;
const MINUTES_UNIT = "min" as const;
const ORDERS_LABEL = "Order IDs" as const;
const TASKS_LABEL = "Steps" as const;
const QUESTIONS_LABEL = "Questions" as const;
const LOG_LABEL = "Progress log" as const;
const LEARNED_LABEL = "Learned answers" as const;
const ANSWER_PLACEHOLDER = "Type the answer…" as const;
const ANSWER_BUTTON = "Answer" as const;
const LOADING_LABEL = "Loading…" as const;
const POLL_INTERVAL_MS = 3000 as const;
const TICK_INTERVAL_MS = 1000 as const;
const TICK_SECONDS = 1 as const;
const ZERO_SECONDS = 0 as const;
const SECONDS_PER_MINUTE = 60 as const;
const MANUAL_BASELINE_MINUTES = 25 as const;
const JSON_INDENT = 2 as const;
const METHOD_POST = "POST" as const;
const JSON_MIME = "application/json" as const;
const ID_PARAM = ":id" as const;
const LOG_NEWLINE = "\n" as const;
const EMPTY_TEXT = "" as const;
const QUERY_HOST_PARAM = "erp_host" as const;
const STREAM_TASK_EVENT = "task" as const;
const STREAM_QUESTION_EVENT = "question" as const;
const STREAM_DONE_EVENT = "done" as const;

export function JobViewPanel({ jobId, initial }: { jobId: string; initial: JobView | null }) {
  const [view, setView] = useState<JobView | null>(initial);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(ZERO_SECONDS);
  const [learnedCount, setLearnedCount] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const terminal: boolean =
    view?.status === JOB_STATUS_DONE ||
    view?.status === JOB_STATUS_WAITING ||
    view?.status === JOB_STATUS_FAILED;

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

  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchView = useCallback(async (): Promise<void> => {
    try {
      const base: string = env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}${API_PATHS.jobById.replace(ID_PARAM, jobId)}`);
      if (!res.ok) {
        return;
      }
      const parsed = JobViewSchema.parse(await res.json());
      if (!mountedRef.current) {
        return;
      }
      setView(parsed);
      const mem = await fetch(
        `${base}${API_PATHS.memory}?${QUERY_HOST_PARAM}=${encodeURIComponent(parsed.erp_host)}`,
      );
      if (mem.ok) {
        const entries: unknown = await mem.json();
        if (Array.isArray(entries) && mountedRef.current) {
          setLearnedCount(entries.length);
        }
      }
    } catch {
      if (mountedRef.current) {
        setError(LOADING_LABEL);
      }
    }
  }, [jobId]);

  useEffect(() => {
    const base: string = env.NEXT_PUBLIC_API_URL;
    const source = new EventSource(`${base}${API_PATHS.jobStream.replace(ID_PARAM, jobId)}`);
    const append = (line: string): void => {
      if (mountedRef.current) {
        setLog((prev) => [...prev, line]);
      }
    };
    source.addEventListener(STREAM_TASK_EVENT, (event: MessageEvent) => {
      append([STREAM_TASK_EVENT, event.data].join(SPACE));
    });
    source.addEventListener(STREAM_QUESTION_EVENT, (event: MessageEvent) => {
      append([STREAM_QUESTION_EVENT, event.data].join(SPACE));
    });
    source.addEventListener(STREAM_DONE_EVENT, (event: MessageEvent) => {
      append([STREAM_DONE_EVENT, event.data].join(SPACE));
      source.close();
      void fetchView();
    });
    source.onerror = () => {
      source.close();
      void fetchView();
    };
    void fetchView();
    return () => {
      source.close();
    };
  }, [jobId, fetchView]);

  const onPoll = useEffectEvent((): void => {
    void fetchView();
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

  async function submitAnswer(questionId: string): Promise<void> {
    const answer: string | undefined = drafts[questionId];
    if (answer === undefined) {
      return;
    }
    try {
      const res = await fetch(
        `${env.NEXT_PUBLIC_API_URL}${API_PATHS.questions.replace(ID_PARAM, questionId)}`,
        {
          method: METHOD_POST,
          headers: { [CONTENT_TYPE_HEADER]: JSON_MIME },
          body: JSON.stringify({ answer }),
        },
      );
      if (!res.ok) {
        return;
      }
      setView(JobViewSchema.parse(await res.json()));
    } catch {
      setError(LOADING_LABEL);
    }
  }

  const elapsedMin: number = elapsedSec / SECONDS_PER_MINUTE;
  const savedMin: number = Math.max(
    ZERO_SECONDS,
    Math.floor(MANUAL_BASELINE_MINUTES - elapsedMin),
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <Card>
        <CardHeader>
          <CardTitle>{PAGE_TITLE}</CardTitle>
          <CardDescription>{PAGE_DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent>
          {view === null ? (
            <p>{LOADING_LABEL}</p>
          ) : (
            <>
              <p>
                {STATUS_LABEL}
                {SPACE}
                <Badge>{view.status}</Badge>
              </p>
              <p>
                {ELAPSED_LABEL}
                {SPACE}
                {Math.floor(elapsedMin)}
                {SPACE}
                {MINUTES_UNIT}
              </p>
              <p>
                {BASELINE_LABEL}
                {SPACE}
                {MANUAL_BASELINE_MINUTES}
                {SPACE}
                {MINUTES_UNIT}
                {SPACE}
                {SAVED_LABEL}
                {SPACE}
                {savedMin}
                {SPACE}
                {MINUTES_UNIT}
              </p>
              <p>
                {LEARNED_LABEL}
                {SPACE}
                {learnedCount ?? LOADING_LABEL}
              </p>
              <Label>{ORDERS_LABEL}</Label>
              <pre>{JSON.stringify(view.result_ids, null, JSON_INDENT)}</pre>
              <Label>{TASKS_LABEL}</Label>
              <ul>
                {view.tasks.map((task) => (
                  <li key={task.id}>
                    {task.kind}
                    {SPACE}
                    {task.status}
                    {SPACE}
                    {task.output_id ?? EMPTY_TEXT}
                  </li>
                ))}
              </ul>
              <Label>{QUESTIONS_LABEL}</Label>
              <ul>
                {view.questions.map((question) => (
                  <li key={question.id}>
                    <p>
                      {question.q_raw}
                      {SPACE}
                      <Badge>{question.status}</Badge>
                    </p>
                    {question.status === QUESTION_STATUS_QUEUED ? (
                      <>
                        <Input
                          placeholder={ANSWER_PLACEHOLDER}
                          value={drafts[question.id] ?? EMPTY_TEXT}
                          onChange={(event) =>
                            setDrafts((prev) => ({ ...prev, [question.id]: event.target.value }))
                          }
                        />
                        <Button onClick={() => void submitAnswer(question.id)}>
                          {ANSWER_BUTTON}
                        </Button>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
              <Label>{LOG_LABEL}</Label>
              <pre>{log.join(LOG_NEWLINE)}</pre>
              {error !== null ? <p>{error}</p> : null}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
