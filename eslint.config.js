// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

const layer = (...names) => names.flatMap((name) => [name, `${name}/**`]);

const FEATURE_BARREL = {
  regex: "^@/features/[^/]+$",
  message: "Inside features, import the sibling file directly, not another feature's index.",
};
const FEATURE_INTERNALS = {
  regex: "^@/features/[^/]+/.+",
  message: "Import features through their index (e.g. '@/features/downloads').",
};

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
          ...layer("@/api", "@/services", "@/db", "@/features", "@/hooks", "@/stores", "@/components"),
          "react", "react-*", "expo", "expo-*",
        ],
      }],
    },
  },
  {
    // Adapters sit below features and must not reach into UI or state.
    files: ["src/{api,services,db}/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          ...layer("@/features", "@/hooks", "@/stores", "@/components", "@/i18n"),
          "@/constants/theme",
        ],
      }],
    },
  },
  {
    // Application layer. Download notifications render OS notifications
    // outside React, so that file keeps i18n.
    files: ["src/features/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: [...layer("@/hooks", "@/stores", "@/components", "@/i18n"), "@/constants/theme"] },
          FEATURE_BARREL,
        ],
      }],
    },
  },
  {
    files: ["src/features/downloads/notifications.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: [...layer("@/hooks", "@/stores", "@/components"), "@/constants/theme"] },
          FEATURE_BARREL,
        ],
      }],
    },
  },
  {
    files: ["src/{app,components,hooks,stores,contexts}/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [FEATURE_INTERNALS] }],
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
