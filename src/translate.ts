import { ServiceError, TextTranslateQuery } from "@bob-translate/types";
import {
  generatePrompt,
  generateSetKey,
  generateSystemPrompt,
  handleGeneralError,
} from "./util";
import { langMap } from "./lang";
import { ServiceBaseUrl } from "./constants";
import {
  EventSourceParser,
  createParser,
  EventSourceMessage,
} from "eventsource-parser";
import { OpenAI } from "openai";
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
      service,
      apiUrl,
      apiKey,
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
      return;
    }

    if (service === "other" && !apiUrl) {
      handleGeneralError(query, {
        type: "param",
        message: "配置错误 - 请确保您在插件配置中填入了Api url",
        addition: "请在插件配置中填写Api url",
      });
      return;
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
    const url =
      ServiceBaseUrl[service as keyof typeof ServiceBaseUrl] || apiUrl;

    const parser: EventSourceParser = createParser({
      onEvent: (event: EventSourceMessage) => {
        $log.info("Received event!");
        $log.info("id: " + event.id || "<none>");
        $log.info("event: " + event.event || "<none>");
        $log.info("data: " + event.data);

        const chunk = JSON.parse(event.data) as OpenAI.Chat.ChatCompletionChunk;
        const delta = chunk.choices[0].delta.content;
        targetText += delta;
        query.onStream({
          result: {
            from: query.detectFrom,
            to: query.detectTo,
            toParagraphs: [targetText],
          },
        });
      },
      onRetry(retryInterval) {
        $log.info("Server requested retry interval of " + retryInterval + "ms");
      },
      onError: (error) => {
        query.onCompletion({
          result: {
            from: query.detectFrom,
            to: query.detectTo,
            toParagraphs: [error.message],
          },
        });
      },
    });

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
          parser.feed(streamData.text);
        }
      },
      handler: (result) => {
        if (result.response.statusCode >= 400) {
          handleGeneralError(query, result);
        } else {
          parser.reset();
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
        targetText = "";
      },
    });
  } catch (error) {
    handleGeneralError(query, error as ServiceError);
  }
}