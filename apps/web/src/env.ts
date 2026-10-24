import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";
import { MIN_TEXT_LENGTH } from "shared";

export const env = createEnv({
  server: {},
  client: {
    NEXT_PUBLIC_API_URL: z.string().min(MIN_TEXT_LENGTH),
  },
  runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
});
