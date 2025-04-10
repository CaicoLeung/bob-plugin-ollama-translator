import { ServiceError, TextTranslateQuery } from "@bob-translate/types";
import {
  generatePrompt,
  generateSetKey,
  generateSystemPrompt,
  handleGeneralError,
} from "./util";
import { langMap } from "./lang";

const records = new Map<string, string>();
const maxRecords = 100;

export async function translate(query: TextTranslateQuery) {
  try {
    if (records.has(generateSetKey(query))) {
      const record = records.get(generateSetKey(query));
      if (record) {
        query.onCompletion({
          result: {
            from: query.detectFrom,
            to: query.detectTo,
            toParagraphs: [record],
          },
        });
      }
      return;
    }
    if (!langMap.get(query.detectTo)) {
      handleGeneralError(query, {
        type: "unsupportedLanguage",
        message: "不支持该语种",
        addition: "不支持该语种",
      });
    }

    const {
      service = "ollama",
      apiUrl,
      apiKey = "ollama",
      model,
      customModel,
    }: {
      service?: string;
      apiUrl?: string;
      apiKey?: string;
      model?: string;
      customModel?: string;
    } = $option;

    const isCustomModelRequired = model === "custom";
    if (isCustomModelRequired && !customModel) {
      handleGeneralError(query, {
        type: "param",
        message: "配置错误 - 请确保您在插件配置中填入了正确的自定义模型名称",
        addition: "请在插件配置中填写自定义模型名称",
      });
    }

    const params = {
      model: model === "custom" ? customModel : model,
      stream: true,
      messages: [
        {
          role: "system",
          content: generateSystemPrompt(query),
        },
        {
          role: "user",
          content: generatePrompt(query),
        },
      ],
    };

    let targetText = ""; // 初始化拼接结果变量
    let buffer = ""; // 新增 buffer 变量
    const url =
      apiUrl ||
      (service === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : "http://localhost:11434/v1/chat/completions");

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
        if (streamData.text?.includes("Invalid token")) {
          handleGeneralError(query, {
            type: "secretKey",
            message: "配置错误 - 请确保您在插件配置中填入了正确的 API Keys",
            addition: "请在插件配置中填写正确的 API Keys",
            troubleshootingLink:
              "https://bobtranslate.com/service/translate/openai.html",
          });
        } else if (streamData.text !== undefined) {
          // 将新的数据添加到缓冲变量中
          buffer += streamData.text;
          // 检查缓冲变量是否包含一个完整的消息
          const match = buffer.match(/data: (.*?})\n/);
          if (match) {
            // 如果是一个完整的消息，处理它并从缓冲变量中移除
            const textFromResponse = match[1].trim();
            targetText = handleStreamResponse(
              query,
              targetText,
              textFromResponse,
            );
            buffer = buffer.slice(match[0].length);
          }
        }
      },
      handler: (result) => {
        if (result.response.statusCode >= 400) {
          handleGeneralError(query, result);
        } else {
          query.onCompletion({
            result: {
              from: query.detectFrom,
              to: query.detectTo,
              toParagraphs: [targetText],
            },
          });
          records.set(generateSetKey(query), targetText);
          if (records.size > maxRecords) {
            // delete the oldest record
            records.delete(records.keys().next().value as string);
          }
        }
        buffer = "";
        targetText = "";
      },
    });
  } catch (error) {
    handleGeneralError(query, error as ServiceError);
  }
}

const handleStreamResponse = (
  query: TextTranslateQuery,
  targetText: string,
  textFromResponse: string,
) => {
  if (textFromResponse !== "[DONE]") {
    try {
      const dataObj = JSON.parse(textFromResponse);
      // https://github.com/openai/openai-node/blob/master/src/resources/chat/completions#L190
      const { choices } = dataObj;
      const delta = choices[0]?.delta?.content;
      if (delta) {
        targetText += delta;
        query.onStream({
          result: {
            from: query.detectFrom,
            to: query.detectTo,
            toParagraphs: [targetText],
          },
        });
      }
    } catch (error) {
      if (isServiceError(error)) {
        handleGeneralError(query, {
          type: error.type || "param",
          message: error.message || "Failed to parse JSON",
          addition: error.addition,
        });
      } else {
        handleGeneralError(query, {
          type: "param",
          message: "An unknown error occurred",
        });
      }
    }
  }
  return targetText;
};

const isServiceError = (error: unknown): error is ServiceError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ServiceError).message === "string"
  );
};
