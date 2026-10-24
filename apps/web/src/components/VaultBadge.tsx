"use client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { fetchConnection } from "@/lib/workspace-api";
import { WORKSPACE_QUERY } from "@/lib/workspace-config";
const LABEL = { title: "Vault · ", connected: "available", missing: "not configured", unknown: "status unavailable", loading: "checking…" };
export function VaultBadge() {
  const query = useQuery({ queryKey: WORKSPACE_QUERY.settings, queryFn: fetchConnection });
  const status = query.data?.vault_available ? LABEL.connected : LABEL.missing;
  return <Badge variant="outline">{LABEL.title}{query.isPending ? LABEL.loading : query.isError ? LABEL.unknown : status}</Badge>;
}
