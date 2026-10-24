"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { REMOTE_VAULT, type ConnectionState } from "shared";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkspaceError } from "./workspace-feedback";
import { fetchConnection } from "@/lib/workspace-api";
import { WORKSPACE_QUERY } from "@/lib/workspace-config";
import { agentUi as COPY } from "@/lib/agent-ui";
import { useCopy } from "@/hooks/use-copy";

export function ErpLoginSettings({ connection }: { connection: ConnectionState }) {
  const t = useCopy(); const client = useQueryClient();
  const mutation = useMutation({ mutationFn: fetchConnection, onSuccess: async (value) => {
    client.setQueryData(WORKSPACE_QUERY.settings, value);
    await client.invalidateQueries({ queryKey: COPY.statusQuery });
  } });
  return <Card><CardHeader><CardTitle>{t(COPY.vaultTitle)}</CardTitle><CardDescription>{t(COPY.vaultDescription)}</CardDescription></CardHeader><CardContent><div className="flex flex-col items-start gap-3">
    <Badge variant="outline">{t(connection.vault_available ? COPY.vaultReady : COPY.vaultNeeded)}</Badge>
    {connection.vault_label && <p className="text-sm font-medium">{connection.vault_label}</p>}
    <p role="status" className="text-sm text-muted-foreground">{t(connection.vault_message ?? COPY.vaultScoped)}</p>
    {connection.credentials_saved && <p className="text-sm text-muted-foreground">{t(REMOTE_VAULT.localOnly)}</p>}
    <WorkspaceError error={mutation.error} />
  </div></CardContent><CardFooter><div className="flex flex-wrap gap-3">
    <Button nativeButton={false} render={<a href={REMOTE_VAULT.dashboard} target="_blank" rel="noreferrer" aria-label={t(COPY.openVault)} />}>{t(COPY.openVault)}</Button>
    <Button variant="outline" disabled={mutation.isPending || !connection.erp_host} onClick={() => { mutation.mutate(); }}>{t(mutation.isPending ? COPY.checkingVault : COPY.refreshVault)}</Button>
  </div></CardFooter></Card>;
}
