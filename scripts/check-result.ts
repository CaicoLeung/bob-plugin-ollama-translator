/**
 * Smallest assertion-based check (no framework — see AGENTS.md "Testing &
 * QA"): exercises the result-framing interface directly, no ambient
 * globals. Run: npx tsx scripts/check-result.ts
 */
import assert from "node:assert/strict";
import { TextTranslateQuery } from "@bob-translate/types";
import { createResultFramer, isFinishWithSuffix } from "../src/result";
import { DictParseError } from "../src/dict";

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

console.log("check-result: all assertions passed");
