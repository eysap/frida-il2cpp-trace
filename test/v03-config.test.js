import assert from "node:assert/strict";
import test from "node:test";

import {
  ConfigurationError,
  validateConfig,
} from "../src/shared/config.ts";

test("v0.3 config normalization is immutable and strips .dll suffixes", () => {
  const raw = {
    target: {
      assembly: "Assembly-CSharp.dll",
      fullName: "Example.Network.ApiClient",
    },
    filters: { methodRegex: "^(Send|Receive)" },
  };

  const config = validateConfig(raw);

  assert.equal(config.target.assembly, "Assembly-CSharp");
  assert.equal(config.target.namespace, "Example.Network");
  assert.equal(config.target.className, "ApiClient");
  assert.equal(config.performance.maxHooks, 300);
  assert.equal(raw.target.assembly, "Assembly-CSharp.dll");
});

test("v0.3 config accepts a fully-qualified value in className", () => {
  const config = validateConfig({
    target: {
      assembly: "Core.dll",
      className: "Core.UILogic.Fight.UITimeline",
    },
  });

  assert.equal(config.target.assembly, "Core");
  assert.equal(config.target.namespace, "Core.UILogic.Fight");
  assert.equal(config.target.className, "UITimeline");
});

test("v0.3 config validation reports all unsafe values before injection", () => {
  assert.throws(
    () => validateConfig({
      target: {},
      filters: { methodRegex: "[" },
      performance: { hookDelayMs: -1, maxHooks: 0 },
      logging: { maxArgs: -2 },
    }),
    (error) => {
      assert.ok(error instanceof ConfigurationError);
      assert.equal(error.issues.length, 5);
      return true;
    },
  );
});

test("v0.3 config rejects malformed JSON shapes without throwing TypeError", () => {
  assert.throws(
    () => validateConfig({
      target: { className: 42, allowPartial: "yes" },
      filters: { exclude: ["ToString", 7] },
      performance: { enabled: "yes", maxHooks: "many" },
      logging: { args: 1 },
    }),
    (error) => {
      assert.ok(error instanceof ConfigurationError);
      assert.ok(error.issues.includes("target.className must be a string or null"));
      assert.ok(error.issues.includes("filters.exclude must be an array of strings"));
      return true;
    },
  );
});

test("v0.3 config rejects unknown and removed options", () => {
  assert.throws(
    () => validateConfig({
      target: { className: "ApiClient", allowPartial: false, typo: true },
      analysis: { http: { enabled: true } },
    }),
    (error) => {
      assert.ok(error instanceof ConfigurationError);
      assert.ok(error.issues.includes("unknown configuration key: analysis"));
      assert.ok(error.issues.includes("unknown configuration key: target.typo"));
      return true;
    },
  );
});
