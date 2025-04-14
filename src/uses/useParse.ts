import { createParser, EventSourceMessage } from "eventsource-parser";
import type OpenAI from "openai";

export interface UseParseOptions {
  onStream: (chunk: OpenAI.Chat.ChatCompletionChunk) => void;
  onError: (error: Error) => void;
}

export function useParse({ onStream, onError }: UseParseOptions) {
  const parser = createParser({
    onEvent: (event: EventSourceMessage) => {
      const chunk = JSON.parse(event.data) as OpenAI.Chat.ChatCompletionChunk;
      onStream(chunk);
    },
    onError: onError,
  });

  return {
    parser,
  };
}
