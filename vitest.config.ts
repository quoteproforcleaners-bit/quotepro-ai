import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["shared/**/*.test.ts", "server/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["shared/pricingEngine.ts"],
      thresholds: {
        lines: 90,
      },
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
