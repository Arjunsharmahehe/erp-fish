import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { HelloResponseSchema } from "shared";

const PAGE_TITLE = "erp-fish" as const;
const PAGE_DESCRIPTION = "API round-trip status" as const;
const STATUS_LABEL = "Hello response" as const;
const SEPARATOR = ": " as const;
const API_ERROR_MESSAGE = "API hello request failed" as const;

export default async function Home() {
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
            {SEPARATOR}
            {message}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
