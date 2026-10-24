"use client";
import { useCopy } from "@/hooks/use-copy";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChevronRightIcon, PlusIcon, LogOutIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import { RecentThreads } from "@/components/recent-threads";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelect } from "@/components/language-select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarSeparator, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { VaultBadge } from "@/components/VaultBadge";
import { logout } from "@/lib/plan-api";
import { PLAN_COPY, PLAN_ROUTES } from "@/lib/plan-config";
import { brand } from "@/lib/brand";
import { HOME_COPY, HOME_NAVIGATION, HOME_QUERY } from "@/lib/home-config";

function AppNavigation() {
  const t = useCopy();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  return <SidebarGroup>
    <SidebarGroupLabel>{t(HOME_COPY.workspace)}</SidebarGroupLabel>
    <SidebarGroupContent><SidebarMenu>
      {HOME_NAVIGATION.map((item) => <SidebarMenuItem key={item.href}>
        <SidebarMenuButton isActive={pathname === item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={() => { setOpenMobile(false); }} render={<Link href={item.href} />}>
          <item.icon /><span>{t(item.title)}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>)}
    </SidebarMenu></SidebarGroupContent>
  </SidebarGroup>;
}

function WorkspaceSidebar() {
  const t = useCopy();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  function newConversation() {
    router.push(`${PLAN_ROUTES.home}?${HOME_QUERY.draft}=${crypto.randomUUID()}`);
    setOpenMobile(false);
  }
  return <Sidebar>
    <SidebarHeader><div className="flex flex-col gap-6 px-2 pb-2 pt-3">
      <Link href={PLAN_ROUTES.landing} aria-label={brand.homeLabel} onClick={() => { setOpenMobile(false); }} className="w-fit rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring">
        <BrandLogo className="h-10 w-auto" />
      </Link>
      <Button onClick={newConversation}><PlusIcon data-icon="inline-start" />{t(HOME_COPY.newChat)}</Button>
    </div></SidebarHeader>
    <SidebarContent><div className="flex flex-col gap-5 px-2">
      <AppNavigation />
      <Suspense fallback={<Skeleton className="mx-2 h-8" />}><RecentThreads /></Suspense>
    </div></SidebarContent>
    <WorkspaceFooter />
  </Sidebar>;
}

function WorkspaceFooter() {
  const t = useCopy();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function signOut() {
    try {
      await logout();
      router.replace(PLAN_ROUTES.login);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : PLAN_COPY.authError);
    }
  }
  return <SidebarFooter><div className="flex flex-col gap-3 p-2">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <Button variant="ghost" className="justify-start" onClick={() => { void signOut(); }}><LogOutIcon data-icon="inline-start" />{t(PLAN_COPY.logout)}</Button>
    <SidebarSeparator className="mx-0" />
    <a href={brand.tinyfishUrl} target="_blank" rel="noreferrer" aria-label={t(HOME_COPY.tinyfishLink)} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring">
      <span className="text-xs text-muted-foreground">{t(HOME_COPY.builtWith)}</span>
      <span className="partner-logo-surface"><Image src={brand.tinyfish} alt={brand.tinyfishAlt} width={brand.tinyfishWidth} height={brand.tinyfishHeight} className="h-5 w-auto" /></span>
    </a>
  </div></SidebarFooter>;
}

function WorkspaceHeader() {
  const t = useCopy();
  const pathname = usePathname();
  const title = HOME_NAVIGATION.find((item) => item.href === pathname)?.title ?? t(HOME_COPY.workspace);
  return <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
    <div className="flex min-w-0 items-center gap-3">
      <SidebarTrigger />
      <Link href={PLAN_ROUTES.landing} aria-label={brand.homeLabel} className="flex size-10 shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"><BrandMark className="h-7 w-8" /></Link>
      <span className="hidden text-sm text-muted-foreground md:inline">{t(HOME_COPY.workspace)}</span>
      <ChevronRightIcon className="hidden size-3 text-muted-foreground md:block" aria-hidden="true" />
      <span className="truncate text-sm font-medium">{t(title)}</span>
    </div>
    <div className="flex shrink-0 items-center gap-2"><LanguageSelect /><ThemeToggle /><VaultBadge /></div>
  </header>;
}

export function HomeShell({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>
    <SidebarProvider className="h-svh overflow-hidden">
      <WorkspaceSidebar />
      <SidebarInset className="h-svh min-h-0 min-w-0 overflow-hidden">
        <WorkspaceHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  </QueryClientProvider>;
}
