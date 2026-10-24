import { AuthForm } from "@/components/auth-form";
import { PLAN_API } from "@/lib/plan-config";

export default function Page() {
  return <AuthForm kind={PLAN_API.signup} />;
}
