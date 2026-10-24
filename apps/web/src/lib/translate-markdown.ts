import { parseMarkdown } from "@tanstack/markdown/parser";
import type { BlockNode, InlineNode, MarkdownDocument, TextNode, TableCellNode, ListItemNode, FootnoteItemNode } from "@tanstack/markdown";
import type { Locale } from "shared";
import { translateText } from "./browser-translator";

type Node = MarkdownDocument | BlockNode | InlineNode | TableCellNode | ListItemNode | FootnoteItemNode;
function textNodes(node: Node): TextNode[] {
  if ("type" in node && node.type === "text") return [node];
  if ("type" in node && node.type === "link") return [];
  if ("children" in node) return node.children.flatMap(textNodes);
  if ("items" in node) return node.items.flatMap(textNodes);
  if (node.type === "table") return [...node.header, ...node.rows.flat()].flatMap(textNodes);
  return [];
}
export async function translateMarkdown(content: string, options: { locale: Locale; signal: AbortSignal }) {
  const document = parseMarkdown(content, { headingIds: false });
  // Only prose leaves change. URLs, code, table structure and literal HTML never enter translation.
  await Promise.all(textNodes(document).map(async (node) => {
    node.value = await translateText(node.value, { source: "en", target: options.locale, signal: options.signal });
  }));
  return document;
}
