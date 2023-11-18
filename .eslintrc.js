module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  ignorePatterns: ['tests/'],
  env: {
    node: true,
    es6: true,
  },
  extends: 'eslint:recommended',
  overrides: [
    {
      env: {
        node: true,
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  plugins: ['node'],
  rules: {
    'prefer-const': 2,
    'no-prototype-builtins': 'off',
    'no-var': 'error',
    'no-unused-vars': 'error',
    'no-dupe-keys': 'off',
    quotes: ['error', 'single'],
    semi: ['error', 'never'],
  },
}
