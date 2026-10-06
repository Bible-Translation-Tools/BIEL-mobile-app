import { defineConfig } from 'oxlint';
import native from 'oxlint-config-universe/native';

// Replaces eslint.config.js (eslint-config-expo + the architecture rules from #5).
// Starts from Expo's own oxlint preset, then adds back what eslint-config-expo had and ports the
// layer boundaries one-to-one.

const layer = (...names: string[]) => names.flatMap((name) => [name, `${name}/**`]);

const FEATURE_BARREL = {
  regex: '^@/features/[^/]+$',
  message: "Inside features, import the sibling file directly, not another feature's index.",
};
const FEATURE_INTERNALS = {
  regex: '^@/features/[^/]+/.+',
  message: "Import features through their index (e.g. '@/features/downloads').",
};

export default defineConfig({
  extends: [native],
  // eslint-plugin-expo through oxlint's ESLint-compatible JS plugin API (alpha: versions pinned).
  jsPlugins: ['eslint-plugin-expo'],
  ignorePatterns: ['android/**', 'ios/**', 'dist/**', '.expo/**', '.verify/**'],
  rules: {
    // eslint-config-expo: expo/* rules.
    'expo/use-dom-exports': 'error',
    'expo/no-env-var-destructuring': 'error',
    'expo/no-dynamic-env-var': 'error',

    // `void promise()` marks fire-and-forget calls; the default fix ("use undefined") would break them.
    'no-void': ['warn', { allowAsStatement: true }],

    // eslint-config-expo uses react-hooks/recommended; the universe preset turns this off.
    'react/exhaustive-deps': 'warn',

    // React Compiler rules (react-hooks v7 recommended). app.json enables the compiler, so code it
    // can't optimize should be flagged.
    'react/error-boundaries': 'warn',
    'react/globals': 'warn',
    'react/immutability': 'warn',
    'react/incompatible-library': 'warn',
    'react/preserve-manual-memoization': 'warn',
    'react/purity': 'warn',
    'react/refs': 'warn',
    'react/set-state-in-effect': 'warn',
    'react/set-state-in-render': 'warn',
    'react/static-components': 'warn',

    // Architecture (from #5's eslint.config.js).
    'import/no-cycle': 'error',
  },
  overrides: [
    {
      files: ['scripts/**'],
      globals: { __dirname: 'readonly', require: 'readonly', process: 'readonly' },
    },
    {
      // Pure rules: may import @/types only.
      files: ['src/domain/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  ...layer(
                    '@/api',
                    '@/services',
                    '@/db',
                    '@/features',
                    '@/hooks',
                    '@/stores',
                    '@/components',
                  ),
                  'react',
                  'react-*',
                  'expo',
                  'expo-*',
                ],
              },
            ],
          },
        ],
      },
    },
    {
      // Adapters sit below features and must not reach into UI or state.
      files: ['src/{api,services,db}/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  ...layer('@/features', '@/hooks', '@/stores', '@/components', '@/i18n'),
                  '@/constants/theme',
                ],
              },
            ],
          },
        ],
      },
    },
    {
      // Application layer. Download notifications render OS notifications outside React, so that
      // file keeps i18n (next override).
      files: ['src/features/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  ...layer('@/hooks', '@/stores', '@/components', '@/i18n'),
                  '@/constants/theme',
                ],
              },
              FEATURE_BARREL,
            ],
          },
        ],
      },
    },
    {
      files: ['src/features/downloads/notifications.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: [...layer('@/hooks', '@/stores', '@/components'), '@/constants/theme'] },
              FEATURE_BARREL,
            ],
          },
        ],
      },
    },
    {
      files: ['src/{app,components,hooks,stores,contexts}/**'],
      rules: {
        'no-restricted-imports': ['error', { patterns: [FEATURE_INTERNALS] }],
      },
    },
    {
      files: ['src/types/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          { patterns: [{ group: [...layer('@/hooks', '@/components'), '@/constants/theme'] }] },
        ],
      },
    },
  ],
});
