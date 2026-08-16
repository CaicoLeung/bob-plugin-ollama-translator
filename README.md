# bob-plugin-ollama-translator

[![release](https://img.shields.io/github/v/release/CaicoLeung/bob-plugin-ollama-translator)](https://github.com/CaicoLeung/bob-plugin-ollama-translator/releases)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

![image](https://github.com/user-attachments/assets/8f4fb2e9-f6c0-4fb9-9783-55ce5739fbf8)

为 [Bob](https://bobtranslate.com/) 编写的 AI 翻译插件，支持 Ollama / OpenAI / DeepSeek / Grok / Claude / Gemini / 智谱 等多种 AI 服务，提供单词查询、文本翻译及百科解释（需 Bob 版本 ≥ 1.15.0）。

## 效果展示

### 翻译模式

1. 如果输入是单词，自动进入单词查询模式，返回带发音的词典卡片

   <img width="416" alt="single word mode" src="docs/screenshot/single-word-mode.png">

2. 如果是整句，则直接翻译

   <img width="415" alt="translate mode" src="docs/screenshot/translate-mode.png">

### 解释模式

  <img width="415" alt="explain mode" src="docs/screenshot/explain-mode.png">

## 功能特性

- 单词查询：单词输入自动识别，输出词典格式（释义、例句等），支持快速 / 标准 / 详尽三档详解
- 翻译模式 / 解释模式可切换
- 多服务支持：Ollama / DeepSeek / OpenAI / Grok / Claude / Gemini / 智谱 / 其他（OpenAI 兼容服务）
- 每种服务独立配置 API KEY、模型列表与自定义模型
- 自定义 Prompt、自定义 Base URL
- Thinking 开关：开启/关闭思考过程展示，关闭后直接输出结果

## 安装

1. 从 [Releases](https://github.com/CaicoLeung/bob-plugin-ollama-translator/releases/latest) 下载最新的 `.bobplugin` 文件
2. 双击文件，或通过 Bob 偏好设置 → 插件 → 从本地安装

已安装用户会通过 appcast 自动收到新版本更新。

## 配置

  <img width="455" alt="settings" src="docs/screenshot/settings.png">

1. 「服务」选择 AI 服务，默认 Ollama（本地部署，无需 API KEY）
2. 填写所选服务的 API KEY 并选择模型；模型列表之外的模型可填入「自定义模型」
3. 按需切换「模式」、编辑自定义 Prompt、修改 Base URL

## 使用 Qwen MT 翻译模型

Qwen-MT 是阿里云推出的专业机器翻译模型，基于强大的 Qwen3 模型架构，专门针对多语言翻译任务进行了优化训练。

**官方介绍**: [Qwen-MT：速度与智能翻译的完美融合](https://qwenlm.github.io/zh/blog/qwen-mt/)

### 使用注意事项

#### ⚠️ Prompt 限制

**重要**: 当使用 Qwen MT 翻译模型时，自定义 Prompt 将失效。这是因为 Qwen MT 使用专门的翻译参数来控制翻译行为，而不是通过传统的 Prompt 方式。

## License

[MIT](LICENSE)
