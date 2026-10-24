import { CheckIcon, FileTextIcon, MessageCircleQuestionIcon } from "lucide-react";
import { BrandMark } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { LANDING_CHECKS, LANDING_COPY } from "@/lib/landing-config";

export function LandingPreview() {
  return <figure className="landing-preview">
    <Card>
      <CardHeader>
        <div className="mb-4 flex items-center justify-between gap-3">
          <BrandMark className="h-8 w-10" />
          <Badge variant="outline"><span className="landing-status" aria-hidden="true" />{LANDING_COPY.exampleStatus}</Badge>
        </div>
        <CardTitle>{LANDING_COPY.exampleTitle}</CardTitle>
        <CardDescription>{LANDING_COPY.example}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><FileTextIcon className="size-5" aria-hidden="true" /></div>
            <div className="min-w-0"><p className="truncate font-medium">{LANDING_COPY.exampleFile}</p><p className="text-xs text-muted-foreground">{LANDING_COPY.exampleFileHint}</p></div>
          </div>
          <Separator />
          <div className="max-w-xs self-end"><Bubble variant="secondary" align="end"><BubbleContent>{LANDING_COPY.examplePrompt}</BubbleContent></Bubble></div>
          <div className="flex flex-col gap-4">
            <p className="font-medium">{LANDING_COPY.exampleReply}</p>
            <ul className="flex flex-col gap-3">{LANDING_CHECKS.map((check) => <li key={check} className="flex items-start gap-3 text-muted-foreground"><CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{check}</li>)}</ul>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <MessageCircleQuestionIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div><p className="font-medium leading-relaxed">{LANDING_COPY.exampleQuestion}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{LANDING_COPY.exampleQuestionHint}</p></div>
          </div>
        </div>
      </CardContent>
    </Card>
    <figcaption className="mt-5 flex flex-wrap justify-between gap-2"><span className="landing-note">{LANDING_COPY.previewLabel}</span><span className="landing-note">{LANDING_COPY.previewNote}</span></figcaption>
  </figure>;
}
