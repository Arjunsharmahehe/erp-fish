"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { env } from "@/env";
import { API_PATHS, LABEL_SEPARATOR, MemoryEntrySchema, SPACE, type MemoryEntry } from "shared";

const PAGE_TITLE = "Memory" as const;
const PAGE_DESCRIPTION = "Learned answers per ERP host" as const;
const HOST_LABEL = "ERP host" as const;
const LOAD_BUTTON = "Load" as const;
const COUNT_LABEL = "Learned count" as const;
const LOADING_LABEL = "Loading…" as const;
const QUERY_HOST_PARAM = "erp_host" as const;

export default function Page() {
  const [host, setHost] = useState<string>(env.NEXT_PUBLIC_ERP_HOST);
  const [entries, setEntries] = useState<MemoryEntry[] | null>(null);

  async function load(): Promise<void> {
    setEntries(null);
    try {
      const res = await fetch(
        `${env.NEXT_PUBLIC_API_URL}${API_PATHS.memory}?${QUERY_HOST_PARAM}=${encodeURIComponent(host)}`,
      );
      if (!res.ok) {
        return;
      }
      const json: unknown = await res.json();
      if (Array.isArray(json)) {
        setEntries(json.map((entry) => MemoryEntrySchema.parse(entry)));
      }
    } catch {
      setEntries(null);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <Card>
        <CardHeader>
          <CardTitle>{PAGE_TITLE}</CardTitle>
          <CardDescription>{PAGE_DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>{HOST_LABEL}</Label>
          <Input
            value={host}
            onChange={(event) => {
              setHost(event.target.value);
            }}
          />
          <Button
            onClick={() => {
              void load();
            }}
          >
            {LOAD_BUTTON}
          </Button>
          {entries === null ? <p>{LOADING_LABEL}</p> : <MemoryEntries entries={entries} />}
        </CardContent>
      </Card>
    </main>
  );
}

function MemoryEntries({ entries }: { entries: MemoryEntry[] }) {
  return (
    <>
      <p>
        {COUNT_LABEL}
        {LABEL_SEPARATOR}
        {entries.length}
      </p>
      <ul>
        {entries.map((entry) => (
          <li key={[entry.erp_host, entry.q_norm].join(SPACE)}>
            {entry.q_norm}
            {LABEL_SEPARATOR}
            {entry.answer}
          </li>
        ))}
      </ul>
    </>
  );
}
