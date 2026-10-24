import { redirect } from "next/navigation";
import { PLAN_ROUTES } from "@/lib/plan-config";
export default function Page() { return redirect(PLAN_ROUTES.home); }
