import { ServiceError, TextTranslateQuery } from "@bob-translate/types";
import { handleGeneralError } from "./util";
import {
  getApiKey,
  getServiceUrl,
  asProvider,
  thinkingEnabled,
} from "./service";
import { getCachedResult, setCachedResult } from "./cache";
import { preCheck } from "./precheck";
import { buildRequestParams } from "./params";
import { createStreamParser } from "./parser";
import { DictParseError } from "./dict";
import { createResultFramer, isFinishWithSuffix } from "./result";

/** Delivery: render the composed text through the result framer, cache only
 *  successful results, and surface parse failures as errors carrying the raw
 *  model output (ADR-003). Cache hits replay through the same framer. */
function completeOnce(
  query: TextTranslateQuery,
  framer: ReturnType<typeof createResultFramer>,
  composed: string,
  wordLookup: boolean,
  finishReason?: string,
) {
  try {
    const payload = framer.payload(composed);
    setCachedResult(query, composed, wordLookup);
    query.onCompletion(payload);
  } catch (error) {
    if (error instanceof DictParseError) {
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
      return;
    }
    // Never rethrow across the Bob boundary: an unexpected failure still
    // completes the query with an error instead of escaping to Bob.
    handleGeneralError(query, {
      type: "api",
      message: error instanceof Error ? error.message : "Unknown error",
      addition: "翻译过程中发生错误",
    } as ServiceError);
  }
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
  const framer = createResultFramer(query, {
    thinking: thinkingEnabled(),
    wordLookup,
  });

  const cached = getCachedResult(query, wordLookup);
  if (cached !== null) {
    completeOnce(query, framer, cached, wordLookup);
    return;
  }

  if (!preCheck(query)) return;

  let accumulated = "";
  let reasoning = "";
  let completed = false;

  const complete = (rawText: string, finishReason?: string) => {
    if (completed) return;
    completed = true;
    completeOnce(
      query,
      framer,
      framer.compose(rawText, reasoning, finishReason),
      wordLookup,
      finishReason,
    );
  };

  const parser = createStreamParser({
    onChunk: (chunk) => {
      if (!chunk.choices?.length) return;

      const { finish_reason, delta } = chunk.choices[0];
      accumulated += delta?.content || "";
      const deltaReasoning = framer.captureReasoning(delta);
      reasoning += deltaReasoning;

      if (finish_reason === "stop") {
        complete(accumulated);
      } else if (finish_reason && isFinishWithSuffix(finish_reason)) {
        complete(accumulated, finish_reason);
      } else if (!finish_reason) {
        const frame = framer.streamFrame(
          accumulated,
          reasoning,
          !!deltaReasoning,
        );
        if (frame) query.onStream(frame);
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
