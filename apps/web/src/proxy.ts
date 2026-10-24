import { NextResponse, type NextRequest } from "next/server";
import { SessionUserSchema } from "@/lib/plan-api";
import { env } from "@/env";
import { PLAN_API, PLAN_HTTP, PLAN_ROUTES } from "@/lib/plan-config";

async function sessionUser(request: NextRequest) {
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${PLAN_API.me}`, {
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
    return request.nextUrl.pathname === PLAN_ROUTES.landing
      ? NextResponse.next()
      : NextResponse.redirect(new URL(PLAN_ROUTES.login, request.url));
  }
  if (request.nextUrl.pathname === PLAN_ROUTES.landing) {
    return NextResponse.redirect(new URL(user.erp_host ? PLAN_ROUTES.home : PLAN_ROUTES.onboarding, request.url));
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
  matcher: ["/", "/home/:path*", "/onboarding"],
};
