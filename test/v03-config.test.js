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
