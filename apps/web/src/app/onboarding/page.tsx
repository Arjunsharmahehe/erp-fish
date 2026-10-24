"use client";
import { useCopy } from "@/hooks/use-copy";
import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { onboard } from "@/lib/plan-api";
import { PLAN_COPY, PLAN_ROUTES } from "@/lib/plan-config";
import { WORKSPACE_COPY, WORKSPACE_FIELDS } from "@/lib/workspace-config";
const INTRO = "Add your ERP URL, then connect your login securely in Settings.";
export default function Page() {
  const t = useCopy();
  const router = useRouter();
  const [host, setHost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setPending(true);
    try {
      await onboard({ erpHost: host.trim() });
      router.replace(PLAN_ROUTES.settings); router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : PLAN_COPY.authError); setPending(false);
    }
  }
  return <main className="flex flex-1 items-center justify-center px-6 py-12"><Card className="w-full max-w-lg">
    <CardHeader><CardTitle>{t(PLAN_COPY.onboardingTitle)}</CardTitle><CardDescription>{t(INTRO)}</CardDescription></CardHeader>
    <CardContent><form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)}>
      <Field><FieldLabel htmlFor={WORKSPACE_FIELDS.host}>{t(WORKSPACE_COPY.erpUrl)}</FieldLabel><Input id={WORKSPACE_FIELDS.host} type="url" required disabled={pending} value={host} placeholder={WORKSPACE_COPY.erpPlaceholder} onChange={(event) => { setHost(event.target.value); }} /><FieldDescription>{t(WORKSPACE_COPY.erpHint)}</FieldDescription></Field>
      {error && <Alert variant="destructive"><AlertDescription>{t(error)}</AlertDescription></Alert>}
      <Button type="submit" disabled={pending || !host.trim()}>{t(pending ? PLAN_COPY.saving : PLAN_COPY.finish)}</Button>
    </form></CardContent>
  </Card></main>;
}
