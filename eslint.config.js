// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

const layer = (...names) => names.flatMap((name) => [name, `${name}/**`]);

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["scripts/**"],
    languageOptions: { globals: { __dirname: "readonly", require: "readonly", process: "readonly" } },
  },
  {
    // Pure rules: may import @/types only.
    files: ["src/domain/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          ...layer("@/api", "@/services", "@/db", "@/hooks", "@/stores", "@/components"),
          "react", "react-*", "expo", "expo-*",
        ],
      }],
    },
  },
  {
    // I/O layers must not reach into UI or state. The notification service renders
    // OS notifications outside React, so it keeps i18n.
    files: ["src/{api,services,db}/**"],
    ignores: ["src/services/download-notification-service.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          ...layer("@/hooks", "@/stores", "@/components", "@/i18n"),
          "@/constants/theme",
        ],
      }],
    },
  },
  {
    files: ["src/types/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [...layer("@/hooks", "@/components"), "@/constants/theme"],
      }],
    },
  },
  {
    rules: { "import/no-cycle": "error" },
  },
]);
