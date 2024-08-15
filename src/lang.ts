import { SupportLanguages } from './constants';

// 获取支持的语种
export function supportLanguages() {
  return SupportLanguages.map((item) => item[0]);
}

export const langMap = new Map(SupportLanguages.map(([key, value]) => [key, value]));
