module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  parserOptions: {
    parser: 'babel-eslint'
  },
  extends: [
    '@nuxtjs',
    'plugin:nuxt/recommended'
  ],
  // add your custom rules here
  rules: {
    "vue/html-closing-bracket-newline":
      ["error", {
        "singleline": "never",
        "multiline": "never"
      }],
    "vue/max-attributes-per-line": [
      "error",
      {
        "singleline": 3,
        "multiline": {
          "max": 2,
          "allowFirstLine": true
        }
      }
    ],
    "vue/no-v-html": 0,
    "no-multiple-empty-lines": [
      "error", {
        "max": 1
      }
    ],
    "comma-dangle": ["error", "always-multiline"]
  },
}
