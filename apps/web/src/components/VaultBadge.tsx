"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { env } from "@/env";
import { API_PATHS, LABEL_SEPARATOR, ProfileStatusSchema, VAULT_CONNECTED } from "shared";

const VAULT_LABEL = "Vault" as const;
const CONNECTED_LABEL = "connected" as const;
const NOT_CONFIGURED_LABEL = "not configured" as const;
const UNKNOWN_LABEL = "unknown" as const;

type VaultState = typeof CONNECTED_LABEL | typeof NOT_CONFIGURED_LABEL | typeof UNKNOWN_LABEL;

export function VaultBadge() {
  const [state, setState] = useState<VaultState>(UNKNOWN_LABEL);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${API_PATHS.profilesStatus}`);
        if (!res.ok) {
          return;
        }
        const parsed = ProfileStatusSchema.parse(await res.json());
        if (!cancelled) {
          setState(parsed.vault === VAULT_CONNECTED ? CONNECTED_LABEL : NOT_CONFIGURED_LABEL);
        }
      } catch {
        if (!cancelled) {
          setState(UNKNOWN_LABEL);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Badge>
      {VAULT_LABEL}
      {LABEL_SEPARATOR}
      {state}
    </Badge>
  );
}
