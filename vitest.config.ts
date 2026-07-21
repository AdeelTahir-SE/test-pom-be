import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Integration tests hit a running dev server; keep them serial & patient.
    // 45s headroom: real Deepgram/Mistral calls incur a ~10s connect-timeout
    // penalty in this sandbox (outbound network to those hosts is blocked),
    // and file-upload tests can trigger several such calls per request.
    testTimeout: 45_000,
    hookTimeout: 60_000,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup-env.ts"],
    // Each phase file manages its own data; run files sequentially to avoid
    // cross-test interference on the shared dev database.
    fileParallelism: false,
  },
});
