// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off', // req.user! is used deliberately after auth() guards it
      'no-console': 'off', // this is a server - logging startup/errors to console is expected
    },
  },
  {
    // Ambient type-declaration files augmenting third-party namespaces (e.g. Express.User)
    // legitimately need `declare global { namespace X {...} } ` - this is the TypeScript-
    // recommended pattern for module augmentation, not a stray namespace.
    files: ['src/**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'prisma/**'],
  },
);
