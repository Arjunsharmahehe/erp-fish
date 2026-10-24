"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";
import { onboard } from "@/lib/plan-api";
import { PLAN_COPY, PLAN_ROUTES } from "@/lib/plan-config";

const HOST_ITEM = "erp-host";
const CREDENTIAL_ITEM = "credentials";
const HOST_ONLY_CHOICE = "host-only";
const ADD_CREDENTIALS_CHOICE = "add-credentials";
const QUESTION_ITEMS = [{ name: HOST_ITEM, required: true }, { name: CREDENTIAL_ITEM, required: false }];

function CredentialFields(props: { username: string; setUsername: (value: string) => void; password: string; setPassword: (value: string) => void }) {
  return <FieldGroup>
    <Field><FieldLabel htmlFor="erp-username">{PLAN_COPY.erpUsername}</FieldLabel>
      <Input id="erp-username" autoComplete="off" value={props.username} onChange={(event) => { props.setUsername(event.target.value); }} />
    </Field>
    <Field><FieldLabel htmlFor="erp-password">{PLAN_COPY.erpPassword}</FieldLabel>
      <Input id="erp-password" type="password" autoComplete="off" value={props.password} onChange={(event) => { props.setPassword(event.target.value); }} />
    </Field>
  </FieldGroup>;
}

function OnboardingQuestions(props: {
  host: string; setHost: (value: string) => void;
  username: string; setUsername: (value: string) => void;
  password: string; setPassword: (value: string) => void;
  includeCredentials: boolean; setIncludeCredentials: (value: boolean) => void;
}) {
  return <>
    <QuestionnaireItem name={HOST_ITEM} required>
      <QuestionnaireTitle>{PLAN_COPY.erpHost}</QuestionnaireTitle>
      <QuestionnaireDescription>{PLAN_COPY.erpHostHint}</QuestionnaireDescription>
      <QuestionnaireInput type="url" aria-label={PLAN_COPY.erpHost} value={props.host} onChange={(event) => { props.setHost(event.target.value); }} />
      <QuestionnaireError />
    </QuestionnaireItem>
    <QuestionnaireItem name={CREDENTIAL_ITEM}>
      <QuestionnaireTitle>{PLAN_COPY.credentialsTitle}</QuestionnaireTitle>
      <QuestionnaireDescription>{PLAN_COPY.credentialsDescription}</QuestionnaireDescription>
      <QuestionnaireChoices>
        <QuestionnaireChoice value={HOST_ONLY_CHOICE} defaultChecked onChange={() => { props.setIncludeCredentials(false); }}>{PLAN_COPY.hostOnly}</QuestionnaireChoice>
        <QuestionnaireChoice value={ADD_CREDENTIALS_CHOICE} onChange={() => { props.setIncludeCredentials(true); }}>{PLAN_COPY.addCredentials}</QuestionnaireChoice>
      </QuestionnaireChoices>
      {props.includeCredentials && <CredentialFields username={props.username} setUsername={props.setUsername} password={props.password} setPassword={props.setPassword} />}
      <QuestionnaireError />
    </QuestionnaireItem>
  </>;
}

export default function Page() {
  const router = useRouter();
  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [includeCredentials, setIncludeCredentials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await onboard({ erpHost: host.trim(), username: includeCredentials ? username : "", password: includeCredentials ? password : "" });
      router.replace(PLAN_ROUTES.home);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : PLAN_COPY.authError);
      setPending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{PLAN_COPY.onboardingTitle}</CardTitle>
          <CardDescription>{PLAN_COPY.onboardingDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Questionnaire items={QUESTION_ITEMS} onSubmit={(event) => void submit(event)}>
            <QuestionnaireProgress />
            <OnboardingQuestions host={host} setHost={setHost} username={username} setUsername={setUsername} password={password} setPassword={setPassword} includeCredentials={includeCredentials} setIncludeCredentials={setIncludeCredentials} />
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <QuestionnaireActions>
              <QuestionnairePrevious>{PLAN_COPY.back}</QuestionnairePrevious>
              <QuestionnaireSkip>{PLAN_COPY.skipCredentials}</QuestionnaireSkip>
              <QuestionnaireNext>{PLAN_COPY.next}</QuestionnaireNext>
              <QuestionnaireSubmit disabled={pending}>{pending ? PLAN_COPY.saving : PLAN_COPY.finish}</QuestionnaireSubmit>
            </QuestionnaireActions>
          </Questionnaire>
        </CardContent>
      </Card>
    </main>
  );
}
