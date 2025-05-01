import { ServiceError } from "@bob-translate/types";

// 扩展 Bob 的 TextTranslateResult 类型
declare module "@bob-translate/types" {
  // 思考过程信息对象 (Bob 1.15.0+)
  export interface ThinkInfo {
    content?: string;
    splitThinkTag?: boolean;
  }

  // TTS 结果对象
  export interface TtsResult {
    type: string;
    value?: string;
    data?: ArrayBuffer;
  }

  // 音标对象
  export interface PhoneticObject {
    type: 'us' | 'uk';
    value?: string;
    tts?: TtsResult;
  }

  // 词性和词义对象
  export interface PartObject {
    part: string; // 如 'n.', 'adj.' 等
    means: string[];
  }

  // 单词其他形式对象
  export interface Exchange {
    name: string; // 如 '比较级', '最高级', '复数' 等
    words: string[];
  }

  // 相关单词对象
  export interface RelatedWord {
    word: string;
    means?: string[];
  }

  // 相关单词分组对象
  export interface RelatedWordPartObject {
    part?: string;
    words: RelatedWord[];
  }

  // 附加内容对象
  export interface Addition {
    name: string;
    value: string;
  }

  // 词典结果对象
  export interface ToDictObject {
    word: string;
    phonetics: PhoneticObject[];
    parts: PartObject[];
    exchanges?: Exchange[];
    relatedWords?: RelatedWordPartObject[];
    additions?: Addition[];
  }

  // 扩展 TextTranslateResult 接口
  export interface TextTranslateResult {
    from: string;
    to: string;
    fromParagraphs?: string[];
    toParagraphs?: string[];
    toDict: ToDictObject;
    fromTTS?: TtsResult;
    toTTS?: TtsResult;
    thinkInfo?: ThinkInfo; // Bob 1.15.0+ 新增
    raw?: Record<string, unknown>;
  }

  // 扩展 TextTranslateQuery 接口以包含新的回调方法
  export interface TextTranslateQuery {
    text: string;
    from: string;
    to: string;
    detectFrom: string;
    detectTo: string;
    onCompletion: (completionResult: { result: TextTranslateResult }) => void;
    onStream?: (streamResult: { result: TextTranslateResult }) => void;
    onError?: (error: ServiceError) => void;
    cancelSignal?: AbortSignal;
  }
}
