"use client";
import { ModelSettings } from "./model-settings";
import { AccountSettings } from "./account-settings";
import { useCopy } from "@/hooks/use-copy";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrowserSettings } from "./browser-settings";
import { agentUi as AGENT_UI } from "@/lib/agent-ui";
import { type ConnectionState } from "shared";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { WorkspaceError, WorkspaceLoading } from "@/components/workspace-feedback";
import { fetchConnection, saveConnection } from "@/lib/workspace-api";
import { WORKSPACE_COPY as COPY, WORKSPACE_FIELDS as FIELDS, WORKSPACE_QUERY } from "@/lib/workspace-config";

function ErpAddress({ connection }: { connection: ConnectionState }) {
  const t = useCopy();
  const client = useQueryClient();
  const router = useRouter();
  const [host, setHost] = useState(connection.erp_host ?? "");
  const mutation = useMutation({
    mutationFn: () => saveConnection(host.trim()),
    onSuccess: async (value) => {
      setHost(value.erp_host ?? "");
      client.setQueryData(WORKSPACE_QUERY.settings, value);
      await client.invalidateQueries({ queryKey: WORKSPACE_QUERY.memory });
      await client.invalidateQueries({ queryKey: AGENT_UI.statusQuery });
      await client.invalidateQueries({ queryKey: [WORKSPACE_QUERY.questions] });
      router.refresh();
    },
  });
  return <Card><CardHeader><CardTitle>{t(COPY.connection)}</CardTitle><CardDescription>{t(COPY.connectionDescription)}</CardDescription></CardHeader><CardContent>
    <form className="flex flex-col gap-5" onSubmit={(event) => { event.preventDefault(); if (!mutation.isPending) mutation.mutate(); }}>
      <Field><FieldLabel htmlFor={FIELDS.host}>{t(COPY.erpUrl)}</FieldLabel><Input id={FIELDS.host} type="url" required disabled={mutation.isPending} value={host} placeholder={t(COPY.erpPlaceholder)} onChange={(event) => { setHost(event.target.value); mutation.reset(); }} /><FieldDescription>{t(COPY.erpHint)}</FieldDescription></Field>
      <WorkspaceError error={mutation.error} />
      <div className="flex items-center gap-4"><Button type="submit" disabled={mutation.isPending || !host.trim()}>{mutation.isPending ? t(COPY.saving) : t(COPY.save)}</Button><span role="status" className="text-sm text-muted-foreground">{mutation.isSuccess ? t(COPY.saved) : null}</span></div>
    </form>
  </CardContent></Card>;
}
export function SettingsPage() {
  const t = useCopy();
  const query = useQuery({ queryKey: WORKSPACE_QUERY.settings, queryFn: fetchConnection });
  return <main className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
    <header className="flex flex-col gap-3"><h1 className="text-2xl font-semibold tracking-tight">{t(COPY.settingsTitle)}</h1><p className="text-muted-foreground">{t(COPY.settingsIntro)}</p></header>
    <AccountSettings />
    <WorkspaceError error={query.error} retry={() => { void query.refetch(); }} />
    <ModelSettings />
    {query.isPending ? <WorkspaceLoading /> : query.data && <>
      <ErpAddress connection={query.data} /><BrowserSettings key={query.data.erp_host} connection={query.data} />
    </>}
  </div></main>;
}
