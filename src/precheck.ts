import { TextTranslateQuery } from "@bob-translate/types";
import { handleGeneralError } from "./util";
import { langMap } from "./lang";
import { asProvider, getModel } from "./service";

export function preCheck(query: TextTranslateQuery): boolean {
  const { baseUrl } = $option;
  const service = asProvider($option.service);

  // getModel resolves "" only when a provider's menu is on "custom" with no
  // custom-model text filled in (every provider has a defaultValue otherwise).
  if (!getModel(service)) {
    handleGeneralError(query, {
      type: "param",
      message: "配置错误 - 请确保您在插件配置中填入了正确的自定义模型名称",
      addition: `请在插件配置中填写 ${service} 服务对应的自定义模型名称`,
    });
    return false;
  }

  if (service === "other" && !baseUrl) {
    handleGeneralError(query, {
      type: "param",
      message: "配置错误 - 请确保您在插件配置中填入了Base Url",
      addition: "请在插件配置中填写Base Url",
    });
    return false;
  }

  if (!langMap.get(query.detectTo)) {
    handleGeneralError(query, {
      type: "unsupportedLanguage",
      message: "不支持该语种",
      addition: "不支持该语种",
    });
    return false;
  }

  return true;
}
