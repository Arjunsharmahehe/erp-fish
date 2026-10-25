import { NextResponse, type NextRequest } from "next/server";
import { SessionUserSchema } from "shared";
import { env } from "@/env";
import { PLAN_API, PLAN_HTTP, PLAN_ROUTES } from "@/lib/plan-config";

async function sessionUser(request: NextRequest) {
  try {
    const response = await fetch(`${env.API_INTERNAL_URL ?? env.NEXT_PUBLIC_API_URL}${PLAN_API.me}`, {
      headers: { [PLAN_HTTP.cookie]: request.headers.get(PLAN_HTTP.cookie) ?? "" },
      cache: PLAN_HTTP.noStore,
    });
    if (response.ok) {
      return SessionUserSchema.parse(await response.json());
    }
    return null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const user = await sessionUser(request);
  if (!user) {
    return NextResponse.redirect(new URL(PLAN_ROUTES.login, request.url));
  }
  if (!user.erp_host && request.nextUrl.pathname !== PLAN_ROUTES.onboarding) {
    return NextResponse.redirect(new URL(PLAN_ROUTES.onboarding, request.url));
  }
  if (user.erp_host && request.nextUrl.pathname === PLAN_ROUTES.onboarding) {
    return NextResponse.redirect(new URL(PLAN_ROUTES.home, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/home/:path*", "/onboarding"],
};
