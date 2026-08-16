import { TextTranslateQuery } from "@bob-translate/types";
import { parseWordLookup, splitThinkTags } from "./dict";

/**
 * Result framing: everything between raw model output and Bob's payload
 * shapes. Deep module — finish semantics, think-tag handling, stream-frame
 * shape and reasoning-delta capture live behind one factory plus four
 * methods. Pure: the thinking toggle and word-lookup decision arrive as
 * facts, so checks hit this interface directly with no ambient globals.
 */

const FINISH_SUFFIXES: Record<string, string> = {
  length: "\n[翻译被截断：达到最大长度限制]",
  content_filter: "\n[翻译被过滤：可能包含不适当内容]",
  tool_calls: "\n[不支持的响应类型]",
  function_call: "\n[不支持的响应类型]",
};

/** A finish reason that ends the stream with a visible note. Unknown
 *  reasons keep streaming (documented behaviour — see AGENTS.md). */
export function isFinishWithSuffix(reason: string): boolean {
  return Boolean(FINISH_SUFFIXES[reason]);
}

/** Reasoning models (DeepSeek R1, QwQ, ...) stream thinking in a dedicated
 *  delta field, not inline <think> tags — capture it or the thinking
 *  toggle never renders. */
function reasoningDelta(delta: unknown): string {
  const extended = delta as {
    reasoning?: unknown;
    reasoning_content?: unknown;
  };
  return typeof extended?.reasoning_content === "string"
    ? extended.reasoning_content
    : typeof extended?.reasoning === "string"
      ? extended.reasoning
      : "";
}

/** Shared result skeleton: language pair + paragraphs (Bob's base shape). */
function resultShell(query: TextTranslateQuery, toParagraphs: string[]) {
  return { from: query.detectFrom, to: query.detectTo, toParagraphs };
}

export interface FramerOptions {
  /** `thinking` menu fact, resolved once in `params.ts`. Display-side only:
   *  capture always runs, rendering hides reasoning when off. */
  thinking: boolean;
  /** qwen-mt-gated word-lookup decision, computed once in `params.ts`. */
  wordLookup: boolean;
}

export function createResultFramer(
  query: TextTranslateQuery,
  { thinking, wordLookup }: FramerOptions,
) {
  /** Word lookup: dict result only (ADR-003). `toParagraphs: []` satisfies
   *  the type; Bob 1.6.0+ renders on `toDict` alone. Throws DictParseError. */
  const wordResult = (composed: string) => {
    const { toDict, thinkContent } = parseWordLookup(composed, query);
    return {
      result: {
        ...(thinkContent && thinking
          ? { thinkInfo: { content: thinkContent, splitThinkTag: false } }
          : {}),
        ...resultShell(query, []),
        toDict,
      },
    };
  };

  const textResult = (composed: string, think = "") => {
    // Display-side toggle: off strips leaked tags from the body and hides
    // thinkInfo entirely. Capture/compose stay unconditional, so the cache
    // stores the full form and re-enabling replays thinking — inline tags
    // and captured reasoning deltas alike.
    if (!thinking) {
      const { body } = splitThinkTags(composed);
      return {
        result: {
          thinkInfo: { content: "", splitThinkTag: true },
          ...resultShell(query, [body]),
        },
      };
    }
    return {
      result: {
        thinkInfo: { content: think, splitThinkTag: true },
        ...resultShell(query, [composed]),
      },
    };
  };

  return {
    /** Capture is unconditional — the toggle is display-side, so the
     *  cache always stores the full form (replay works after re-enabling). */
    captureReasoning(delta: unknown): string {
      return reasoningDelta(delta);
    },

    /** Stream frame for a mid-generation chunk. Word lookup: reasoning
     *  only — the dict can't render until the full JSON arrives
     *  (ADR-003 #4); null means "nothing new to render, skip the frame". */
    streamFrame(accumulated: string, reasoning: string, hasNew: boolean) {
      // Live text frames carry streamed reasoning in thinkInfo; word
      // lookup renders reasoning only — the dict can't render until the
      // full JSON arrives (ADR-003 #4); null = skip the frame. The
      // thinking-off case hides reasoning on both paths.
      if (!wordLookup) return textResult(accumulated, reasoning);
      return hasNew && thinking
        ? {
            result: {
              thinkInfo: { content: reasoning, splitThinkTag: false },
              ...resultShell(query, []),
            },
          }
        : null;
    },

    /** Canonical composed text — what the cache stores. Finish suffix on
     *  the text path only (a note would corrupt the dict JSON; the reason
     *  surfaces in the parse error's addition instead), reasoning
     *  re-wrapped as an inline <think> block so every consumer — dict.ts,
     *  Bob's splitThinkTag, the cache — sees one format. */
    compose(raw: string, reasoning: string, finishReason?: string): string {
      const text =
        finishReason && !wordLookup ? raw + FINISH_SUFFIXES[finishReason] : raw;
      return reasoning ? `<think>${reasoning}</think>${text}` : text;
    },

    /** Final payload from composed text; cache hits replay through the
     *  same method. */
    payload(composed: string) {
      return wordLookup ? wordResult(composed) : textResult(composed);
    },
  };
}
