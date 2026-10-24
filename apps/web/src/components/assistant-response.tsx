"use client";
import { useCopy } from "@/hooks/use-copy";
import { useEffect, useMemo, useState } from "react";
import { Markdown, type MarkdownComponents } from "@tanstack/markdown/react";
import { parseMarkdown } from "@tanstack/markdown/parser";
import { renderDocument } from "@tanstack/markdown/html";
import type { MarkdownDocument } from "@tanstack/markdown";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageFooter } from "@/components/ui/message";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHAT_COPY, CHAT_LINK, CHAT_PRESENTATION, sourceUrl } from "@/lib/chat-presentation";

const markdownComponents = {
  a: ({ children, ...props }) => <a {...props} target={CHAT_LINK.target} rel={CHAT_LINK.rel}>{children}</a>,
  table: Table, thead: TableHeader, tbody: TableBody, tr: TableRow, th: TableHead, td: TableCell,
} satisfies MarkdownComponents;

function translatedClipboard(document: MarkdownDocument) {
  const html = new DOMParser().parseFromString(renderDocument(document), "text/html");
  for (const link of html.querySelectorAll("a")) link.append(` (${link.href})`);
  for (const block of html.querySelectorAll("p,li,h1,h2,h3,h4,h5,h6,tr,pre")) block.append("\n");
  return html.body.textContent.trim();
}

export function AssistantMarkdown({ content, translated }: { content: string; translated?: MarkdownDocument }) {
  const document = useMemo(() => parseMarkdown(content, { headingIds: false }), [content]);
  return <div className="chat-markdown"><Markdown components={markdownComponents}>{translated ?? document}</Markdown></div>;
}

export function ResponseSources({ citations = [] }: { citations?: string[] }) {
  const t = useCopy();
  const urls = [...new Set(citations)].map(sourceUrl).filter((url) => url !== null);
  if (urls.length === CHAT_PRESENTATION.first) return null;
  return <nav aria-label={t(CHAT_COPY.sources)} className="flex flex-wrap items-center gap-2 pt-2">
    <span className="text-xs text-muted-foreground">{t(CHAT_COPY.sources)}</span>
    {urls.map((url, index) => <Button key={url.href} nativeButton={false} role="link" variant="outline" size="xs" render={<a href={url.href} aria-label={url.hostname} target={CHAT_LINK.target} rel={CHAT_LINK.rel} />}><span className="truncate">{String(index + CHAT_PRESENTATION.step)}. {url.hostname}</span></Button>)}
  </nav>;
}

export function ResponseActions({ content, translated }: { content: string; translated?: MarkdownDocument }) {
  const t = useCopy();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => { setCopied(false); }, CHAT_PRESENTATION.copiedMs);
    return () => { clearTimeout(timeout); };
  }, [copied]);
  async function copy() {
    try {
      const text = translated ? translatedClipboard(translated) : content;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }
  return <MessageFooter className="mt-3 flex-wrap">
    <Button variant="ghost" size="icon-sm" aria-label={copied ? t(CHAT_COPY.copied) : t(CHAT_COPY.copy)} title={copied ? t(CHAT_COPY.copied) : t(CHAT_COPY.copy)} onClick={() => { void copy(); }}>
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
    <span role="status" className={failed ? "text-xs text-destructive" : "sr-only"}>{failed ? t(CHAT_COPY.copyFailed) : copied ? t(CHAT_COPY.copied) : null}</span>
  </MessageFooter>;
}
