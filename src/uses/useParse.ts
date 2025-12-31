import { createParser, EventSourceMessage } from "eventsource-parser";
import type OpenAI from "openai";

export interface UseParseOptions {
  onStream: (chunk: OpenAI.Chat.ChatCompletionChunk) => void;
  onError: (error: Error) => void;
}

export function useParse({ onStream, onError }: UseParseOptions) {
  const parser = createParser({
    onEvent: (event: EventSourceMessage) => {
      try {
        const chunk = JSON.parse(event.data) as OpenAI.Chat.ChatCompletionChunk;
        onStream(chunk);
      } catch (error) {
        onError(error instanceof Error ? error : new Error("Failed to parse event data"));
      }
    },
    onError: onError,
  });

  return {
    parser,
  };
}
