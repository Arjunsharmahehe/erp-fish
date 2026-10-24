"use client";
import { MicIcon, SquareIcon, XIcon } from "lucide-react";
import { SPEECH_ERROR, type OriginalMessage } from "shared";
import { useLanguage } from "./language-provider";
import { useCopy } from "@/hooks/use-copy";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { LANGUAGE_COPY as COPY } from "@/lib/language-config";

interface VoiceProps { disabled: boolean; onTranscript: (value: OriginalMessage) => void }
type VoiceState = ReturnType<typeof useVoiceInput>;
function voiceHint(voice: VoiceState) {
  if (voice.status.error) return voice.status.error.message;
  if (!voice.recorder.isSupported) return COPY.microphone;
  return voice.status.data?.available ? COPY.record : SPEECH_ERROR.unavailable;
}
function DesktopVoiceInput(props: VoiceProps) {
  const t = useCopy();
  const voice = useVoiceInput(props);
  const recording = voice.recorder.isRecording;
  const busy = voice.mutation.isPending;
  const unavailable = [!voice.status.data?.available, !voice.recorder.isSupported].some(Boolean);
  const hint = voiceHint(voice);
  return <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <Button type="button" variant="voice" size="icon-sm" aria-label={t(recording ? COPY.stop : COPY.record)} title={t(hint)} disabled={[props.disabled, unavailable, busy].some(Boolean)} onClick={() => { voice.mutation.mutate(recording ? "stop" : "record"); }}>{busy ? <Spinner /> : recording ? <SquareIcon /> : <MicIcon />}</Button>
      {(recording || busy) && <><span role="status" className="text-xs text-muted-foreground">{t(recording ? COPY.recording : COPY.transcribing)}</span><Button type="button" variant="ghost" size="icon-sm" aria-label={t(COPY.cancel)} onClick={voice.discard}><XIcon /></Button></>}
    </div>
    {voice.error && <p role="alert" className="text-xs text-destructive">{t(voice.error)}</p>}
  </div>;
}
export function VoiceInput(props: VoiceProps) {
  const { desktop, locale } = useLanguage();
  return desktop ? <DesktopVoiceInput key={locale} {...props} /> : null;
}
