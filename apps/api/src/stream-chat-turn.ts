import { EventType, toServerSentEventsResponse, type StreamChunk } from "@tanstack/ai";
import { CHAT_STREAM } from "shared";
import { runAssistantTurn } from "./chat-turn";
import { logger } from "./logger";

const STREAM_FAILED = "The response could not be completed. Please try again.";
const STREAM_ERROR_LOG = "planning_stream_failed";

async function* readChunks(stream: ReadableStream<StreamChunk>): AsyncGenerator<StreamChunk> {
  const reader = stream.getReader();
  try {
    let chunk = await reader.read();
    while (!chunk.done) {
      yield chunk.value;
      chunk = await reader.read();
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}

export function streamChatTurn(options: Parameters<typeof runAssistantTurn>[0]): Response {
  let connected = true;
  const stream = new ReadableStream<StreamChunk>({
    start(controller) {
      const emit = (chunk: StreamChunk) => { if (connected) controller.enqueue(chunk); };
      void runAssistantTurn({
        ...options,
        onActivity: (activity) => { emit({ type: CHAT_STREAM.custom, name: CHAT_STREAM.activity, value: activity }); },
      }).then((response) => {
        emit({ type: CHAT_STREAM.custom, name: CHAT_STREAM.answer, value: response });
      }).catch((cause: unknown) => {
        logger.error({ threadId: options.threadId, errorType: cause instanceof Error ? cause.name : typeof cause }, STREAM_ERROR_LOG);
        emit({ type: EventType.RUN_ERROR, message: STREAM_FAILED });
      }).finally(() => {
        if (!connected) return;
        connected = false;
        controller.close();
      });
    },
    // Finish saving the response if the reader navigates away.
    cancel() { connected = false; },
  });
  return toServerSentEventsResponse(readChunks(stream));
}
