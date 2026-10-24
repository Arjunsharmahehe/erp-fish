import { hc } from "hono/client";
import type { AppType } from "api";
import { env } from "@/env";

const API_REQUEST_OPTIONS = Object.freeze({ credentials: "include" satisfies RequestCredentials, cache: "no-store" satisfies RequestCache });
export const api = hc<AppType>(env.NEXT_PUBLIC_API_URL, { init: API_REQUEST_OPTIONS });
