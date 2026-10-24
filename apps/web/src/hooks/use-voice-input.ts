"use client";
import { useEffect, useRef, useState } from "react";
import { useAudioRecorder } from "@tanstack/ai-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SPEECH, SPEECH_ERROR, type OriginalMessage } from "shared";
import { useLanguage } from "@/components/language-provider";
import { speechStatus, transcribeAudio } from "@/lib/speech-api";
import { LANGUAGE_COPY as COPY } from "@/lib/language-config";

type Recorder = ReturnType<typeof useAudioRecorder>;
async function stopRecording(recorder: Recorder, options: { language: string; signal: AbortSignal }) {
  const recording = await recorder.stop();
  options.signal.throwIfAborted();
  const blob = recording.blob;
  if (!blob.size) throw new Error(SPEECH_ERROR.empty);
  if (blob.size > SPEECH.maxBytes) throw new Error(SPEECH_ERROR.tooLarge);
  return transcribeAudio({ blob, ...options });
}
export function useVoiceInput(options: { disabled: boolean; onTranscript: (value: OriginalMessage) => void }) {
  const language = useLanguage();
  const recorder = useAudioRecorder();
  const status = useQuery({ queryKey: [SPEECH.statusPath], queryFn: speechStatus });
  const [limitError, setLimitError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const { cancel } = recorder;
  useEffect(() => () => { request.current?.abort(); cancel(); }, [cancel, options.disabled]);
  useEffect(() => {
    if (!recorder.isRecording) return;
    const timer = setTimeout(() => { cancel(); setLimitError(COPY.limit); }, SPEECH.maxRecordingMs);
    return () => { clearTimeout(timer); };
  }, [cancel, recorder.isRecording]);
  const mutation = useMutation({ mutationFn: async (action: "record" | "stop") => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller; setLimitError(null);
    try {
      if (action === "record") { await recorder.start(); if (controller.signal.aborted) cancel(); }
      if (action === "stop") {
        const result = await stopRecording(recorder, { language: language.locale, signal: controller.signal });
        controller.signal.throwIfAborted(); options.onTranscript(result);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (action === "record") throw new Error(COPY.microphone);
      throw error;
    }
  } });
  function discard() { request.current?.abort(); cancel(); mutation.reset(); setLimitError(null); }
  return { recorder, status, discard, mutation, error: limitError ?? mutation.error?.message };
}
