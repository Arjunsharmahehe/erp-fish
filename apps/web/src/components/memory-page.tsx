"use client";
import { useState } from "react";
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

function EditMemory({ memory, close }: { memory: SavedMemory; close: () => void }) {
  const client = useQueryClient();
  // These are independent edit drafts. Background refetches must not overwrite them.
  const [question, setQuestion] = useState(memory.question);
  const [answer, setAnswer] = useState(memory.answer);
  const [context, setContext] = useState(memory.context);
  const mutation = useMutation({
    mutationFn: () => editMemory(memory.id, MemoryEditSchema.parse({ question, answer, context })),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: WORKSPACE_QUERY.memory }); close(); },
  });
  return <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) close(); }}><DialogContent>
    <DialogHeader><DialogTitle>{COPY.edit}</DialogTitle><DialogDescription>{COPY.editDescription}</DialogDescription></DialogHeader>
    <form className="flex flex-col gap-5" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
      <FieldGroup>
        <Field><FieldLabel htmlFor={FIELDS.question}>{COPY.question}</FieldLabel><Input id={FIELDS.question} value={question} disabled={mutation.isPending} required onChange={(event) => { setQuestion(event.target.value); }} /></Field>
        <Field><FieldLabel htmlFor={FIELDS.answer}>{COPY.answer}</FieldLabel><Textarea id={FIELDS.answer} value={answer} disabled={mutation.isPending} required onChange={(event) => { setAnswer(event.target.value); }} /></Field>
        <Field><FieldLabel htmlFor={FIELDS.context}>{COPY.context}</FieldLabel><Input id={FIELDS.context} value={context} disabled={mutation.isPending} required onChange={(event) => { setContext(event.target.value); }} /></Field>
      </FieldGroup>
      <details className="text-sm text-muted-foreground"><summary className="cursor-pointer">{COPY.original}</summary><p className="mt-3">{memory.original_question}</p><p className="mt-2 whitespace-pre-wrap">{memory.original_answer}</p></details>
      <WorkspaceError error={mutation.error} />
      <DialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>{COPY.cancel}</Button><Button type="submit" disabled={mutation.isPending || !question.trim() || !answer.trim() || !context.trim()}>{mutation.isPending ? COPY.saving : COPY.save}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
function DeleteMemory({ memory, close }: { memory: SavedMemory; close: () => void }) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => removeMemory(memory.id),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: WORKSPACE_QUERY.memory }); close(); },
  });
  return <AlertDialog open onOpenChange={(open) => { if (!open && !mutation.isPending) close(); }}><AlertDialogContent>
    <AlertDialogHeader><AlertDialogTitle>{COPY.deleteTitle}</AlertDialogTitle><AlertDialogDescription>{COPY.deleteDescription}</AlertDialogDescription></AlertDialogHeader>
    <p className="text-sm font-medium">{memory.question}</p><WorkspaceError error={mutation.error} />
    <AlertDialogFooter><AlertDialogCancel disabled={mutation.isPending}>{COPY.cancel}</AlertDialogCancel><Button variant="destructive" disabled={mutation.isPending} onClick={() => { mutation.mutate(); }}>{mutation.isPending ? COPY.deleting : COPY.remove}</Button></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
}
function MemoryRows({ memories, edit, remove }: { memories: SavedMemory[]; edit: (entry: SavedMemory) => void; remove: (entry: SavedMemory) => void }) {
  return <Table><TableHeader><TableRow><TableHead>{COPY.question}</TableHead><TableHead>{COPY.answer}</TableHead><TableHead><span className="sr-only">{COPY.actions}</span></TableHead></TableRow></TableHeader>
    <TableBody>{memories.map((memory) => <TableRow key={memory.id}>
      <TableCell className="max-w-sm align-top"><p className="font-medium">{memory.question}</p><p className="mt-2 text-xs text-muted-foreground">{memory.context}</p>
        <Link className={buttonVariants({ variant: "link", size: "xs" })} href={memory.source_type === "chat" ? `${PLAN_ROUTES.home}?thread=${encodeURIComponent(memory.source_id)}` : `${MEMORY_FORMAT.jobRoute}${encodeURIComponent(memory.source_id)}`}>{memory.source_type === "chat" ? COPY.source : COPY.jobSource}</Link>
      </TableCell>
      <TableCell className="max-w-sm align-top"><p className="whitespace-pre-wrap break-words text-sm">{memory.answer}</p><p className="mt-2 text-xs text-muted-foreground">{COPY.updated} <time dateTime={memory.updated_at}>{memory.updated_at.split(MEMORY_FORMAT.dateSeparator)[MEMORY_FORMAT.datePart]}</time></p></TableCell>
      <TableCell className="align-top"><div className="flex gap-1"><Button variant="ghost" size="icon-sm" aria-label={COPY.edit} title={COPY.edit} onClick={() => { edit(memory); }}><PencilIcon /></Button><Button variant="ghost" size="icon-sm" aria-label={COPY.remove} title={COPY.remove} onClick={() => { remove(memory); }}><Trash2Icon /></Button></div></TableCell>
    </TableRow>)}</TableBody></Table>;
}
export function MemoryPage() {
  const query = useQuery({ queryKey: WORKSPACE_QUERY.memory, queryFn: fetchMemories });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SavedMemory | null>(null);
  const [deleting, setDeleting] = useState<SavedMemory | null>(null);
  const memories = query.data ?? [];
  const filtered = memories.filter((entry) => [entry.question, entry.answer, entry.context].some((value) => value.toLowerCase().includes(search.trim().toLowerCase())));
  return <main className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
    <header className="flex flex-col gap-3"><h1 className="text-2xl font-semibold tracking-tight">{COPY.memoryTitle}</h1><p className="text-muted-foreground">{COPY.memoryIntro}</p><p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{COPY.memoryDetail}</p></header>
    <WorkspaceError error={query.error} retry={() => { void query.refetch(); }} />
    {query.isPending ? <WorkspaceLoading /> : memories.length ? <>
      <Input id={FIELDS.search} className="max-w-md" aria-label={COPY.search} placeholder={COPY.search} value={search} onChange={(event) => { setSearch(event.target.value); }} />
      {filtered.length ? <MemoryRows memories={filtered} edit={setEditing} remove={setDeleting} /> : <p className="text-sm text-muted-foreground">{COPY.noMatches}</p>}
    </> : !query.isError && <Empty><EmptyHeader><EmptyMedia variant="icon"><BrainIcon /></EmptyMedia><EmptyTitle>{COPY.emptyTitle}</EmptyTitle><EmptyDescription>{COPY.emptyDescription}</EmptyDescription></EmptyHeader></Empty>}
    {editing && <EditMemory key={editing.id} memory={editing} close={() => { setEditing(null); }} />}
    {deleting && <DeleteMemory memory={deleting} close={() => { setDeleting(null); }} />}
  </div></main>;
}
