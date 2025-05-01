declare const $option: {
  apiKey: string;
  service?: string;
  apiUrl?: string;
  model?: string;
  customModel?: string;
  pattern?: 'translate' | 'interpret';
  prompt?: string;
};

export interface Tt {
  type: string;
  value: string;
}

export interface Phonetic {
  type: string;
  value: string;
  tts: Tt;
}

export interface Part {
  part: string;
  means: string[];
}

export interface Exchange {
  name: string;
  words: string[];
}

export interface Addition {
  name: string;
  value: string;
}

export interface ToDict {
  word: string;
  phonetics: Phonetic[];
  parts: Part[];
  exchanges: Exchange[];
  additions: Addition[];
}

export interface FromTT {
  type: string;
  value: string;
}

export interface ToTT {
  type: string;
  value: string;
}

export type Raw = unknown;

export interface ToDictResult {
  from: string;
  to: string;
  fromParagraphs: string[];
  toParagraphs: string[];
  toDict: ToDict;
  fromTTS: FromTT;
  toTTS: ToTT;
  raw: Raw;
}