"use client";
import { useCopy } from "@/hooks/use-copy";
import { useState, type SyntheticEvent } from "react";
import { ArchiveIcon, ArchiveRestoreIcon, EllipsisIcon, PencilIcon, PinIcon, PinOffIcon, Trash2Icon } from "lucide-react";
import { MAX_THREAD_TITLE_LENGTH, type ThreadUpdate } from "shared";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type ThreadSummary } from "@/lib/plan-api";
import { THREAD_ACTION, THREAD_COPY } from "@/lib/thread-config";

export interface ThreadDialogTarget { action: typeof THREAD_ACTION.rename | typeof THREAD_ACTION.delete; thread: ThreadSummary }

export function ThreadActions({ thread, pending, onDialog, onUpdate }: {
  thread: ThreadSummary; pending: boolean; onDialog: (target: ThreadDialogTarget) => void; onUpdate: (update: ThreadUpdate) => void;
}) {
  const t = useCopy();
  return <DropdownMenu>
    <DropdownMenuTrigger render={<SidebarMenuAction />} aria-label={`${t(THREAD_COPY.actions)}: ${thread.title}`} disabled={pending}><EllipsisIcon /></DropdownMenuTrigger>
    <DropdownMenuContent side="right" align="start">
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={() => { onDialog({ action: THREAD_ACTION.rename, thread }); }}><PencilIcon />{t(THREAD_COPY.rename)}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => { onUpdate({ pinned: !thread.pinned }); }}>{thread.pinned ? <PinOffIcon /> : <PinIcon />}{thread.pinned ? t(THREAD_COPY.unpin) : t(THREAD_COPY.pin)}</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={() => { onUpdate({ archived: !thread.archived }); }}>{thread.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}{thread.archived ? t(THREAD_COPY.restore) : t(THREAD_COPY.archive)}</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => { onDialog({ action: THREAD_ACTION.delete, thread }); }}><Trash2Icon />{t(THREAD_COPY.delete)}</DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}

interface ThreadDialogProps { thread: ThreadSummary; pending: boolean; error: string | null; onClose: () => void }

export function RenameThreadDialog({ thread, pending, error, onClose, onSave }: ThreadDialogProps & { onSave: (title: string) => void }) {
  const t = useCopy();
  const [title, setTitle] = useState(thread.title);
  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending && title.trim()) onSave(title.trim());
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent showCloseButton={!pending}>
      <DialogHeader><DialogTitle>{t(THREAD_COPY.renameTitle)}</DialogTitle><DialogDescription>{t(THREAD_COPY.renameDescription)}</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <FieldGroup><Field>
          <FieldLabel htmlFor={t(THREAD_COPY.titleId)}>{t(THREAD_COPY.title)}</FieldLabel>
          <Input id={t(THREAD_COPY.titleId)} value={title} maxLength={MAX_THREAD_TITLE_LENGTH} required disabled={pending} onChange={(event) => { setTitle(event.target.value); }} />
        </Field></FieldGroup>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={onClose}>{t(THREAD_COPY.cancel)}</Button><Button type="submit" disabled={pending || !title.trim()}>{pending ? t(THREAD_COPY.saving) : t(THREAD_COPY.save)}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export function DeleteThreadDialog({ thread, pending, error, onClose, onDelete }: ThreadDialogProps & { onDelete: () => void }) {
  const t = useCopy();
  return <AlertDialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{t(THREAD_COPY.deleteTitle)}</AlertDialogTitle><AlertDialogDescription>{t(THREAD_COPY.deleteDescription)}</AlertDialogDescription></AlertDialogHeader>
      <p className="truncate text-sm font-medium">{thread.title}</p>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <AlertDialogFooter><AlertDialogCancel disabled={pending}>{t(THREAD_COPY.cancel)}</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={pending} onClick={onDelete}>{pending ? t(THREAD_COPY.deleting) : t(THREAD_COPY.delete)}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
