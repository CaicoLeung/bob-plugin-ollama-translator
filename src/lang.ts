import { SUPPORTED_LANGUAGES } from "./constants";

export function supportLanguages() {
  return SUPPORTED_LANGUAGES.map(([key]) => key);
}

export const langMap = new Map(SUPPORTED_LANGUAGES);