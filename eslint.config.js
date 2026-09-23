import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/', 'dist-ssr/', 'node_modules/', 'data/', 'coverage/', '.claude/']
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      // Nada de innerHTML/outerHTML: construir nodos con ui/dom.js o <template>
      'no-restricted-properties': ['error',
        { property: 'innerHTML', message: 'Usa ui/dom.js (el, createIcon) o <template> en lugar de innerHTML.' },
        { property: 'outerHTML', message: 'Usa ui/dom.js (el, createIcon) o <template> en lugar de outerHTML.' }
      ]
    }
  },
  {
    files: ['src/**/*.js'],
    ignores: ['src/server/**'],
    languageOptions: {
      globals: { ...globals.browser }
    }
  },
  {
    files: ['server.js', 'vite.config.js', 'eslint.config.js', 'src/server/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      // nodeBuiltin (no node): son módulos ESM, así que __dirname/require no existen
      globals: { ...globals.nodeBuiltin }
    }
  },
  {
    // Tests de interfaz: DOM simulado con happy-dom (tests/helpers/dom.js); las fixtures sí usan innerHTML
    files: ['tests/ui/**/*.js', 'tests/helpers/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser }
    },
    rules: {
      'no-restricted-properties': 'off'
    }
  }
];
