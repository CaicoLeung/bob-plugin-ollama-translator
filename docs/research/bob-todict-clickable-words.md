# Bob `toDict` clickable-word capability — research findings

> NOTE: `docs/research/` is a new directory (repo previously had `docs/decisions/`, `docs/glossary.md`, `docs/agents/` only).
> Primary source (owns the spec): <https://bobtranslate.com/plugin/object/translateresult.html> — read in full 2026-08-15.

## TL;DR

Bob's plugin spec has **no dedicated "clickable word" field**. Clickability is **implicit in the `toDict` structure**: Bob renders certain string fields as link-styled words, and clicking one re-queries it. For an English word-lookup plugin the two relevant spots are:

1. `toDict.exchanges[].words[]` — plain `string` array (e.g. `better`, `best`, `goods`)
2. `toDict.relatedWordParts[].words[].word` — `word` field of each related-word object (e.g. `anger`, `rage`, …)

Both carry **plain strings, no nested click object, no URL, no callback id**. The plugin only needs to emit words in these fields; Bob does the rest.

## Exact JSON structure (verbatim from the docs)

### `toDict` object

| 属性               | 类型   | 说明                                                          |
| ------------------ | ------ | ------------------------------------------------------------- |
| `word`             | string | 单词/词组，一般英文查词会有。 **Bob 0.6.0+ 可用**             |
| `phonetics`        | array  | 音标数据数组，见 phonetic object                              |
| `parts`            | array  | 词性词义数组，见 part object                                  |
| `exchanges`        | array  | 其他形式数组，见 exchange object                              |
| `relatedWordParts` | array  | 相关的单词数组，一般中文查词会有，见 related word part object |
| `additions`        | array  | 附加内容数组，见 addition object                              |

### `exchange object` — clickable words live here (EN lookup)

| 属性    | 类型                | 说明                                 |
| ------- | ------------------- | ------------------------------------ |
| `name`  | string              | 形式的名字，例如 `比较级`、`最高级`… |
| `words` | **array of string** | 该形式对应的单词数组，一般只有一个   |

### `related word part object` / `related word object` — clickable words live here (ZH lookup)

| 属性    | 类型                         | 说明                               |
| ------- | ---------------------------- | ---------------------------------- |
| `part`  | string                       | 词性。如果无法获取可以不传         |
| `words` | array of related word object | 相关单词，`words` 至少要有一个元素 |

| 属性    | 类型            | 说明                   |
| ------- | --------------- | ---------------------- |
| `word`  | string          | 单词本身。**必须有值** |
| `means` | array of string | 词义。可以不传         |

### Fields that are NOT clickable-capable

- `phonetics[].value` — plain phonetic string (`type` required; `value` or `tts` at least one)
- `parts[].part` / `parts[].means[]` — 词性 + plain-string 词义 array (`{"part": "adj.", "means": ["好的", ...]}`)
- `additions[]` — `{"name": string, "value": string}` free-form blocks (例句、记忆技巧等); rendered as text
- `word` itself (the headword) — plain display string

Docs verbatim example («翻译 good», abridged to the clickable-relevant parts — full JSON on the source page):

```json
{
  "toDict": {
    "word": "good",
    "phonetics": [
      {
        "type": "us",
        "value": "ɡʊd",
        "tts": { "type": "url", "value": "http://xxxxxxxxxx..." }
      },
      {
        "type": "uk",
        "value": "ɡʊd",
        "tts": { "type": "url", "value": "http://xxxxxxxxxx..." }
      }
    ],
    "parts": [
      { "part": "adj.", "means": ["好的", "优良的", "愉快的", "虔诚的"] }
    ],
    "exchanges": [
      { "name": "比较级", "words": ["better"] },
      { "name": "最高级", "words": ["best"] },
      { "name": "复数", "words": ["goods"] }
    ],
    "additions": [{ "name": "标签", "value": "初中/高中/CET4/CET6/考研" }]
  }
}
```

Docs verbatim example («翻译 愤怒», abridged):

```json
{
  "toDict": {
    "relatedWordParts": [
      {
        "part": "名词",
        "words": [
          {
            "word": "anger",
            "means": ["愤怒", "怒", "怒气", "怒火", "愤", "火气"]
          },
          {
            "word": "rage",
            "means": ["愤怒", "怒气", "怒", "怒火", "盛怒", "忿怒"]
          }
        ]
      },
      {
        "part": "形容词",
        "words": [{ "word": "angry", "means": ["愤怒", "生气", "恼怒"] }]
      }
    ]
  }
}
```

## Click behavior

**Not documented on the spec page.** The docs' own example screenshots (<https://cdn.ripperhe.com/oss/master/2022/0728/translate-example-1.jpg>, `translate-example-2.jpg`) show the words from `exchanges[].words[]` and `relatedWordParts[].words[].word` rendered in Bob's link style, distinct from plain means/labels.

[INFERENCE — app behavior, not spec text] Clicking one of those words makes Bob run a **new query with that word as the input text**, routed through the **currently selected service** of the relevant type (text-translate or dictionary service as configured in 偏好设置-服务). There is **no per-plugin click callback**: the plugin is simply re-invoked (its `translate(query, completion)` handler) with `query.text` = clicked word, exactly like a fresh lookup. Practical consequence for our plugin: the word-lookup prompt must tolerate arbitrary single words as input — which it already does by design.

No `minBobVersion` constraint is attached to `exchanges` / `relatedWordParts` / `parts` in the docs. Version gates that do exist:

- `toDict.word`: **Bob 0.6.0+** (docs table)
- `toDict` accepted as alternative to `toParagraphs`: **Bob 1.6.0+** (docs callout: "Bob 1.6.0 及之后的版本，翻译结果中 `toParagraphs` 和 `toDict` 任意一个有值即可") — this is the effective floor for shipping a dict-only result, so `minBobVersion: 1.6.0` (as an info.json string) covers everything we use.

## Implication for this plugin (word-lookup → toDict)

- For EN→ZH lookup: emit `exchanges` (derivational/inflectional forms from the LLM, e.g. 比较级/最高级/复数/第三人称单数/过去式) — those become clickable.
- To make LLM-proposed synonyms/related words clickable, put them in `relatedWordParts` (grouped by 词性, `word` required, `means` optional) rather than `additions` — `additions` renders as plain text.
- No schema extension or extra field is needed; Bob-side behavior is free once the words are in the right fields.

## Sources

- Translate result spec (primary, all tables/JSON quoted from here): <https://bobtranslate.com/plugin/object/translateresult.html>
- Example screenshots referenced by that page: <https://cdn.ripperhe.com/oss/master/2022/0728/translate-example-1.jpg>, `.../translate-example-2.jpg`
- Official plugin template (no click-related code; confirms no plugin-side click API): <https://github.com/ripperhe/bob-plugin-template>
- Sitemap scan of bobtranslate.com/plugin/\* (2026-08-15): no other page documents dict click behavior.
