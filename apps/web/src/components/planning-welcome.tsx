"use client";
import { useCopy } from "@/hooks/use-copy";
import { BrandMark } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { HOME_COPY, STARTER_PROMPTS } from "@/lib/home-config";

export function PlanningWelcome({ onPrompt, disabled }: { onPrompt: (prompt: string) => void; disabled: boolean }) {
  const t = useCopy();
  return <Empty className="min-h-full">
    <EmptyHeader className="max-w-xl">
      <EmptyMedia><BrandMark className="h-16 w-20" /></EmptyMedia>
      <EmptyTitle><h2 className="text-3xl font-medium tracking-tight text-balance sm:text-4xl">{t(HOME_COPY.welcomeTitle)}</h2></EmptyTitle>
      <EmptyDescription>{t(HOME_COPY.welcomeDescription)}</EmptyDescription>
    </EmptyHeader>
    <EmptyContent className="max-w-2xl">
      <div className="flex flex-wrap justify-center gap-2" aria-label={t(HOME_COPY.starterLabel)}>
        {STARTER_PROMPTS.map((prompt) => <Button key={prompt.title} variant="outline" size="sm" disabled={disabled} onClick={() => { onPrompt(t(prompt.prompt)); }}>
          <prompt.icon data-icon="inline-start" />{t(prompt.title)}
        </Button>)}
      </div>
    </EmptyContent>
  </Empty>;
}
