/**
 * Smallest assertion-based check (no framework — see AGENTS.md "Testing &
 * QA"): exercises the result-framing interface directly, no ambient
 * globals. Run: npx tsx scripts/check-result.ts
 */
import assert from "node:assert/strict";
import { TextTranslateQuery } from "@bob-translate/types";
import { createResultFramer, isFinishWithSuffix } from "../src/result";
import { DictParseError } from "../src/dict";
import { isWordLookup, lookupEnabled } from "../src/wordlookup";
import { preCheck } from "../src/precheck";

// `wordlookup.ts` reads the ambient `$option` at call time — stub it.
(globalThis as { $option?: Record<string, string> }).$option = {
  pattern: "translate",
};

const query = {
  text: "hello",
  detectFrom: "en",
  detectTo: "zh-Hans",
  from: "en",
  to: "zh-Hans",
} as TextTranslateQuery;

const dict = {
  word: "hello",
  phonetics: [
    { type: "us", value: "həˈloʊ" },
    { type: "uk", value: "həˈləʊ" },
  ],
  parts: [{ part: "int.", means: ["你好"] }],
};

// --- finish reasons -------------------------------------------------------
assert.equal(isFinishWithSuffix("length"), true);
assert.equal(isFinishWithSuffix("stop"), false);
assert.equal(isFinishWithSuffix("made_up_reason"), false);

// --- text path: thinking on ------------------------------------------------
const on = createResultFramer(query, { thinking: true, wordLookup: false });
const streamed = on.streamFrame("hel", "thinking…", true);
assert.equal(streamed.result.toParagraphs[0], "hel");
assert.equal(streamed.result.thinkInfo.content, "thinking…");
assert.equal(streamed.result.thinkInfo.splitThinkTag, true);

// reasoning re-wrapped at completion; suffix appended for known reasons
assert.equal(
  on.compose("done", "because", "length"),
  "<think>because</think>done\n[翻译被截断：达到最大长度限制]",
);
const finalOn = on.payload(on.compose("done", "because"));
assert.equal(finalOn.result.thinkInfo.content, "");
assert.equal(finalOn.result.toParagraphs[0], "<think>because</think>done");

// --- text path: thinking off -----------------------------------------------
const off = createResultFramer(query, { thinking: false, wordLookup: false });
// leaked <think> tags stripped from the body, surfaced via thinkInfo
const stripped = off.payload("<think>secret</think>hello world");
assert.equal(stripped.result.toParagraphs[0], "hello world");
assert.equal(stripped.result.thinkInfo.content, "secret");
// reasoning deltas dropped entirely
assert.equal(off.captureReasoning({ reasoning_content: "x" }), "");
assert.equal(on.captureReasoning({ reasoning_content: "x" }), "x");
assert.equal(on.captureReasoning({ reasoning: "y" }), "y");
assert.equal(on.captureReasoning({ other: 1 }), "");

// --- word-lookup path -------------------------------------------------------
const word = createResultFramer(query, { thinking: true, wordLookup: true });
// no finish suffix — a note would corrupt the JSON
assert.equal(word.compose("{}", "r", "length"), "<think>r</think>{}");
// dict frames stream reasoning only; content-only chunks skip the frame
assert.equal(word.streamFrame("par", "r1", false), null);
const wordFrame = word.streamFrame("par", "r1", true);
assert.deepEqual(wordFrame.result.toParagraphs, []);
assert.equal(wordFrame.result.thinkInfo.content, "r1");
// dict payload parses; think block split out; TTS attached
const dictPayload = word.payload(`<think>why</think>${JSON.stringify(dict)}`);
assert.equal(dictPayload.result.toDict.word, "hello");
assert.equal(dictPayload.result.toDict.phonetics[0].tts.type, "url");
assert.ok(dictPayload.result.toDict.phonetics[0].tts.value.includes("youdao"));
assert.equal(dictPayload.result.thinkInfo.content, "why");
assert.equal(dictPayload.result.thinkInfo.splitThinkTag, false);
// parse failure is a hard error carrying the raw output
assert.throws(() => word.payload("not json"), DictParseError);

// --- word-lookup decision ---------------------------------------------------
// Text shape: single English token on the translate pattern.
assert.equal(isWordLookup(query), true);
assert.equal(isWordLookup({ ...query, text: "hello world" }), false);
assert.equal(isWordLookup({ ...query, text: "don't" }), false);
assert.equal(isWordLookup({ ...query, text: "你好" }), false);
(globalThis as { $option?: Record<string, string> }).$option = {
  pattern: "interpret",
};
assert.equal(isWordLookup(query), false); // interpret never word-looks-up
(globalThis as { $option?: Record<string, string> }).$option = {
  pattern: "translate",
};
// qwen-mt exemption: translation-only models never word-look-up.
assert.equal(lookupEnabled(query, "qwen-mt-turbo"), false);
assert.equal(lookupEnabled(query, "qwen2.5:14b"), true);
assert.equal(lookupEnabled({ ...query, text: "hello world" }, "gpt-5"), false);

// --- config-validation seam ---------------------------------------------------
// preCheck's interface: (query, service) → boolean, routing the error through
// query.onCompletion. Stub $option and record completions.
const completions: Array<{ error?: { type?: string; message?: string } }> = [];
const vq = {
  ...query,
  onCompletion: (e: unknown) =>
    completions.push(e as { error?: { type?: string; message?: string } }),
} as unknown as TextTranslateQuery;
// `other` with no baseUrl → the single base-URL condition.
assert.equal(preCheck(vq, "other"), false);
assert.equal(completions[0].error?.type, "param");
assert.ok(completions[0].error?.message?.includes("Base URL"));
// Custom menu with empty custom model → model error.
(globalThis as { $option?: Record<string, string> }).$option = {
  ollamaModel: "custom",
};
assert.equal(preCheck(vq, "ollama"), false);
assert.ok(completions[1].error?.message?.includes("自定义模型名称"));
// Valid config → true, no completion fired.
(globalThis as { $option?: Record<string, string> }).$option = {
  ollamaModel: "llama3",
};
assert.equal(preCheck(vq, "ollama"), true);
assert.equal(completions.length, 2);
// Unsupported target language → unsupportedLanguage.
assert.equal(
  preCheck({ ...vq, detectTo: "klingon" } as TextTranslateQuery, "ollama"),
  false,
);
assert.equal(completions[2].error?.type, "unsupportedLanguage");

console.log("check-result: all assertions passed");
