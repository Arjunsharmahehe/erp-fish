"use client";
import { useCopy } from "@/hooks/use-copy";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { fetchConnection } from "@/lib/workspace-api";
import { WORKSPACE_QUERY } from "@/lib/workspace-config";
import { agentUi as COPY } from "@/lib/agent-ui";
import { BROWSER } from "shared";
import { fetchBrowserSettings } from "@/lib/browser-api";
import { browserUi } from "@/lib/browser-ui";
const LABEL = { title: "ERP · ", unknown: "status unavailable", loading: "checking…" };
export function VaultBadge() {
  const t = useCopy();
  const query = useQuery({ queryKey: WORKSPACE_QUERY.settings, queryFn: fetchConnection });
  const browser = useQuery({ queryKey: [browserUi.query], queryFn: fetchBrowserSettings });
  const local = browser.data?.provider === BROWSER.local;
  const ready = local ? COPY.savedLogin : COPY.vaultReady;
  const needed = local ? COPY.noLogin : COPY.vaultNeeded;
  const status = query.data?.vault_available ? ready : needed;
  return <Badge variant="outline">{LABEL.title}{t(query.isPending || browser.isPending ? LABEL.loading : query.isError || browser.isError ? LABEL.unknown : status)}</Badge>;
}
