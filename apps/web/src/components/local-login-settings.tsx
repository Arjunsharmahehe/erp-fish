"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ConnectionState } from "shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Field, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { WorkspaceError } from "./workspace-feedback";
import { saveErpCredentials, removeErpCredentials } from "@/lib/workspace-api";
import { WORKSPACE_QUERY } from "@/lib/workspace-config";
import { agentUi as COPY } from "@/lib/agent-ui";
import { browserUi as LOCAL } from "@/lib/browser-ui";
import { useCopy } from "@/hooks/use-copy";

export function LocalLoginSettings({ connection }: { connection: ConnectionState }) {
  const t = useCopy(); const client = useQueryClient();
  const [username, setUsername] = useState<string>(LOCAL.empty); const [password, setPassword] = useState<string>(LOCAL.empty);
  const mutation = useMutation({ mutationFn: (remove: boolean) => remove ? removeErpCredentials() : saveErpCredentials({ username, password }), onSuccess: async (value) => {
    setPassword(LOCAL.empty); setUsername(LOCAL.empty); client.setQueryData(WORKSPACE_QUERY.settings, value);
    await client.invalidateQueries({ queryKey: WORKSPACE_QUERY.settings }); await client.invalidateQueries({ queryKey: COPY.statusQuery });
  } });
  return <Card><CardHeader><CardTitle>{t(LOCAL.loginTitle)}</CardTitle><CardDescription>{t(LOCAL.loginHint)}</CardDescription></CardHeader><CardContent>
    <form className="flex flex-col gap-5" onSubmit={(event) => { event.preventDefault(); if (!mutation.isPending && username.trim() && password) mutation.mutate(false); }}>
      <Badge variant="outline">{t(connection.credentials_saved ? COPY.savedLogin : COPY.noLogin)}</Badge>
      <FieldGroup><Field><FieldLabel htmlFor={LOCAL.usernameId}>{t(COPY.username)}</FieldLabel><Input id={LOCAL.usernameId} autoComplete="off" value={username} onChange={(event) => { setUsername(event.target.value); }} disabled={mutation.isPending || !connection.erp_host} /></Field>
        <Field><FieldLabel htmlFor={LOCAL.passwordId}>{t(COPY.password)}</FieldLabel><Input id={LOCAL.passwordId} type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); }} disabled={mutation.isPending || !connection.erp_host} /></Field></FieldGroup>
      <WorkspaceError error={mutation.error} />
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={mutation.isPending || !connection.erp_host || !username.trim() || !password}>{t(mutation.isPending ? COPY.saving : COPY.saveLogin)}</Button>
        {connection.credentials_saved && <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => { mutation.mutate(true); }}>{t(COPY.removeLogin)}</Button>}</div>
    </form>
  </CardContent></Card>;
}
