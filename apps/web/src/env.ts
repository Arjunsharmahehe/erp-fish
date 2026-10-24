import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

const MIN_ENV_VALUE_LENGTH = 1 as const;

export const env = createEnv({
  server: {},
  client: {
    NEXT_PUBLIC_API_URL: z.string().min(MIN_ENV_VALUE_LENGTH),
  },
  runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
});
