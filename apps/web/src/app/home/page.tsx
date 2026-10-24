import { Suspense } from "react";
import { PlanningChat } from "@/components/planning-chat";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
  return <Suspense fallback={<Skeleton className="m-6 flex-1" />}><PlanningChat /></Suspense>;
}
