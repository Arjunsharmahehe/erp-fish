import { SettingsIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PLAN_COPY } from "@/lib/plan-config";

export default function Page() {
  return <Empty><EmptyHeader><EmptyMedia variant="icon"><SettingsIcon /></EmptyMedia><EmptyTitle>{PLAN_COPY.settings}</EmptyTitle><EmptyDescription>{PLAN_COPY.settingsLater}</EmptyDescription></EmptyHeader></Empty>;
}
