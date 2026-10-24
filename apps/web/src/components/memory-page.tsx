"use client";
import { useState } from "react";
import { TranslatedText } from "./translated-text";
import { useEnglishInput, useLanguage } from "./language-provider";
import { useTranslatedText } from "@/hooks/use-translated-text";
import { useMemorySearch } from "@/hooks/use-memory-search";
import { useCopy } from "@/hooks/use-copy";
import { LANGUAGE_COPY } from "@/lib/language-config";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { type SavedMemory, MemoryEditSchema } from "shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { WorkspaceError, WorkspaceLoading } from "@/components/workspace-feedback";
import { editMemory, fetchMemories, removeMemory } from "@/lib/workspace-api";
import { WORKSPACE_COPY as COPY, WORKSPACE_FIELDS as FIELDS, WORKSPACE_QUERY } from "@/lib/workspace-config";
import { PLAN_ROUTES } from "@/lib/plan-config";
const MEMORY_FORMAT = { dateSeparator: "T", datePart: 0, jobRoute: "/jobs/" };

function EditMemoryDraft({ memory, initial, close }: { memory: SavedMemory; initial: { question: string; answer: string; context: string }; close: () => void }) {
  const t = useCopy();
  const englishInput = useEnglishInput();
  const { locale } = useLanguage();
  const client = useQueryClient();
  // These are independent edit drafts. Background refetches must not overwrite them.
  const [question, setQuestion] = useState(initial.question);
  const [answer, setAnswer] = useState(initial.answer);
  const [context, setContext] = useState(initial.context);
  const draft = { question, answer, context };
  const draftKey = JSON.stringify(draft);
  const preview = useMutation({ mutationFn: async () => {
    const canonical = MemoryEditSchema.parse({
      question: question === initial.question ? memory.question : (await englishInput(question)).content,
      answer: answer === initial.answer ? memory.answer : (await englishInput(answer)).content,
      context: context === initial.context ? memory.context : (await englishInput(context)).content,
    });
    return { canonical, key: draftKey };
  } });
  const reviewed = preview.data?.key === draftKey ? preview.data.canonical : undefined;
  const mutation = useMutation({
    mutationFn: () => editMemory(memory.id, MemoryEditSchema.parse(locale === "en" ? draft : reviewed)),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: WORKSPACE_QUERY.memory }); close(); },
  });
  const busy = [mutation.isPending, preview.isPending].some(Boolean);
  const needsPreview = locale !== "en" && !reviewed;
  const canSave = [question, answer, context].every((value) => Boolean(value.trim()));
  return <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) close(); }}><DialogContent>
    <DialogHeader><DialogTitle>{t(COPY.edit)}</DialogTitle><DialogDescription>{t(COPY.editDescription)}</DialogDescription></DialogHeader>
    <form className="flex flex-col gap-5" onSubmit={(event) => { event.preventDefault(); if (needsPreview) preview.mutate(); else mutation.mutate(); }}>
      <FieldGroup>
        <Field><FieldLabel htmlFor={FIELDS.question}>{t(COPY.question)}</FieldLabel><Input id={FIELDS.question} value={question} disabled={mutation.isPending} required onChange={(event) => { setQuestion(event.target.value); }} /></Field>
        <Field><FieldLabel htmlFor={FIELDS.answer}>{t(COPY.answer)}</FieldLabel><Textarea id={FIELDS.answer} value={answer} disabled={mutation.isPending} required onChange={(event) => { setAnswer(event.target.value); }} /></Field>
        <Field><FieldLabel htmlFor={FIELDS.context}>{t(COPY.context)}</FieldLabel><Input id={FIELDS.context} value={context} disabled={mutation.isPending} required onChange={(event) => { setContext(event.target.value); }} /></Field>
      </FieldGroup>
      <details className="text-sm text-muted-foreground"><summary className="cursor-pointer">{t(COPY.original)}</summary><p className="mt-3">{memory.original_question}</p><p className="mt-2 whitespace-pre-wrap">{memory.original_answer}</p></details>
      <WorkspaceError error={mutation.error} />
      <WorkspaceError error={preview.error} />
      {locale !== "en" && <p className="text-xs text-muted-foreground">{t(LANGUAGE_COPY.reviewMemory)}</p>}
      {reviewed && <section lang="en" className="flex flex-col gap-2 rounded-lg border p-4"><h3 className="text-sm font-medium">{t(LANGUAGE_COPY.englishPreview)}</h3><p>{reviewed.question}</p><p className="whitespace-pre-wrap">{reviewed.answer}</p><p>{reviewed.context}</p></section>}
      <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={close}>{t(COPY.cancel)}</Button><Button type="submit" disabled={busy || !canSave}>{busy ? t(COPY.saving) : needsPreview ? t(LANGUAGE_COPY.prepareMemory) : t(COPY.save)}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
function EditMemory({ memory, close }: { memory: SavedMemory; close: () => void }) {
  const { locale } = useLanguage();
  const question = useTranslatedText(memory.question);
  const answer = useTranslatedText(memory.answer);
  const context = useTranslatedText(memory.context);
  const t = useCopy();
  if ([question, answer, context].some((value) => value.pending || value.error)) return <Dialog open onOpenChange={(open) => { if (!open) close(); }}><DialogContent><DialogHeader><DialogTitle>{t(COPY.edit)}</DialogTitle><DialogDescription>{t(question.error ?? answer.error ?? context.error ?? LANGUAGE_COPY.translating)}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={close}>{t(COPY.cancel)}</Button><Button onClick={() => { question.retry(); answer.retry(); context.retry(); }}>{t(COPY.retry)}</Button></DialogFooter></DialogContent></Dialog>;
  return <EditMemoryDraft key={`${memory.id}:${locale}`} memory={memory} initial={{ question: question.text, answer: answer.text, context: context.text }} close={close} />;
}
function DeleteMemory({ memory, close }: { memory: SavedMemory; close: () => void }) {
  const t = useCopy();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => removeMemory(memory.id),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: WORKSPACE_QUERY.memory }); close(); },
  });
  return <AlertDialog open onOpenChange={(open) => { if (!open && !mutation.isPending) close(); }}><AlertDialogContent>
    <AlertDialogHeader><AlertDialogTitle>{t(COPY.deleteTitle)}</AlertDialogTitle><AlertDialogDescription>{t(COPY.deleteDescription)}</AlertDialogDescription></AlertDialogHeader>
    <p className="text-sm font-medium"><TranslatedText text={memory.question} /></p><WorkspaceError error={mutation.error} />
    <AlertDialogFooter><AlertDialogCancel disabled={mutation.isPending}>{t(COPY.cancel)}</AlertDialogCancel><Button variant="destructive" disabled={mutation.isPending} onClick={() => { mutation.mutate(); }}>{mutation.isPending ? t(COPY.deleting) : t(COPY.remove)}</Button></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
}
function MemoryRows({ memories, edit, remove }: { memories: SavedMemory[]; edit: (entry: SavedMemory) => void; remove: (entry: SavedMemory) => void }) {
  const t = useCopy();
  return <Table><TableHeader><TableRow><TableHead>{t(COPY.question)}</TableHead><TableHead>{t(COPY.answer)}</TableHead><TableHead><span className="sr-only">{t(COPY.actions)}</span></TableHead></TableRow></TableHeader>
    <TableBody>{memories.map((memory) => <TableRow key={memory.id}>
      <TableCell className="max-w-sm align-top"><p className="font-medium"><TranslatedText text={memory.question} /></p><p className="mt-2 text-xs text-muted-foreground"><TranslatedText text={memory.context} /></p>
        <Link className={buttonVariants({ variant: "link", size: "xs" })} href={memory.source_type === "chat" ? `${PLAN_ROUTES.home}?thread=${encodeURIComponent(memory.source_id)}` : `${MEMORY_FORMAT.jobRoute}${encodeURIComponent(memory.source_id)}`}>{memory.source_type === "chat" ? t(COPY.source) : t(COPY.jobSource)}</Link>
      </TableCell>
      <TableCell className="max-w-sm align-top"><p className="whitespace-pre-wrap break-words text-sm"><TranslatedText text={memory.answer} /></p><p className="mt-2 text-xs text-muted-foreground">{t(COPY.updated)} <time dateTime={memory.updated_at}>{memory.updated_at.split(MEMORY_FORMAT.dateSeparator)[MEMORY_FORMAT.datePart]}</time></p></TableCell>
      <TableCell className="align-top"><div className="flex gap-1"><Button variant="ghost" size="icon-sm" aria-label={t(COPY.edit)} title={t(COPY.edit)} onClick={() => { edit(memory); }}><PencilIcon /></Button><Button variant="ghost" size="icon-sm" aria-label={t(COPY.remove)} title={t(COPY.remove)} onClick={() => { remove(memory); }}><Trash2Icon /></Button></div></TableCell>
    </TableRow>)}</TableBody></Table>;
}
export function MemoryPage() {
  const t = useCopy();
  const query = useQuery({ queryKey: WORKSPACE_QUERY.memory, queryFn: fetchMemories });
  const [search, setSearch] = useState("");
  const searchQuery = useMemorySearch(search);
  const [editing, setEditing] = useState<SavedMemory | null>(null);
  const [deleting, setDeleting] = useState<SavedMemory | null>(null);
  const memories = query.data ?? [];
  const searchText = searchQuery.text;
  const filtered = memories.filter((entry) => [entry.question, entry.answer, entry.context].some((value) => value.toLowerCase().includes(searchText.trim().toLowerCase())));
  return <main className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
    <header className="flex flex-col gap-3"><h1 className="text-2xl font-semibold tracking-tight">{t(COPY.memoryTitle)}</h1><p className="text-muted-foreground">{t(COPY.memoryIntro)}</p><p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{t(COPY.memoryDetail)}</p></header>
    <WorkspaceError error={query.error} retry={() => { void query.refetch(); }} />
    {query.isPending ? <WorkspaceLoading /> : memories.length ? <>
      <Input id={FIELDS.search} className="max-w-md" aria-label={t(COPY.search)} placeholder={t(COPY.search)} value={search} onChange={(event) => { setSearch(event.target.value); }} />
      <WorkspaceError error={searchQuery.error} />
      {filtered.length ? <MemoryRows memories={filtered} edit={setEditing} remove={setDeleting} /> : <p className="text-sm text-muted-foreground">{t(COPY.noMatches)}</p>}
    </> : !query.isError && <Empty><EmptyHeader><EmptyMedia variant="icon"><BrainIcon /></EmptyMedia><EmptyTitle>{t(COPY.emptyTitle)}</EmptyTitle><EmptyDescription>{t(COPY.emptyDescription)}</EmptyDescription></EmptyHeader></Empty>}
    {editing && <EditMemory key={editing.id} memory={editing} close={() => { setEditing(null); }} />}
    {deleting && <DeleteMemory memory={deleting} close={() => { setDeleting(null); }} />}
  </div></main>;
}
