import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

// Frontend ESLint config (ESLint 9 flat config).
// - `files` globs explicitly include **/*.jsx: flat config only picks up
//   .js/.mjs/.cjs by default and this codebase is almost entirely JSX.
// - Browser/node es2021 globals + React recommended rules.
// - React hooks rules are explicitly registered because the plugin's
//   recommended config requires the `react-hooks` plugin name.
export default [
  { ignores: ['dist', 'node_modules', 'coverage', 'vitest.config.js'] },
  {
    files: ['**/*.{js,jsx}'],
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    ...react.configs.flat.recommended,
  },
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react/prop-types': 'off',
    },
  },
];
