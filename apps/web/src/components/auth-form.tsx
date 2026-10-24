"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authenticate } from "@/lib/plan-api";
import { PLAN_API, PLAN_COPY, PLAN_ROUTES } from "@/lib/plan-config";

type AuthKind = typeof PLAN_API.login | typeof PLAN_API.signup;

function AuthSwitch({ isSignup }: { isSignup: boolean }) {
  return <CardFooter><Button nativeButton={false} variant="link" render={<Link href={isSignup ? PLAN_ROUTES.login : PLAN_ROUTES.signup} />}>
    {isSignup ? PLAN_COPY.login : PLAN_COPY.signup}
  </Button></CardFooter>;
}

export function AuthForm({ kind }: { kind: AuthKind }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isSignup = kind === PLAN_API.signup;

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const user = await authenticate({ kind, email, password });
      router.replace(user.erp_host ? PLAN_ROUTES.home : PLAN_ROUTES.onboarding);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : PLAN_COPY.authError);
      setPending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignup ? PLAN_COPY.signup : PLAN_COPY.login}</CardTitle>
          <CardDescription>{PLAN_COPY.pitch}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="auth-email">{PLAN_COPY.email}</FieldLabel>
                <Input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => { setEmail(event.target.value); }} />
              </Field>
              <Field>
                <FieldLabel htmlFor="auth-password">{PLAN_COPY.password}</FieldLabel>
                <Input id="auth-password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} required value={password} onChange={(event) => { setPassword(event.target.value); }} />
              </Field>
            </FieldGroup>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <Button type="submit" disabled={pending}>{pending ? (isSignup ? PLAN_COPY.signingUp : PLAN_COPY.loggingIn) : (isSignup ? PLAN_COPY.signup : PLAN_COPY.login)}</Button>
          </form>
        </CardContent>
        <AuthSwitch isSignup={isSignup} />
      </Card>
    </main>
  );
}
