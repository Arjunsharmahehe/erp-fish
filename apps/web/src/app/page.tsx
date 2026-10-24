import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLAN_COPY, PLAN_ROUTES } from "@/lib/plan-config";

export default function Page() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="flex w-full max-w-xl flex-col items-start gap-6">
        <h1 className="text-5xl font-semibold tracking-tight text-balance">{PLAN_COPY.product}</h1>
        <p className="max-w-prose text-lg text-muted-foreground">{PLAN_COPY.pitch}</p>
        <div className="flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href={PLAN_ROUTES.signup} />}>{PLAN_COPY.signup}</Button>
          <Button nativeButton={false} variant="outline" render={<Link href={PLAN_ROUTES.login} />}>{PLAN_COPY.login}</Button>
        </div>
      </section>
    </main>
  );
}
