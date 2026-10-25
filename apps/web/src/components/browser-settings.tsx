"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BROWSER, type ConnectionState } from "shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Field, FieldContent, FieldDescription, FieldLabel } from "./ui/field";
import { Switch } from "./ui/switch";
import { Alert, AlertDescription } from "./ui/alert";
import { WorkspaceError, WorkspaceLoading } from "./workspace-feedback";
import { ErpLoginSettings } from "./erp-login-settings";
import { LocalLoginSettings } from "./local-login-settings";
import { fetchBrowserSettings, saveBrowserSettings } from "@/lib/browser-api";
import { browserUi as COPY } from "@/lib/browser-ui";
import { agentUi } from "@/lib/agent-ui";
import { WORKSPACE_QUERY } from "@/lib/workspace-config";
import { useCopy } from "@/hooks/use-copy";

export function BrowserSettings({ connection }: { connection: ConnectionState }) {
  const t = useCopy(); const client = useQueryClient();
  const query = useQuery({ queryKey: [COPY.query], queryFn: fetchBrowserSettings });
  const mutation = useMutation({ mutationFn: saveBrowserSettings, onSuccess: async (value) => {
    client.setQueryData([COPY.query], value);
    await Promise.all([client.invalidateQueries({ queryKey: WORKSPACE_QUERY.settings }), client.invalidateQueries({ queryKey: agentUi.statusQuery })]);
  } });
  if (query.isPending) return <WorkspaceLoading />;
  if (!query.data) return <WorkspaceError error={query.error} retry={() => { void query.refetch(); }} />;
  const local = query.data.provider === BROWSER.local;
  return <>
    {query.data.local_allowed && <Card><CardHeader><CardTitle>{t(COPY.title)}</CardTitle><CardDescription>{t(COPY.description)}</CardDescription></CardHeader><CardContent><div className="flex flex-col gap-4">
      <Field orientation="horizontal"><FieldContent><FieldLabel htmlFor={COPY.switchId}>{t(COPY.toggle)}</FieldLabel><FieldDescription>{t(COPY.hint)}</FieldDescription></FieldContent><Switch id={COPY.switchId} checked={local} disabled={query.data.local_forced || mutation.isPending} onCheckedChange={(checked) => { mutation.mutate(checked); }} /></Field>
      {query.data.local_forced && <Alert><AlertDescription>{t(COPY.forced)}</AlertDescription></Alert>}
      {local && <p className="text-sm text-muted-foreground">{t(COPY.cloudHint)}</p>}<WorkspaceError error={mutation.error} />
    </div></CardContent></Card>}
    {local ? <LocalLoginSettings connection={connection} /> : <ErpLoginSettings connection={connection} />}
  </>;
}
