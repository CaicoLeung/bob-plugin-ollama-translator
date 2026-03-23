import { ServiceError, TextTranslateQuery } from "@bob-translate/types";
import { handleGeneralError } from "./util";
import { getApiKey, getServiceUrl } from "./service";
import { getCachedResult, setCachedResult } from "./cache";
import { preCheck } from "./precheck";
import { buildRequestParams } from "./params";
import { createStreamParser } from "./parser";

const FINISH_SUFFIXES: Record<string, string> = {
  length: "\n[翻译被截断：达到最大长度限制]",
  content_filter: "\n[翻译被过滤：可能包含不适当内容]",
  tool_calls: "\n[不支持的响应类型]",
  function_call: "\n[不支持的响应类型]",
};

function buildResult(query: TextTranslateQuery, text: string) {
  return {
    result: {
      thinkInfo: { splitThinkTag: true },
      from: query.detectFrom,
      to: query.detectTo,
      toParagraphs: [text],
    },
  };
}

export async function translate(query: TextTranslateQuery) {
  const { service = "ollama" } = $option;
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

  const cached = getCachedResult(query);
  if (cached !== null) {
    query.onCompletion(buildResult(query, cached));
    return;
  }

  if (!preCheck(query)) return;

  const { params } = buildRequestParams(query);
  let accumulated = "";
  let completed = false;

  const complete = (text: string) => {
    if (completed) return;
    completed = true;
    setCachedResult(query, text);
    query.onCompletion(buildResult(query, text));
  };

  const parser = createStreamParser({
    onChunk: (chunk) => {
      if (!chunk.choices?.length) return;

      const { finish_reason, delta } = chunk.choices[0];
      accumulated += delta?.content || "";

      if (finish_reason === "stop") {
        complete(accumulated);
      } else if (finish_reason && FINISH_SUFFIXES[finish_reason]) {
        complete(accumulated + FINISH_SUFFIXES[finish_reason]);
      } else if (!finish_reason) {
        query.onStream(buildResult(query, accumulated));
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
            troubleshootingLink: "https://bobtranslate.com/service/translate/openai.html",
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