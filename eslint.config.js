import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nodePlugin from 'eslint-plugin-n';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  {
    ignores: [
      'lib/**',
      'demo/lib/**',
      'src/types/global.d.ts',
      'scripts/**',
      '.eslintcache',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  nodePlugin.configs['flat/recommended-module'],
  prettierRecommended,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.json'],
      },
    },
    rules: {
      'prettier/prettier': 'warn',
      'n/no-missing-import': 'off',
      'n/no-empty-function': 'off',
      'n/no-unsupported-features/es-syntax': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      'n/no-missing-require': 'off',
      'n/no-extraneous-import': 'off',
      'n/hashbang': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Tests legitimately do unsafe things (mocks, dynamic dispatch, casts).
    // Match the original `eslint ./src/` scope by relaxing type-checked
    // rules in test files.
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  }
);
