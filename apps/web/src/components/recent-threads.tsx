"use client";
import { useCopy } from "@/hooks/use-copy";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveIcon, ArrowLeftIcon, MessageSquareIcon, PinIcon } from "lucide-react";
import { type ThreadUpdate, type ChatThread } from "shared";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { DeleteThreadDialog, RenameThreadDialog, ThreadActions, type ThreadDialogTarget } from "@/components/thread-actions";
import { deleteThread, listThreads, updateThread } from "@/lib/plan-api";
import { HOME_COPY, HOME_KEYS, HOME_QUERY } from "@/lib/home-config";
import { PLAN_API, PLAN_ROUTES, THREADS_QUERY_KEY } from "@/lib/plan-config";
import { THREAD_ACTION, THREAD_COPY } from "@/lib/thread-config";

type ThreadChange = { id: string; update: ThreadUpdate } | { id: string; delete: true };

function compareThreads(left: ChatThread, right: ChatThread) {
  const pinned = Number(right.pinned) - Number(left.pinned);
  return pinned === HOME_KEYS.first ? right.created_at.localeCompare(left.created_at) : pinned;
}

function useThreadManagement() {
  const threads = useQuery({ queryKey: THREADS_QUERY_KEY, queryFn: listThreads });
  const client = useQueryClient();
  const router = useRouter();
  const selected = useSearchParams().get(HOME_QUERY.thread);
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [archived, setArchived] = useState(false);
  const [target, setTarget] = useState<ThreadDialogTarget | null>(null);
  const mutation = useMutation({
    mutationFn: async (change: ThreadChange) => {
      if ("delete" in change) { await deleteThread(change.id); return null; }
      return updateThread(change.id, change.update);
    },
    onSuccess: async (result, change) => {
      await client.cancelQueries({ queryKey: THREADS_QUERY_KEY });
      client.setQueryData<Awaited<ReturnType<typeof listThreads>>>(THREADS_QUERY_KEY, (current) =>
        result ? current?.map((thread) => thread.id === change.id ? result : thread) : current?.filter((thread) => thread.id !== change.id));
      if ("delete" in change) {
        await client.cancelQueries({ queryKey: [PLAN_API.threads, change.id] });
        client.removeQueries({ queryKey: [PLAN_API.threads, change.id] });
      }
      if (selected === change.id && ("delete" in change || change.update.archived)) router.replace(PLAN_ROUTES.home);
      setTarget(null);
      void client.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
    },
  });
  const visible = threads.data?.filter((thread) => thread.archived === archived)
    .sort(compareThreads);
  const error = mutation.error ? (mutation.error instanceof Error ? mutation.error.message : THREAD_COPY.failed) : null;
  function openDialog(next: ThreadDialogTarget) { mutation.reset(); setTarget(next); }
  function closeDialog() { setTarget(null); mutation.reset(); }
  return { threads, selected, pathname, setOpenMobile, archived, setArchived, target, mutation, visible, error, openDialog, closeDialog };
}

type ThreadState = ReturnType<typeof useThreadManagement>;

function ThreadList({ state }: { state: ThreadState }) {
  const t = useCopy();
  const { threads, visible, archived, pathname, selected, setOpenMobile, mutation, openDialog } = state;
  if (threads.isPending) return <Skeleton className="h-8 w-full" />;
  if (visible?.length === HOME_KEYS.first) return <p className="px-2 py-3 text-xs leading-relaxed text-muted-foreground">{archived ? t(THREAD_COPY.noArchived) : t(HOME_COPY.noThreads)}</p>;
  return <SidebarMenu>{visible?.map((thread) => <SidebarMenuItem key={thread.id}>
    <SidebarMenuButton isActive={pathname === PLAN_ROUTES.home && selected === thread.id} onClick={() => { setOpenMobile(false); }} render={<Link href={{ pathname: PLAN_ROUTES.home, query: { [HOME_QUERY.thread]: thread.id } }} />}>
      {thread.pinned ? <PinIcon aria-label={t(THREAD_COPY.pinned)} /> : <MessageSquareIcon />}<span>{thread.title}</span>
    </SidebarMenuButton>
    <ThreadActions thread={thread} pending={mutation.isPending} onDialog={openDialog} onUpdate={(update) => { mutation.mutate({ id: thread.id, update }); }} />
  </SidebarMenuItem>)}</SidebarMenu>;
}

function ThreadDialog({ state }: { state: ThreadState }) {
  const { target, mutation, error, closeDialog } = state;
  if (!target) return null;
  if (target.action === THREAD_ACTION.rename) return <RenameThreadDialog key={target.thread.id} thread={target.thread} pending={mutation.isPending} error={error} onClose={closeDialog} onSave={(title) => { mutation.mutate({ id: target.thread.id, update: { title } }); }} />;
  return <DeleteThreadDialog thread={target.thread} pending={mutation.isPending} error={error} onClose={closeDialog} onDelete={() => { mutation.mutate({ id: target.thread.id, delete: true }); }} />;
}

export function RecentThreads() {
  const t = useCopy();
  const state = useThreadManagement();
  const { archived, setArchived, error, target, mutation } = state;
  return <SidebarGroup>
    <SidebarGroupLabel>{archived ? t(THREAD_COPY.archived) : t(HOME_COPY.recent)}</SidebarGroupLabel>
    <SidebarGroupContent>
      {state.threads.isError && <div className="flex flex-col items-start gap-2 px-2 py-3"><p className="text-xs text-muted-foreground">{t(HOME_COPY.threadError)}</p><Button size="sm" variant="outline" onClick={() => { void state.threads.refetch(); }}>{t(HOME_COPY.retry)}</Button></div>}
      {error && !target && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <ThreadList state={state} />
      <Button variant="ghost" size="sm" disabled={mutation.isPending} className="mt-3 w-full justify-start" onClick={() => { setArchived(!archived); mutation.reset(); }}>
        {archived ? <ArrowLeftIcon data-icon="inline-start" /> : <ArchiveIcon data-icon="inline-start" />}{archived ? t(THREAD_COPY.recent) : t(THREAD_COPY.archived)}
      </Button>
    </SidebarGroupContent>
    <ThreadDialog state={state} />
  </SidebarGroup>;
}
