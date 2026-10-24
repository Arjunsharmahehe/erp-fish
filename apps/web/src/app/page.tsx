import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
import { LANDING_COPY } from "@/lib/landing-config";

export const metadata: Metadata = {
  title: LANDING_COPY.title,
  description: LANDING_COPY.description,
};

export default function Page() {
  return <LandingPage />;
}
