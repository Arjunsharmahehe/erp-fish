import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  QUESTION_STATUS_QUEUED,
  SPACE,
  type JobView,
} from "shared";

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
const JSON_INDENT = 2 as const;
const SECONDS_PER_MINUTE = 60 as const;
const MANUAL_BASELINE_MINUTES = 25 as const;
const ZERO_SECONDS = 0 as const;
const EMPTY_TEXT = "" as const;
const LOG_NEWLINE = "\n" as const;

export function JobMeta(request: {
  view: JobView;
  elapsedSec: number;
  learnedCount: number | null;
}) {
  const elapsedMin: number = request.elapsedSec / SECONDS_PER_MINUTE;
  const savedMin: number = Math.max(ZERO_SECONDS, Math.floor(MANUAL_BASELINE_MINUTES - elapsedMin));
  return (
    <>
      <p>
        {STATUS_LABEL}
        {SPACE}
        <Badge>{request.view.status}</Badge>
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
        {request.learnedCount ?? LOADING_LABEL}
      </p>
      <Label>{ORDERS_LABEL}</Label>
      <pre>{JSON.stringify(request.view.result_ids, null, JSON_INDENT)}</pre>
    </>
  );
}

export function JobTasks(request: { tasks: JobView["tasks"] }) {
  return (
    <>
      <Label>{TASKS_LABEL}</Label>
      <ul>
        {request.tasks.map((task) => (
          <li key={task.id}>
            {task.kind}
            {SPACE}
            {task.status}
            {SPACE}
            {task.output_id ?? EMPTY_TEXT}
          </li>
        ))}
      </ul>
    </>
  );
}

export function JobQuestions(request: {
  questions: JobView["questions"];
  drafts: Record<string, string | undefined>;
  onDraftChange: (questionId: string, value: string) => void;
  onSubmit: (questionId: string) => Promise<void>;
}) {
  return (
    <>
      <Label>{QUESTIONS_LABEL}</Label>
      <ul>
        {request.questions.map((question) => (
          <li key={question.id}>
            <p>
              {question.q_raw}
              {SPACE}
              <Badge>{question.status}</Badge>
            </p>
            {question.status === QUESTION_STATUS_QUEUED ? (
              <QueuedQuestion
                questionId={question.id}
                draft={request.drafts[question.id]}
                onDraftChange={request.onDraftChange}
                onSubmit={request.onSubmit}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

function QueuedQuestion(request: {
  questionId: string;
  draft: string | undefined;
  onDraftChange: (questionId: string, value: string) => void;
  onSubmit: (questionId: string) => Promise<void>;
}) {
  return (
    <>
      <Input
        placeholder={ANSWER_PLACEHOLDER}
        value={request.draft ?? EMPTY_TEXT}
        onChange={(event) => {
          request.onDraftChange(request.questionId, event.target.value);
        }}
      />
      <Button
        onClick={() => {
          void request.onSubmit(request.questionId);
        }}
      >
        {ANSWER_BUTTON}
      </Button>
    </>
  );
}

export function JobLog(request: { log: string[]; error: string | null }) {
  return (
    <>
      <Label>{LOG_LABEL}</Label>
      <pre>{request.log.join(LOG_NEWLINE)}</pre>
      {request.error !== null ? <p>{request.error}</p> : null}
    </>
  );
}
