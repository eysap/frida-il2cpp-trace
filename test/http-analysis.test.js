import assert from "node:assert/strict";
import test from "node:test";

import { loadRuntimeModule } from "../test-support/runtime-module.js";

async function loadHttpAnalysis() {
  const toolkit = { formatters: {}, utils: {} };
  return (await loadRuntimeModule("scripts/class_hooker/http-analysis.js", toolkit)).httpAnalysis;
}

test("buildUrl joins base and relative paths without duplicate slashes", async () => {
  const http = await loadHttpAnalysis();

  assert.equal(http.buildUrl("https://example.test/api/", "/users"), "https://example.test/api/users");
  assert.equal(http.buildUrl("https://example.test/api", "users"), "https://example.test/api/users");
});

test("buildUrl preserves absolute request URLs", async () => {
  const http = await loadHttpAnalysis();

  assert.equal(
    http.buildUrl("https://example.test/api", "https://cdn.example.test/data"),
    "https://cdn.example.test/data",
  );
});
