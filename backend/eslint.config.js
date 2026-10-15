import js from '@eslint/js';
import globals from 'globals';

// Backend ESLint config (ESLint 9 flat config).
// - Node/globals for the Express stack.
// - Recommended rules from @eslint/js.
// - `no-console` remains a warning so startup diagnostics are still visible.
export default [
  { ignores: ['node_modules', 'dist', 'build', 'coverage', '*.log'] },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.script,
      },
    },
  },
  {
    rules: {
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
