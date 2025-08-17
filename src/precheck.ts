import { TextTranslateQuery } from "@bob-translate/types";
import { handleGeneralError } from "./util";
import { langMap } from "./lang";

export const preCheck = (query: TextTranslateQuery) => {
  const { service, baseUrl, model, customModel } = $option;

  const isCustomModelRequired = model === "custom";
  if (isCustomModelRequired && !customModel) {
    handleGeneralError(query, {
      type: "param",
      message: "配置错误 - 请确保您在插件配置中填入了正确的自定义模型名称",
      addition: "请在插件配置中填写自定义模型名称",
    });
  }

  if (service === "other" && !baseUrl) {
    handleGeneralError(query, {
      type: "param",
      message: "配置错误 - 请确保您在插件配置中填入了Base Url",
      addition: "请在插件配置中填写Base Url",
    });
  }

  if (!langMap.get(query.detectTo)) {
    handleGeneralError(query, {
      type: "unsupportedLanguage",
      message: "不支持该语种",
      addition: "不支持该语种",
    });
  }
};
