import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    /**
     * These tests share one live Postgres with no per-test isolation — no
     * globalSetup, no transaction rollback, no truncation. Running files in
     * parallel means one file's inserts land between another's two reads, and
     * count assertions fail for a reason that has nothing to do with the code.
     */
    fileParallelism: false,
  },
});
