import { hc } from "hono/client";
import type { AppType } from "api";
import { env } from "@/env";

export const api = hc<AppType>(env.NEXT_PUBLIC_API_URL);
