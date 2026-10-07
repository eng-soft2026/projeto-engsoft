import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";

export default [
    {
        ignores: [".next/", "node_modules/", "coverage/", "src/domain/"],
    },
    js.configs.recommended,
    nextPlugin.configs["core-web-vitals"],
    {
        files: ["**/*.{js,jsx,mjs}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            "no-inline-comments": "error",
            "@next/next/no-html-link-for-pages": "off",
        },
    },
];
