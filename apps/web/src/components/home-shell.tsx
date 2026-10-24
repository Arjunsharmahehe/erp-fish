"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { MessageSquareIcon, BrainIcon, SettingsIcon, PlusIcon, LogOutIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { VaultBadge } from "@/components/VaultBadge";
import { listThreads, logout } from "@/lib/plan-api";
import { PLAN_COPY, PLAN_ROUTES, THREADS_QUERY_KEY } from "@/lib/plan-config";

function AppNavigation() {
  return <SidebarGroup><SidebarGroupContent><SidebarMenu>
    <SidebarMenuItem><SidebarMenuButton render={<Link href={PLAN_ROUTES.home} />}><MessageSquareIcon />{PLAN_COPY.chat}</SidebarMenuButton></SidebarMenuItem>
    <SidebarMenuItem><SidebarMenuButton render={<Link href={PLAN_ROUTES.memory} />}><BrainIcon />{PLAN_COPY.memory}</SidebarMenuButton></SidebarMenuItem>
    <SidebarMenuItem><SidebarMenuButton render={<Link href={PLAN_ROUTES.settings} />}><SettingsIcon />{PLAN_COPY.settings}</SidebarMenuButton></SidebarMenuItem>
  </SidebarMenu></SidebarGroupContent></SidebarGroup>;
}

function RecentThreads() {
  const threads = useQuery({ queryKey: THREADS_QUERY_KEY, queryFn: listThreads });
  return <SidebarGroup>
    <SidebarGroupLabel>{PLAN_COPY.recent}</SidebarGroupLabel>
    <SidebarGroupContent>
      {threads.isPending && <Skeleton className="h-8 w-full" />}
      {threads.data?.length === 0 && <p className="px-2 text-xs text-muted-foreground">{PLAN_COPY.noThreads}</p>}
      <SidebarMenu>{threads.data?.map((thread) => (
        <SidebarMenuItem key={thread.id}><SidebarMenuButton render={<Link href={{ pathname: PLAN_ROUTES.home, query: { thread: thread.id } }} />}>{thread.title}</SidebarMenuButton></SidebarMenuItem>
      ))}</SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>;
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function signOut() {
    try {
      await logout();
      router.replace(PLAN_ROUTES.login);
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : PLAN_COPY.authError);
    }
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <Sidebar>
        <SidebarHeader>
          <Link href={PLAN_ROUTES.home} className="px-2 py-2 text-lg font-semibold tracking-tight">{PLAN_COPY.product}</Link>
          <Button variant="outline" nativeButton={false} render={<Link href={PLAN_ROUTES.home} />}>
            <PlusIcon data-icon="inline-start" />{PLAN_COPY.newChat}
          </Button>
        </SidebarHeader>
        <SidebarContent><AppNavigation /></SidebarContent>
        <SidebarFooter>
          <RecentThreads />
          {logoutError && <Alert variant="destructive"><AlertDescription>{logoutError}</AlertDescription></Alert>}
          <Button variant="ghost" onClick={() => void signOut()}><LogOutIcon data-icon="inline-start" />{PLAN_COPY.logout}</Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="h-svh min-h-0 min-w-0 overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <SidebarTrigger />
          <VaultBadge />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

export function HomeShell({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}><ShellContent>{children}</ShellContent></QueryClientProvider>;
}
