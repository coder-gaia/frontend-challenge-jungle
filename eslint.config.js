import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'lighthouse/reports',
      'public/mockServiceWorker.js',
      'src/routeTree.gen.ts',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      // Rótulos que envolvem o controle e têm texto em elementos aninhados.
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either', depth: 4 }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/mocks/*', '**/mocks/*'],
              message:
                'A UI não pode importar a camada de mocks. Use a API REST/Socket.IO (os mocks atuam na rede).',
            },
          ],
        },
      ],
    },
  },
  {
    // Componentes gerados pelo shadcn/ui seguem o padrão upstream.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'jsx-a11y/heading-has-content': 'off',
      'jsx-a11y/anchor-has-content': 'off',
    },
  },
  {
    // A camada de mocks e o bootstrap podem importar os próprios módulos.
    files: ['src/mocks/**/*.{ts,tsx}', 'src/main.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['tests/**/*.ts', 'scripts/**/*.{ts,mjs,js}', '*.config.{ts,js}', 'lighthouse/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-restricted-imports': 'off', 'react-hooks/rules-of-hooks': 'off' },
  },
)
