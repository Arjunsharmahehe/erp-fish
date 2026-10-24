import { HomeShell } from "@/components/home-shell";

export default function Layout({ children }: LayoutProps<"/home">) {
  return <HomeShell>{children}</HomeShell>;
}
