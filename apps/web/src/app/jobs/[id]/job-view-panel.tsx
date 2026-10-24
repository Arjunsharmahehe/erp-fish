"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobView } from "shared";
import { JobLog, JobMeta, JobQuestions, JobTasks } from "./job-view-sections";
import { isTerminal, useAnswerForm, useElapsedSeconds, useJobPolling, useJobView } from "./use-job-view";

const PAGE_TITLE = "Autopilot job" as const;
const PAGE_DESCRIPTION = "Live progress, questions, and results" as const;
const LOADING_LABEL = "Loading…" as const;

export function JobViewPanel({ jobId, initial }: { jobId: string; initial: JobView | null }) {
  const { view, log, error, learnedCount, refresh, setView, setError } = useJobView(jobId, initial);
  const terminal: boolean = isTerminal(view);
  const elapsedSec = useElapsedSeconds(terminal);
  useJobPolling(terminal, refresh);
  const form = useAnswerForm({ onView: setView, onError: setError });

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
              <JobMeta view={view} elapsedSec={elapsedSec} learnedCount={learnedCount} />
              <JobTasks tasks={view.tasks} />
              <JobQuestions
                questions={view.questions}
                drafts={form.drafts}
                onDraftChange={form.updateDraft}
                onSubmit={form.submitAnswer}
              />
              <JobLog log={log} error={error} />
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
