import { ServiceError, TextTranslateQuery } from "@bob-translate/types";
import { handleGeneralError } from "./util";
import { ServiceBaseUrl } from "./constants";
import { useRecords } from "./uses/useRecords";
import { preCheck } from "./precheck";
import { useParams } from "./uses/useParams";
import { useParse } from "./uses/useParse";

// 根据服务类型获取对应的 API Key
function getApiKeyByService(service: string): string {
  const {
    openaiApiKey,
    grokApiKey,
    claudeApiKey,
    deepseekApiKey,
    geminiApiKey,
    otherApiKey,
  } = $option;

  const apiKeyMap: Record<string, string> = {
    openai: openaiApiKey || "",
    grok: grokApiKey || "",
    claude: claudeApiKey || "",
    deepseek: deepseekApiKey || "",
    gemini: geminiApiKey || "",
    other: otherApiKey || "",
    ollama: "", // Ollama 不需要 API Key
  };

  return apiKeyMap[service] || "";
}

export async function translate(query: TextTranslateQuery) {
  const { service = "ollama", baseUrl } = $option;
  const url = ServiceBaseUrl[service as keyof typeof ServiceBaseUrl] || baseUrl;
  const apiKey = getApiKeyByService(service);

  // 检查 URL 是否有效
  if (!url) {
    handleGeneralError(query, {
      type: "param",
      message: "配置错误 - 请确保您在插件配置中填入了正确的 Base URL",
      addition: "请在插件配置中填写 Base URL",
    });
    return;
  }

  const { addRecord, getRecord, hasRecord } = useRecords(query);
  const { params, isIncremental } = useParams(query);
  let currentDelta = "";
  let isCompleted = false; // 防止重复调用 onCompletion

  const { parser } = useParse({
    onStream: (chunk) => {
      // 检查 chunk.choices 是否存在且不为空
      if (!chunk.choices || chunk.choices.length === 0) {
        return;
      }

      const finish_reason = chunk.choices[0].finish_reason;
      const content = chunk.choices[0].delta?.content || "";
      if (isIncremental) {
        currentDelta += content;
      } else {
        currentDelta = content;
      }

      switch (finish_reason) {
        case "stop":
          // 正常结束，返回完整的翻译结果
          if (!isCompleted) {
            isCompleted = true;
            addRecord(currentDelta);
            query.onCompletion({
              result: {
                thinkInfo: {
                  splitThinkTag: true,
                },
                from: query.detectFrom,
                to: query.detectTo,
                toParagraphs: [currentDelta],
              },
            });
          }
          break;
        case "length":
          // 达到最大长度限制
          if (!isCompleted) {
            isCompleted = true;
            currentDelta += "\n[翻译被截断：达到最大长度限制]";
            query.onCompletion({
              result: {
                thinkInfo: {
                  splitThinkTag: true,
                },
                from: query.detectFrom,
                to: query.detectTo,
                toParagraphs: [currentDelta],
              },
            });
          }
          break;
        case "content_filter":
          // 内容被过滤
          if (!isCompleted) {
            isCompleted = true;
            currentDelta += "\n[翻译被过滤：可能包含不适当内容]";
            query.onCompletion({
              result: {
                thinkInfo: {
                  splitThinkTag: true,
                },
                from: query.detectFrom,
                to: query.detectTo,
                toParagraphs: [currentDelta],
              },
            });
          }
          break;
        case "tool_calls":
        case "function_call":
          // API调用相关，一般不会在翻译中出现
          if (!isCompleted) {
            isCompleted = true;
            currentDelta += "\n[不支持的响应类型]";
            query.onCompletion({
              result: {
                thinkInfo: {
                  splitThinkTag: true,
                },
                from: query.detectFrom,
                to: query.detectTo,
                toParagraphs: [currentDelta],
              },
            });
          }
          break;
        default:
          // 继续累积翻译内容
          query.onStream({
            result: {
              thinkInfo: {
                splitThinkTag: true,
              },
              from: query.detectFrom,
              to: query.detectTo,
              toParagraphs: [currentDelta],
            },
          });
          break;
      }
    },
    onError: (error: unknown) => {
      handleGeneralError(query, {
        type: "api",
        message: error instanceof Error ? error.message : "Unknown error",
        addition: "翻译过程中发生错误",
      } as ServiceError);
    },
  });

  try {
    if (hasRecord()) {
      const record = getRecord();
      if (record) {
        query.onCompletion({
          result: {
            thinkInfo: {
              splitThinkTag: true,
            },
            from: query.detectFrom,
            to: query.detectTo,
            toParagraphs: [record],
          },
        });
        return;
      }
    }

    // 预检查
    if (!preCheck(query)) {
      return;
    }

    $http.streamRequest({
      method: "POST",
      url: url,
      timeout: 30,
      cancelSignal: query.cancelSignal,
      header: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: params,
      streamHandler: (streamData) => {
        if (/Invalid token/ig.test(streamData.text || "")) {
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
        currentDelta = "";
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
