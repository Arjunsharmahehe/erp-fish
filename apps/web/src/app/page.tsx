import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { HelloResponseSchema, LABEL_SEPARATOR } from "shared";

const PAGE_TITLE = "erp-fish" as const;
const PAGE_DESCRIPTION = "API round-trip status" as const;
const STATUS_LABEL = "Hello response" as const;
const API_ERROR_MESSAGE = "API hello request failed" as const;
const PARSE_LINK_LABEL = "Parse an invoice" as const;
const PARSE_HREF = "/parse" as const;
const MEMORY_LINK_LABEL = "View learned memory" as const;
const MEMORY_HREF = "/memory" as const;
const LOADING_LABEL = "Loading…" as const;

export default function Page() {
  return (
    <Suspense fallback={<p>{LOADING_LABEL}</p>}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const res = await api.api.hello.$get();
  if (!res.ok) {
    throw new Error(API_ERROR_MESSAGE);
  }
  const json: unknown = await res.json();
  const parsed = HelloResponseSchema.parse(json);
  const message: string = parsed.message;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <Card>
        <CardHeader>
          <CardTitle>{PAGE_TITLE}</CardTitle>
          <CardDescription>{PAGE_DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            {STATUS_LABEL}
            {LABEL_SEPARATOR}
            {message}
          </p>
          <p>
            <Link href={PARSE_HREF}>{PARSE_LINK_LABEL}</Link>
          </p>
          <p>
            <Link href={MEMORY_HREF}>{MEMORY_LINK_LABEL}</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
