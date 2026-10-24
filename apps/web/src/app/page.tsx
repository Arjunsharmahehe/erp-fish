import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
import { LANDING_COPY } from "@/lib/landing-config";
import { landingSession } from "@/lib/landing-session";

export const metadata: Metadata = {
  title: LANDING_COPY.title,
  description: LANDING_COPY.description,
};

export default async function Page() {
  return <LandingPage showAuth={await landingSession() === "guest"} />;
}
