"use client";
import { useCopy } from "@/hooks/use-copy";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownIcon, ArrowRightIcon, MinusIcon, PlusIcon } from "lucide-react";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import { LandingPreview } from "@/components/landing-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelect } from "@/components/language-select";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { brand } from "@/lib/brand";
import { LANDING_COPY, LANDING_FACTS, LANDING_QUESTIONS, LANDING_SECTIONS, LANDING_STEPS } from "@/lib/landing-config";
import { PLAN_ROUTES } from "@/lib/plan-config";

function WorkspaceLink() {
  const t = useCopy();
  return <Button size="lg" nativeButton={false} render={<Link href={PLAN_ROUTES.home} />}>
    {t(LANDING_COPY.open)}<ArrowRightIcon data-icon="inline-end" />
  </Button>;
}

function LandingHeader({ showAuth }: { showAuth: boolean }) {
  const t = useCopy();
  return <header className="landing-shell landing-header">
    <Link href={PLAN_ROUTES.landing} aria-label={t(LANDING_COPY.homeLabel)} className="landing-brand-link"><BrandLogo className="h-10 w-auto" /></Link>
    <nav aria-label={t(LANDING_COPY.navigation)} className="flex items-center gap-2 sm:gap-5">
      <a href={LANDING_SECTIONS.workflowLink} className="landing-nav-link hidden md:inline">{t(LANDING_COPY.how)}</a>
      <a href={LANDING_SECTIONS.questionsLink} className="landing-nav-link hidden md:inline">{t(LANDING_COPY.questions)}</a>
      <LanguageSelect /><ThemeToggle />
      {showAuth && <Button variant="ghost" nativeButton={false} render={<Link href={PLAN_ROUTES.login} />}>{t(LANDING_COPY.login)}</Button>}
      <div><WorkspaceLink /></div>
    </nav>
  </header>;
}

function LandingHero() {
  const t = useCopy();
  return <section className="landing-shell">
    <div className="landing-grid landing-hero">
      <div className="landing-hero-copy">
        <h1 className="landing-display">{t(LANDING_COPY.headline)}<span>{t(LANDING_COPY.headlineAccent)}</span></h1>
        <p className="landing-hero-intro">{t(LANDING_COPY.intro)}</p>
        <div className="flex flex-wrap gap-3">
          <WorkspaceLink />
          <Button size="lg" variant="outline" nativeButton={false} render={<Link href={LANDING_SECTIONS.workflowLink} />}>{t(LANDING_COPY.how)}<ArrowDownIcon data-icon="inline-end" /></Button>
        </div>
        <p className="landing-note">{t(LANDING_COPY.heroNote)}</p>
      </div>
      <div className="landing-preview-field"><LandingPreview /></div>
    </div>
    <dl className="landing-facts">{LANDING_FACTS.map((fact) => <div key={fact.title}>
      <dt>{t(fact.title)}</dt><dd>{t(fact.description)}</dd>
    </div>)}</dl>
  </section>;
}

function LandingWorkflow() {
  const t = useCopy();
  return <section id={LANDING_SECTIONS.workflow} className="landing-shell landing-section">
    <div className="landing-grid landing-section-heading">
      <h2 className="landing-heading">{t(LANDING_COPY.workflowTitle)}</h2>
      <p>{t(LANDING_COPY.workflowIntro)}</p>
    </div>
    <ol className="landing-features">{LANDING_STEPS.map((step) => <li key={step.title}>
      <Separator />
      <div className="flex flex-col items-start gap-5 py-8">
        <step.icon className="size-6 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-xl font-normal">{t(step.title)}</h3>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{t(step.text)}</p>
      </div>
    </li>)}</ol>
    <div className="landing-roadmap">
      <div><h3 className="text-2xl font-normal tracking-tight">{t(LANDING_COPY.nextTitle)}</h3><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">{t(LANDING_COPY.nextDescription)}</p></div>
      <a href={brand.tinyfishUrl} target="_blank" rel="noreferrer" className="landing-partner-link">
        <span className="landing-note">{t(LANDING_COPY.partnerLabel)}</span>
        <span className="partner-logo-surface"><Image src={brand.tinyfish} alt={brand.tinyfishAlt} width={brand.tinyfishWidth} height={brand.tinyfishHeight} className="h-7 w-auto" /></span>
      </a>
    </div>
  </section>;
}

function LandingQuestions() {
  const t = useCopy();
  return <section id={LANDING_SECTIONS.questions} className="landing-shell landing-section landing-grid landing-faq">
    <h2 className="landing-heading">{t(LANDING_COPY.faqTitle)}</h2>
    <div className="landing-disclosures">{LANDING_QUESTIONS.map((question) => <Collapsible key={question.number}>
      <Separator />
      <h3 className="landing-question"><CollapsibleTrigger>
        <span className="landing-note" aria-hidden="true">{question.number}</span>
        <span>{t(question.title)}</span>
        <PlusIcon className="landing-plus size-4" aria-hidden="true" />
        <MinusIcon className="landing-minus size-4" aria-hidden="true" />
      </CollapsibleTrigger></h3>
      <CollapsibleContent><p className="landing-answer">{t(question.answer)}</p></CollapsibleContent>
    </Collapsible>)}<Separator /></div>
  </section>;
}

function LandingClosing() {
  const t = useCopy();
  return <section className="landing-shell landing-closing">
    <div className="landing-grid">
      <div className="landing-closing-copy">
        <h2 className="landing-heading">{t(LANDING_COPY.closingTitle)}</h2>
        <p className="text-muted-foreground">{t(LANDING_COPY.closingDescription)}</p>
        <div><WorkspaceLink /></div>
      </div>
      <div className="landing-closing-object" aria-hidden="true"><BrandMark /></div>
    </div>
  </section>;
}

function LandingFooter({ showAuth }: { showAuth: boolean }) {
  const t = useCopy();
  return <footer className="landing-shell">
    <Separator />
    <div className="landing-grid py-12">
      <div className="landing-footer-brand">
        <Link href={PLAN_ROUTES.landing} aria-label={t(LANDING_COPY.homeLabel)} className="landing-brand-link"><BrandLogo className="h-9 w-auto" /></Link>
        <p className="mt-5 max-w-xs text-sm text-muted-foreground">{t(LANDING_COPY.footer)}</p>
      </div>
      <nav aria-label={t(LANDING_COPY.footerNavigation)} className="landing-footer-nav">
        <div><h2 className="landing-note">{t(LANDING_COPY.productLinks)}</h2><ul>
          <li><Link href={PLAN_ROUTES.home}>{t(LANDING_COPY.open)}</Link></li>
          {showAuth && <li><Link href={PLAN_ROUTES.signup}>{t(LANDING_COPY.createAccount)}</Link></li>}
          {showAuth && <li><Link href={PLAN_ROUTES.login}>{t(LANDING_COPY.login)}</Link></li>}
        </ul></div>
        <div><h2 className="landing-note">{t(LANDING_COPY.exploreLinks)}</h2><ul>
          <li><a href={LANDING_SECTIONS.workflowLink}>{t(LANDING_COPY.how)}</a></li>
          <li><a href={LANDING_SECTIONS.questionsLink}>{t(LANDING_COPY.questions)}</a></li>
          <li><a href={brand.tinyfishUrl} target="_blank" rel="noreferrer">{brand.tinyfishAlt}</a></li>
        </ul></div>
      </nav>
    </div>
  </footer>;
}

export function LandingPage({ showAuth }: { showAuth: boolean }) {
  const t = useCopy();
  return <div className="landing-theme">
    <a href={LANDING_SECTIONS.skipLink} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground">{t(LANDING_COPY.skip)}</a>
    <LandingHeader showAuth={showAuth} />
    <main id={LANDING_SECTIONS.main}><LandingHero /><LandingWorkflow /><LandingQuestions /><LandingClosing /></main>
    <LandingFooter showAuth={showAuth} />
  </div>;
}
