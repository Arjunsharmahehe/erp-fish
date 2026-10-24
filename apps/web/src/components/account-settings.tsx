"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceError } from "@/components/workspace-feedback";
import { useCopy } from "@/hooks/use-copy";
import { fetchAccount } from "@/lib/workspace-api";
import { WORKSPACE_COPY as COPY, WORKSPACE_LIMITS, WORKSPACE_QUERY } from "@/lib/workspace-config";

export function AccountSettings() {
  const t = useCopy();
  const query = useQuery({ queryKey: WORKSPACE_QUERY.account, queryFn: fetchAccount, gcTime: WORKSPACE_LIMITS.accountCacheMs });
  return <Card>
    <CardHeader><CardTitle>{t(COPY.accountTitle)}</CardTitle><CardDescription>{t(COPY.accountDescription)}</CardDescription></CardHeader>
    <CardContent>
      <WorkspaceError error={query.error} retry={() => { void query.refetch(); }} />
      {query.isPending && <div role="status" aria-label={t(COPY.loading)}><Skeleton className="h-10 w-full" /></div>}
      {query.data && <dl className="flex flex-col gap-2"><dt className="text-sm text-muted-foreground">{t(COPY.accountEmail)}</dt><dd className="break-all text-sm font-medium" translate="no">{query.data.email}</dd></dl>}
    </CardContent>
  </Card>;
}
