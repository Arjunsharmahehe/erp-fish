"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { type ConnectionState } from "shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { WorkspaceError, WorkspaceLoading } from "@/components/workspace-feedback";
import { fetchConnection, prepareConnection, refreshConnection, saveConnection } from "@/lib/workspace-api";
import { WORKSPACE_COPY as COPY, WORKSPACE_FIELDS as FIELDS, WORKSPACE_LINKS as LINKS, WORKSPACE_QUERY } from "@/lib/workspace-config";

function ErpAddress({ connection }: { connection: ConnectionState }) {
  const client = useQueryClient();
  const router = useRouter();
  const [host, setHost] = useState(connection.erp_host ?? "");
  const mutation = useMutation({
    mutationFn: () => saveConnection(host.trim()),
    onSuccess: async (value) => {
      setHost(value.erp_host ?? "");
      client.setQueryData(WORKSPACE_QUERY.settings, value);
      await client.invalidateQueries({ queryKey: WORKSPACE_QUERY.memory });
      await client.invalidateQueries({ queryKey: [WORKSPACE_QUERY.questions] });
      router.refresh();
    },
  });
  return <Card><CardHeader><CardTitle>{COPY.connection}</CardTitle><CardDescription>{COPY.connectionDescription}</CardDescription></CardHeader><CardContent>
    <form className="flex flex-col gap-5" onSubmit={(event) => { event.preventDefault(); if (!mutation.isPending) mutation.mutate(); }}>
      <Field><FieldLabel htmlFor={FIELDS.host}>{COPY.erpUrl}</FieldLabel><Input id={FIELDS.host} type="url" required disabled={mutation.isPending} value={host} placeholder={COPY.erpPlaceholder} onChange={(event) => { setHost(event.target.value); mutation.reset(); }} /><FieldDescription>{COPY.erpHint}</FieldDescription></Field>
      <WorkspaceError error={mutation.error} />
      <div className="flex items-center gap-4"><Button type="submit" disabled={mutation.isPending || !host.trim()}>{mutation.isPending ? COPY.saving : COPY.save}</Button><span role="status" className="text-sm text-muted-foreground">{mutation.isSuccess ? COPY.saved : null}</span></div>
    </form>
  </CardContent></Card>;
}
function ErpLogin({ connection }: { connection: ConnectionState }) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (action: "prepare" | "refresh") => action === "prepare" ? prepareConnection() : refreshConnection(),
    onSuccess: (value) => { client.setQueryData(WORKSPACE_QUERY.settings, value); },
  });
  return <Card><CardHeader><CardTitle>{COPY.login}</CardTitle><CardDescription>{COPY.loginDescription}</CardDescription></CardHeader><CardContent><div className="flex flex-col gap-5">
    {!connection.provider_configured && <p className="text-sm text-muted-foreground">{COPY.noProvider}</p>}
    <Badge variant="outline">{connection.session_saved ? COPY.sessionSaved : COPY.sessionMissing}</Badge>
    {connection.session_saved && <p className="text-xs text-muted-foreground">{COPY.verifiedHint}</p>}
    {connection.profile_name && <div className="flex flex-col gap-3"><p className="text-sm leading-relaxed text-muted-foreground">{COPY.setupInstructions}</p><Field><FieldLabel>{COPY.profile}</FieldLabel><p className="break-all text-sm">{connection.profile_name}</p></Field></div>}
    <div className="flex flex-wrap gap-3">
      {!connection.profile_id ? <Button disabled={!connection.provider_configured || mutation.isPending} onClick={() => { mutation.mutate("prepare"); }}>{mutation.isPending ? COPY.preparing : COPY.reconnect}</Button> : <>
        <a className={buttonVariants({ variant: "default" })} href={LINKS.tinyfish} target={LINKS.target} rel={LINKS.rel}>{COPY.reopen}<ExternalLinkIcon data-icon="inline-end" /></a>
        <Button variant="outline" disabled={mutation.isPending} onClick={() => { mutation.mutate("refresh"); }}><RefreshCwIcon data-icon="inline-start" />{mutation.isPending ? COPY.checking : COPY.check}</Button>
      </>}
    </div>
    <WorkspaceError error={mutation.error} /><span role="status" className="sr-only">{mutation.isSuccess ? COPY.saved : null}</span>
  </div></CardContent></Card>;
}
export function SettingsPage() {
  const query = useQuery({ queryKey: WORKSPACE_QUERY.settings, queryFn: fetchConnection });
  return <main className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
    <header className="flex flex-col gap-3"><h1 className="text-2xl font-semibold tracking-tight">{COPY.settingsTitle}</h1><p className="text-muted-foreground">{COPY.settingsIntro}</p></header>
    <WorkspaceError error={query.error} retry={() => { void query.refetch(); }} />
    {query.isPending ? <WorkspaceLoading /> : query.data && <>
      <ErpAddress connection={query.data} /><ErpLogin connection={query.data} />
      <Card><CardHeader><CardTitle>{COPY.vault}</CardTitle><CardDescription>{COPY.vaultDescription}</CardDescription></CardHeader><CardContent><div className="flex flex-col items-start gap-4">
        <Badge variant="outline">{query.data.vault_available ? COPY.vaultReady : COPY.vaultMissing}</Badge>
        <a className={buttonVariants({ variant: "outline" })} href={LINKS.vaultGuide} target={LINKS.target} rel={LINKS.rel}>{COPY.vaultGuide}<ExternalLinkIcon data-icon="inline-end" /></a>
        <p className="text-xs leading-relaxed text-muted-foreground">{COPY.privacy}</p>
      </div></CardContent></Card>
    </>}
  </div></main>;
}
