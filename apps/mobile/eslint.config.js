const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  { ignores: ["android/**", "ios/**", "artifacts/**", ".expo/**"] },
  expoConfig,
  { files: ["metro.config.cjs"], languageOptions: { globals: { __dirname: "readonly" } } },
]);
