import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";
import { DEMO_ERP_HOST, DEMO_PROFILE_ID, MIN_TEXT_LENGTH } from "shared";

export const env = createEnv({
  server: {},
  client: {
    NEXT_PUBLIC_API_URL: z.string().min(MIN_TEXT_LENGTH),
    NEXT_PUBLIC_ERP_HOST: z.string().min(MIN_TEXT_LENGTH).default(DEMO_ERP_HOST),
    NEXT_PUBLIC_PROFILE_ID: z.string().min(MIN_TEXT_LENGTH).default(DEMO_PROFILE_ID),
  },
  runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_ERP_HOST: process.env.NEXT_PUBLIC_ERP_HOST,
    NEXT_PUBLIC_PROFILE_ID: process.env.NEXT_PUBLIC_PROFILE_ID,
  },
});
