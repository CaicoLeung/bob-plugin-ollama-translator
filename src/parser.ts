import { createParser, EventSourceMessage } from "eventsource-parser";
import type OpenAI from "openai";

export interface ParserCallbacks {
  onChunk: (chunk: OpenAI.Chat.ChatCompletionChunk) => void;
  onError: (error: Error) => void;
}

export function createStreamParser({ onChunk, onError }: ParserCallbacks) {
  return createParser({
    onEvent: (event: EventSourceMessage) => {
      try {
        const chunk = JSON.parse(event.data) as OpenAI.Chat.ChatCompletionChunk;
        onChunk(chunk);
      } catch (error) {
        onError(error instanceof Error ? error : new Error("Failed to parse event data"));
      }
    },
    onError,
  });
}