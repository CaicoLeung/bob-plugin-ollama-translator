#!/usr/bin/env zx

import { rollup } from "rollup";
import { loadConfigFile } from "rollup/loadConfigFile";
import { $ } from "zx";
import { path } from "zx";

const root = path.resolve(process.cwd(), "rollup.config.ts");
const { options, warnings } = await loadConfigFile(root, { format: "cjs" });

warnings.flush();

for (const option of options) {
  const bundle = await rollup(option);
  for (const output of option.output) {
    await bundle.write(output);
  }
}

await $`zip dist/bob-plugin-ollama-explainer.bobplugin dist/*`;
