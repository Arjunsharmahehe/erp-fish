"use client";
import { useCopy } from "@/hooks/use-copy";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WORKSPACE_COPY } from "@/lib/workspace-config";
export function WorkspaceError({ error, retry }: { error: Error | null; retry?: () => void }) {
  const t = useCopy();
  if (!error) return null;
  return <Alert variant="destructive"><AlertDescription>{t(error.message)}{retry && <Button variant="outline" size="sm" onClick={retry}>{t(WORKSPACE_COPY.retry)}</Button>}</AlertDescription></Alert>;
}
export function WorkspaceLoading() {
  const t = useCopy();
  return <div className="flex flex-col gap-4" role="status" aria-label={t(WORKSPACE_COPY.loading)}><Skeleton className="h-8 w-48" /><Skeleton className="h-36 w-full" /></div>;
}
