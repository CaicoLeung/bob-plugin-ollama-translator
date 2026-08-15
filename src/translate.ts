import { ServiceError, TextTranslateQuery } from "@bob-translate/types";
import { handleGeneralError } from "./util";
import { getApiKey, getServiceUrl, asProvider } from "./service";
import { getCachedResult, setCachedResult } from "./cache";
import { preCheck } from "./precheck";
import { buildRequestParams } from "./params";
import { createStreamParser } from "./parser";
import { DictParseError, parseWordLookup } from "./dict";

const FINISH_SUFFIXES: Record<string, string> = {
  length: "\n[翻译被截断：达到最大长度限制]",
  content_filter: "\n[翻译被过滤：可能包含不适当内容]",
  tool_calls: "\n[不支持的响应类型]",
  function_call: "\n[不支持的响应类型]",
};

function buildWordResult(query: TextTranslateQuery, text: string) {
  // Word lookup: dict result only (ADR-003). `toParagraphs: []` satisfies
  // the type; Bob 1.6.0+ renders on `toDict` alone.
  const { toDict, thinkContent } = parseWordLookup(text, query);
  return {
    result: {
      ...(thinkContent
        ? { thinkInfo: { content: thinkContent, splitThinkTag: false } }
        : {}),
      from: query.detectFrom,
      to: query.detectTo,
      toParagraphs: [],
      toDict,
    },
  };
}

function buildTextResult(
  query: TextTranslateQuery,
  text: string,
  thinkContent = "",
) {
  return {
    result: {
      thinkInfo: { content: thinkContent, splitThinkTag: true },
      from: query.detectFrom,
      to: query.detectTo,
      toParagraphs: [text],
    },
  };
}

/** Word-lookup stream frame: reasoning only — the dict itself can't render
 *  until the full JSON arrives (ADR-003 #4). */
function buildWordStream(query: TextTranslateQuery, thinkContent: string) {
  return {
    result: {
      thinkInfo: { content: thinkContent, splitThinkTag: false },
      from: query.detectFrom,
      to: query.detectTo,
      toParagraphs: [],
    },
  };
}

export async function translate(query: TextTranslateQuery) {
  const service = asProvider($option.service);
  const url = getServiceUrl(service);
  const apiKey = getApiKey(service);

  if (!url) {
    handleGeneralError(query, {
      type: "param",
      message: "配置错误 - 请确保您在插件配置中填入了正确的 Base URL",
      addition: "请在插件配置中填写 Base URL",
    });
    return;
  }

  const { params, wordLookup } = buildRequestParams(query, service);

  const cached = getCachedResult(query);
  if (cached !== null) {
    completeOnce(query, cached, wordLookup);
    return;
  }

  if (!preCheck(query)) return;

  let accumulated = "";
  let reasoning = "";
  let completed = false;

  // Word lookup: finish_reason note (e.g. truncation) goes into the parse
  // error's addition — appending suffix text would corrupt the JSON.
  const complete = (text: string, finishReason?: string) => {
    if (completed) return;
    completed = true;
    // Reasoning deltas re-wrap as an inline <think> block so every consumer
    // sees one format: dict.ts splits it into thinkInfo, Bob's
    // splitThinkTag does the same for text results, and the cache replays it.
    completeOnce(
      query,
      reasoning ? `<think>${reasoning}</think>${text}` : text,
      wordLookup,
      finishReason,
    );
  };

  const parser = createStreamParser({
    onChunk: (chunk) => {
      if (!chunk.choices?.length) return;

      const { finish_reason, delta } = chunk.choices[0];
      accumulated += delta?.content || "";
      // Reasoning models (DeepSeek R1, QwQ, ...) stream reasoning in a
      // dedicated delta field, not inline <think> tags — capture it or the
      // thinking toggle never renders.
      const thinking = delta as {
        reasoning?: unknown;
        reasoning_content?: unknown;
      };
      const deltaReasoning =
        typeof thinking?.reasoning_content === "string"
          ? thinking.reasoning_content
          : typeof thinking?.reasoning === "string"
            ? thinking.reasoning
            : "";
      reasoning += deltaReasoning;

      if (finish_reason === "stop") {
        complete(accumulated);
      } else if (finish_reason && FINISH_SUFFIXES[finish_reason]) {
        if (wordLookup) {
          complete(accumulated, finish_reason);
        } else {
          complete(accumulated + FINISH_SUFFIXES[finish_reason]);
        }
      } else if (!finish_reason) {
        // The dict can't stream (partial JSON is unrenderable), but the
        // reasoning toggle updates live on both paths.
        if (wordLookup) {
          // Only frames that add reasoning — content chunks would re-send
          // an identical think frame for the rest of the generation.
          if (deltaReasoning) {
            query.onStream(buildWordStream(query, reasoning));
          }
        } else {
          query.onStream(buildTextResult(query, accumulated, reasoning));
        }
      }
    },
    onError: (error) => {
      handleGeneralError(query, {
        type: "api",
        message: error instanceof Error ? error.message : "Unknown error",
        addition: "翻译过程中发生错误",
      } as ServiceError);
    },
  });

  try {
    $http.streamRequest({
      method: "POST",
      url,
      timeout: 30,
      cancelSignal: query.cancelSignal,
      header: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: params,
      streamHandler: (streamData) => {
        if (/Invalid token/i.test(streamData.text || "")) {
          handleGeneralError(query, {
            type: "secretKey",
            message: "配置错误 - 请确保您在插件配置中填入了正确的 API Keys",
            addition: "请在插件配置中填写正确的 API Keys",
            troubleshootingLink:
              "https://bobtranslate.com/service/translate/openai.html",
          });
          return;
        }
        if (streamData.text !== undefined) {
          parser.feed(streamData.text);
        }
      },
      handler: (result) => {
        if (result.response.statusCode >= 400) {
          handleGeneralError(query, result);
          return;
        }
        parser.reset();
        accumulated = "";
        reasoning = "";
      },
    });
  } catch (error: unknown) {
    handleGeneralError(query, {
      type: "api",
      message: error instanceof Error ? error.message : "Unknown error",
      addition: "翻译过程中发生错误",
    } as ServiceError);
  }
}

/**
 * Deliver the final payload: parse dict output for word lookups, cache only
 * successful results, and surface parse failures as errors carrying the raw
 * model output (ADR-003).
 */
function completeOnce(
  query: TextTranslateQuery,
  text: string,
  wordLookup: boolean,
  finishReason?: string,
) {
  try {
    const payload = buildResult(query, text, wordLookup);
    setCachedResult(query, text);
    query.onCompletion(payload);
  } catch (error) {
    if (!(error instanceof DictParseError)) throw error;
    const detail = [
      finishReason && `finish_reason: ${finishReason}`,
      `模型原始输出（结尾 300 字符）: …${error.raw.slice(-300)}`,
    ]
      .filter(Boolean)
      .join("\n");
    handleGeneralError(query, {
      type: "api",
      message: "词典结果解析失败 - 模型未返回有效的 JSON 词典数据",
      addition: detail,
    } as ServiceError);
  }
}
