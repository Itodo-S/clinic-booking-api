import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    env: loadEnv("test", process.cwd(), ""),
    // Every test file resets the same database, so files must not run concurrently.
    fileParallelism: false,
  },
});
