import { BrainIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PLAN_COPY } from "@/lib/plan-config";

export default function Page() {
  return <Empty><EmptyHeader><EmptyMedia variant="icon"><BrainIcon /></EmptyMedia><EmptyTitle>{PLAN_COPY.memory}</EmptyTitle><EmptyDescription>{PLAN_COPY.memoryLater}</EmptyDescription></EmptyHeader></Empty>;
}
