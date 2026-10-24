import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingPage } from "@/components/landing-page";
import { LANDING_COPY } from "@/lib/landing-config";
import { landingSession } from "@/lib/landing-session";

export const metadata: Metadata = {
  title: LANDING_COPY.title,
  description: LANDING_COPY.description,
};

async function SessionLanding() {
  return <LandingPage showAuth={await landingSession() === "guest"} />;
}

export default function Page() {
  return <Suspense fallback={<LandingPage showAuth={false} />}><SessionLanding /></Suspense>;
}
