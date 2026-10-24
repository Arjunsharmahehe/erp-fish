import Image from "next/image";
import Link from "next/link";
import { ArrowDownIcon, ArrowRightIcon } from "lucide-react";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import { LandingPreview } from "@/components/landing-preview";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { brand } from "@/lib/brand";
import { LANDING_COPY, LANDING_QUESTIONS, LANDING_SECTIONS, LANDING_STEPS } from "@/lib/landing-config";
import { PLAN_ROUTES } from "@/lib/plan-config";

function LandingHeader() {
  return <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6 lg:px-8">
    <Link href={PLAN_ROUTES.landing} aria-label={LANDING_COPY.homeLabel} className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"><BrandLogo className="h-10 w-auto" /></Link>
    <nav aria-label={LANDING_COPY.navigation} className="flex items-center gap-2 sm:gap-4">
      <a href={LANDING_SECTIONS.workflowLink} className="hidden rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring md:inline">{LANDING_COPY.how}</a>
      <a href={LANDING_SECTIONS.questionsLink} className="hidden rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring md:inline">{LANDING_COPY.questions}</a>
      <Button variant="ghost" nativeButton={false} render={<Link href={PLAN_ROUTES.login} />}>{LANDING_COPY.login}</Button>
      <div className="hidden sm:block"><Button nativeButton={false} render={<Link href={PLAN_ROUTES.home} />}>{LANDING_COPY.open}<ArrowRightIcon data-icon="inline-end" /></Button></div>
    </nav>
  </header>;
}

function LandingHero() {
  return <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pb-20 pt-10 sm:pt-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pb-28">
    <div className="flex flex-col items-start gap-7">
      <h1 className="max-w-xl text-5xl font-medium leading-tight tracking-tight text-balance sm:text-6xl">{LANDING_COPY.headline}<span className="block text-primary">{LANDING_COPY.headlineAccent}</span></h1>
      <p className="max-w-md text-lg leading-relaxed text-muted-foreground">{LANDING_COPY.intro}</p>
      <div className="flex flex-wrap gap-3">
        <Button size="lg" nativeButton={false} render={<Link href={PLAN_ROUTES.home} />}>{LANDING_COPY.open}<ArrowRightIcon data-icon="inline-end" /></Button>
        <Button size="lg" variant="outline" nativeButton={false} render={<Link href={LANDING_SECTIONS.workflowLink} />}>{LANDING_COPY.how}<ArrowDownIcon data-icon="inline-end" /></Button>
      </div>
      <p className="text-sm text-muted-foreground">{LANDING_COPY.heroNote}</p>
    </div>
    <LandingPreview />
  </section>;
}

function LandingWorkflow() {
  return <section id={LANDING_SECTIONS.workflow} className="scroll-mt-8 bg-sidebar">
    <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6 py-16 sm:py-20 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-16">
        <h2 className="max-w-lg text-3xl font-medium tracking-tight text-balance sm:text-4xl">{LANDING_COPY.workflowTitle}</h2>
        <p className="max-w-md self-end text-base leading-relaxed text-muted-foreground">{LANDING_COPY.workflowIntro}</p>
      </div>
      <ol className="grid gap-10 md:grid-cols-3 md:gap-8">{LANDING_STEPS.map((step) => <li key={step.title} className="flex flex-col items-start gap-4 border-t border-border pt-6">
        <step.icon className="size-6 text-primary" aria-hidden="true" />
        <h3 className="text-lg font-medium">{step.title}</h3>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{step.text}</p>
      </li>)}</ol>
      <Separator />
      <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
        <div className="max-w-xl"><h3 className="text-xl font-medium tracking-tight">{LANDING_COPY.nextTitle}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{LANDING_COPY.nextDescription}</p></div>
        <a href={brand.tinyfishUrl} target="_blank" rel="noreferrer" className="flex w-fit flex-col gap-3 rounded-lg outline-none transition-opacity hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring">
          <span className="text-xs text-muted-foreground">{LANDING_COPY.partnerLabel}</span>
          <Image src={brand.tinyfish} alt={brand.tinyfishAlt} width={brand.tinyfishWidth} height={brand.tinyfishHeight} className="partner-logo h-7 w-auto" />
        </a>
      </div>
    </div>
  </section>;
}

function LandingQuestions() {
  return <section id={LANDING_SECTIONS.questions} className="mx-auto grid max-w-6xl scroll-mt-8 gap-10 px-6 py-16 sm:py-20 lg:grid-cols-3 lg:gap-16 lg:px-8">
    <h2 className="max-w-xs text-3xl font-medium tracking-tight text-balance sm:text-4xl">{LANDING_COPY.faqTitle}</h2>
    <dl className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:col-span-2">{LANDING_QUESTIONS.map((question) => <div key={question.title}><dt className="font-medium">{question.title}</dt><dd className="mt-3 text-sm leading-relaxed text-muted-foreground">{question.answer}</dd></div>)}</dl>
  </section>;
}

function LandingClosing() {
  return <section className="mx-4 flex flex-col items-center gap-6 rounded-2xl bg-secondary px-6 py-16 text-center sm:mx-6 sm:py-20 lg:mx-8">
    <BrandMark className="h-12 w-14" />
    <h2 className="max-w-2xl text-3xl font-medium tracking-tight text-balance sm:text-4xl">{LANDING_COPY.closingTitle}</h2>
    <p className="text-muted-foreground">{LANDING_COPY.closingDescription}</p>
    <Button size="lg" nativeButton={false} render={<Link href={PLAN_ROUTES.home} />}>{LANDING_COPY.open}<ArrowRightIcon data-icon="inline-end" /></Button>
  </section>;
}

export function LandingPage() {
  return <>
    <a href={LANDING_SECTIONS.skipLink} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground">{LANDING_COPY.skip}</a>
    <LandingHeader />
    <main id={LANDING_SECTIONS.main}><LandingHero /><LandingWorkflow /><LandingQuestions /><LandingClosing /></main>
    <footer className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-5 px-6 py-10 sm:flex-row sm:items-center lg:px-8">
      <Link href={PLAN_ROUTES.landing} aria-label={LANDING_COPY.homeLabel} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"><BrandLogo className="h-8 w-auto" /></Link>
      <p className="text-sm text-muted-foreground">{LANDING_COPY.footer}</p>
    </footer>
  </>;
}
