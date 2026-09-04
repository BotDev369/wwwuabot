import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

// Конфіг для packages/* — воркери мають власні eslint.config.js
// (React-специфічні плагіни), і кореневий `npm run lint` викликає їх
// через `--workspaces`.
export default defineConfig([
  globalIgnores([
    "**/dist",
    "**/node_modules",
    "api-dev",
    "bot-dev",
    "web-admin-dev",
    "web-platform-dev",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
]);
