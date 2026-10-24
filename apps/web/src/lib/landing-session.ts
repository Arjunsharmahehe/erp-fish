import { cookies } from "next/headers";
import { SessionUserSchema } from "shared";
import { env } from "@/env";
import { PLAN_API, PLAN_HTTP, PLAN_STATUS } from "./plan-config";
const SESSION = { guest: "guest", authenticated: "authenticated", unavailable: "unavailable" };
export async function landingSession() {
  const cookie = (await cookies()).toString();
  if (!cookie) return SESSION.guest;
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${PLAN_API.me}`, { headers: { [PLAN_HTTP.cookie]: cookie }, cache: PLAN_HTTP.noStore });
    if (response.status === PLAN_STATUS.unauthorized) return SESSION.guest;
    if (!response.ok) return SESSION.unavailable;
    return SessionUserSchema.safeParse(await response.json()).success ? SESSION.authenticated : SESSION.unavailable;
  } catch { return SESSION.unavailable; }
}
