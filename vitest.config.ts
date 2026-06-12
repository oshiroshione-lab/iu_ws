import { defineConfig } from "vitest/config";
import path from "node:path";

// テストの設定。`@/...` のインポートを本体と同じように解決できるようにする。
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd()),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
