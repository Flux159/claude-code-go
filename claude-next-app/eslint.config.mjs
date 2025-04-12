import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const prettierConfig = {
  plugins: ["prettier-plugin-tailwindcss"],
};

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "plugin:prettier/recommended",
  ),
  {
    rules: {
      "prettier/prettier": ["error", prettierConfig],
    },
  },
];

export default eslintConfig;
