import { defineConfig } from "rollup";
import copy from "rollup-plugin-copy";
import typescript from "@rollup/plugin-typescript";
import del from "rollup-plugin-delete";
export default defineConfig({
  input: "src/main.ts",
  output: {
    file: "dist/main.js",
    format: "cjs",
  },
  cache: true,
  plugins: [
    del({
      targets: ["dist"],
    }),
    copy({
      targets: [
        { src: "public/icon.png", dest: "dist" },
        { src: "public/info.json", dest: "dist" },
      ],
    }),
    typescript(),
  ],
});
