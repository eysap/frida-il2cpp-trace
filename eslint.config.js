import tseslint from "typescript-eslint";

const fridaGlobals = {
  Backtracer: "readonly",
  DebugSymbol: "readonly",
  Il2Cpp: "readonly",
  Interceptor: "readonly",
  Process: "readonly",
  Thread: "readonly",
  URL: "readonly",
  clearInterval: "readonly",
  console: "readonly",
  globalThis: "readonly",
  int64: "readonly",
  process: "readonly",
  setInterval: "readonly",
  uint64: "readonly",
};

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: fridaGlobals,
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "no-constant-condition": ["error", { "checkLoops": false }],
      "no-duplicate-imports": "error",
      "no-undef": "error",
      "no-unreachable": "error",
      "no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "caughtErrors": "none",
          "varsIgnorePattern": "^_"
        }
      ],
      "no-useless-escape": "error"
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.ts"],
  })),
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: fridaGlobals,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
