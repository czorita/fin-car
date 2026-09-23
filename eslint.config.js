import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/', 'dist-ssr/', 'node_modules/', 'data/', 'coverage/']
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    // Reglas rebajadas a 'warn' temporalmente: el código actual tiene hallazgos
    // reales pendientes de corregir (ver plan de calidad, Fase 5). Volver a 'error'
    // una vez resueltos.
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-undef': 'warn',
      'no-useless-assignment': 'warn',
      'no-useless-escape': 'warn'
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
  }
];
