import assert from "node:assert/strict";
import test from "node:test";

import { loadRuntimeModule } from "../test-support/runtime-module.js";

test("normalizeConfig fills nested defaults without replacing overrides", async () => {
  const toolkit = await loadRuntimeModule("scripts/class_hooker/config.js");
  const config = {
    target: { className: "ApiClient" },
    logging: { return: true },
  };

  const normalized = toolkit.normalizeConfig(config);

  assert.equal(normalized.target.className, "ApiClient");
  assert.equal(normalized.target.allowPartial, false);
  assert.equal(normalized.logging.return, true);
  assert.equal(normalized.logging.args, true);
  assert.equal(normalized.performance.maxHooks, 300);
});

test("normalizeConfig clones default arrays", async () => {
  const toolkit = await loadRuntimeModule("scripts/class_hooker/config.js");
  const first = toolkit.normalizeConfig({ target: {}, filters: {} });
  first.filters.exclude.push("ToString");

  assert.deepEqual(Array.from(toolkit.CONFIG.filters.exclude), []);
});
