"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MODEL_SETTINGS, ModelSettingsUpdateSchema, type ModelSettingsState } from "shared";
import { useCopy } from "@/hooks/use-copy";
import { fetchModelSettings, saveModelSettings, resetModelSettings } from "@/lib/model-settings-api";
import { MODEL_COPY as COPY, MODEL_FIELDS as FIELDS } from "@/lib/model-settings-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "./ui/field";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { WorkspaceError, WorkspaceLoading } from "./workspace-feedback";
import { agentUi } from "@/lib/agent-ui";
const QUERY_KEY = [MODEL_SETTINGS.path];

function ModelForm({ settings }: { settings: ModelSettingsState }) {
  const t = useCopy();
  const client = useQueryClient();
  const [urlDraft, setUrl] = useState<string | null>(null);
  const [modelDraft, setModel] = useState<string | null>(null);
  const url = urlDraft ?? settings.completion_url;
  const model = modelDraft ?? settings.model;
  const [key, setKey] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const personalKey = settings.source === "personal" && settings.has_key;
  const mutation = useMutation({
    mutationFn: (action: "save" | "reset") => action === "reset" ? resetModelSettings() : saveModelSettings({ completion_url: url, model, ...(key.trim() ? { api_key: key } : {}) }),
    onSuccess: async (result) => { setKey(""); setUrl(null); setModel(null); client.setQueryData(QUERY_KEY, result); await Promise.all([client.invalidateQueries({ queryKey: QUERY_KEY }), client.invalidateQueries({ queryKey: agentUi.statusQuery })]); },
  });
  function clearFeedback() { setValidation(null); mutation.reset(); }
  return <form className="flex flex-col gap-5" onSubmit={(event) => {
    event.preventDefault();
    const parsed = ModelSettingsUpdateSchema.safeParse({ completion_url: url, model, ...(key.trim() ? { api_key: key } : {}) });
    if (!parsed.success) { setValidation(COPY.failed); return; }
    setValidation(null); mutation.mutate("save");
  }}>
    <p className="text-sm text-muted-foreground">{t(COPY[settings.source])}</p>
    <FieldGroup>
      <Field><FieldLabel htmlFor={FIELDS.url}>{t(COPY.url)}</FieldLabel><Input id={FIELDS.url} type="url" required value={url} placeholder={COPY.urlPlaceholder} disabled={mutation.isPending} onChange={(event) => { setUrl(event.target.value); clearFeedback(); }} /><FieldDescription>{t(COPY.urlHint)}</FieldDescription></Field>
      <Field><FieldLabel htmlFor={FIELDS.model}>{t(COPY.model)}</FieldLabel><Input id={FIELDS.model} required value={model} placeholder={t(COPY.modelPlaceholder)} disabled={mutation.isPending} onChange={(event) => { setModel(event.target.value); clearFeedback(); }} /><FieldDescription>{t(COPY.modelHint)}</FieldDescription></Field>
      <Field><FieldLabel htmlFor={FIELDS.key}>{t(COPY.key)}</FieldLabel><Input id={FIELDS.key} type="password" autoComplete="new-password" required={!personalKey} value={key} placeholder={t(personalKey ? COPY.savedKeyPlaceholder : COPY.keyPlaceholder)} disabled={mutation.isPending} onChange={(event) => { setKey(event.target.value); clearFeedback(); }} /><FieldDescription>{t(COPY.keyHint)}</FieldDescription></Field>
    </FieldGroup>
    <WorkspaceError error={mutation.error} />
    {validation && <p role="alert" className="text-sm text-destructive">{t(validation)}</p>}
    <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={mutation.isPending}>{t(mutation.isPending ? COPY.saving : COPY.save)}</Button>{personalKey && <Button type="button" variant="ghost" title={t(COPY.resetHint)} disabled={mutation.isPending} onClick={() => { setValidation(null); mutation.mutate("reset"); }}>{t(COPY.reset)}</Button>}</div>
    <span role="status" className="text-sm text-muted-foreground">{mutation.isSuccess ? t(mutation.variables === "reset" ? COPY.resetSaved : COPY.saved) : null}</span>
  </form>;
}
export function ModelSettings() {
  const t = useCopy();
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: fetchModelSettings });
  return <Card><CardHeader><CardTitle>{t(COPY.title)}</CardTitle><CardDescription>{t(COPY.description)}</CardDescription></CardHeader><CardContent>
    <WorkspaceError error={query.error} retry={() => { void query.refetch(); }} />
    {query.isPending ? <WorkspaceLoading /> : query.data && <ModelForm settings={query.data} />}
  </CardContent></Card>;
}
