"use client";
import { useCopy } from "@/hooks/use-copy";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { fetchConnection } from "@/lib/workspace-api";
import { WORKSPACE_QUERY } from "@/lib/workspace-config";
import { agentUi as COPY } from "@/lib/agent-ui";
const LABEL = { title: "ERP · ", unknown: "status unavailable", loading: "checking…" };
export function VaultBadge() {
  const t = useCopy();
  const query = useQuery({ queryKey: WORKSPACE_QUERY.settings, queryFn: fetchConnection });
  const status = query.data?.vault_available ? COPY.vaultReady : COPY.vaultNeeded;
  return <Badge variant="outline">{LABEL.title}{t(query.isPending ? LABEL.loading : query.isError ? LABEL.unknown : status)}</Badge>;
}
