import { TextTranslateQuery } from "@bob-translate/types";
import { handleGeneralError } from "./util";
import { langMap } from "./lang";
import { getServiceUrl, getModel } from "./service";
import type { Provider } from "./service";

/**
 * The configuration-validation seam (see AGENTS.md): every config check
 * lives here and runs before the cache lookup, so a broken config always
 * errors consistently — the cache never masks it.
 */
export function preCheck(
  query: TextTranslateQuery,
  service: Provider,
): boolean {
  // SERVICE_BASE_URLS covers every provider except `other`, so this is
  // "no fixed endpoint AND no user-supplied baseUrl" — one condition.
  if (!getServiceUrl(service)) {
    handleGeneralError(query, {
      type: "param",
      message: "配置错误 - 请确保您在插件配置中填入了正确的 Base URL",
      addition: "请在插件配置中填写 Base URL",
    });
    return false;
  }

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
