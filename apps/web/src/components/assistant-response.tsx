"use client";

import { useEffect, useMemo, useState } from "react";
import { Markdown, type MarkdownComponents } from "@tanstack/markdown/react";
import { parseMarkdown } from "@tanstack/markdown/parser";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageFooter } from "@/components/ui/message";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHAT_COPY, CHAT_LINK, CHAT_PRESENTATION, sourceUrl } from "@/lib/chat-presentation";

const markdownComponents = {
  a: ({ children, ...props }) => <a {...props} target={CHAT_LINK.target} rel={CHAT_LINK.rel}>{children}</a>,
  table: Table, thead: TableHeader, tbody: TableBody, tr: TableRow, th: TableHead, td: TableCell,
} satisfies MarkdownComponents;

export function AssistantMarkdown({ content }: { content: string }) {
  const document = useMemo(() => parseMarkdown(content, { headingIds: false }), [content]);
  return <div className="chat-markdown"><Markdown components={markdownComponents}>{document}</Markdown></div>;
}

export function ResponseSources({ citations = [] }: { citations?: string[] }) {
  const urls = [...new Set(citations)].map(sourceUrl).filter((url) => url !== null);
  if (urls.length === CHAT_PRESENTATION.first) return null;
  return <nav aria-label={CHAT_COPY.sources} className="flex flex-wrap items-center gap-2 pt-2">
    <span className="text-xs text-muted-foreground">{CHAT_COPY.sources}</span>
    {urls.map((url, index) => <Button key={url.href} nativeButton={false} role="link" variant="outline" size="xs" render={<a href={url.href} aria-label={url.hostname} target={CHAT_LINK.target} rel={CHAT_LINK.rel} />}><span className="truncate">{String(index + CHAT_PRESENTATION.step)}. {url.hostname}</span></Button>)}
  </nav>;
}

export function ResponseActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => { setCopied(false); }, CHAT_PRESENTATION.copiedMs);
    return () => { clearTimeout(timeout); };
  }, [copied]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }
  return <MessageFooter className="mt-3 flex-wrap">
    <Button variant="ghost" size="icon-sm" aria-label={copied ? CHAT_COPY.copied : CHAT_COPY.copy} title={copied ? CHAT_COPY.copied : CHAT_COPY.copy} onClick={() => { void copy(); }}>
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
    <span role="status" className={failed ? "text-xs text-destructive" : "sr-only"}>{failed ? CHAT_COPY.copyFailed : copied ? CHAT_COPY.copied : null}</span>
  </MessageFooter>;
}
