import { ServiceError, TextTranslateQuery } from "@bob-translate/types";
import { handleGeneralError } from "./util";
import { ServiceBaseUrl } from "./constants";
import { useRecords } from "./uses/useRecords";
import { preCheck } from "./precheck";
import { useParams } from "./uses/useParams";
import { useParse } from "./uses/useParse";

export async function translate(query: TextTranslateQuery) {
  const { service, baseUrl, apiKey } = $option;
  const url = ServiceBaseUrl[service as keyof typeof ServiceBaseUrl] || baseUrl;

  const { addRecord, getRecord, hasRecord } = useRecords(query);
  const { params } = useParams(query);
  let currentDelta = "";

  const { parser } = useParse({
    onStream: (chunk) => {
      const finish_reason = chunk.choices[0].finish_reason;
      const content = chunk.choices[0].delta?.content || "";
      currentDelta += content;

      switch (finish_reason) {
        case "stop":
          // 正常结束，返回完整的翻译结果
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
          break;
        case "length":
          // 达到最大长度限制
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
          break;
        case "content_filter":
          // 内容被过滤
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
          break;
        case "tool_calls":
        case "function_call":
          // API调用相关，一般不会在翻译中出现
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
    preCheck(query);

    $http.streamRequest({
      method: "POST",
      url: url!,
      timeout: 30,
      cancelSignal: query.cancelSignal,
      header: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: params,
      streamHandler: (streamData) => {
        if (streamData.text?.includes("Invalid token")) {
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
