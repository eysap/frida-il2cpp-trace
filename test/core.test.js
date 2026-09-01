import assert from "node:assert/strict";
import test from "node:test";

import { loadRuntimeModule } from "../test-support/runtime-module.js";

async function loadCore() {
  const toolkit = {
    LIMITS: { MAX_BACKTRACE_DEPTH: 6 },
    formatters: {},
    httpAnalysis: {},
    utils: {},
  };
  return (await loadRuntimeModule("scripts/class_hooker/core.js", toolkit)).core;
}

function hookableMethod(name) {
  return {
    name,
    virtualAddress: {
      isNull: () => false,
    },
  };
}

test("normalizeTarget accepts a fully qualified class and .dll assembly", async () => {
  const core = await loadCore();
  const target = core.normalizeTarget({
    assembly: "Assembly-CSharp.dll",
    fullName: "Example.Network.ApiClient",
  });

  assert.deepEqual(
    { assembly: target.assembly, namespace: target.namespace, className: target.className },
    {
      assembly: "Assembly-CSharp",
      namespace: "Example.Network",
      className: "ApiClient",
    },
  );
});

test("classMatches supports exact and partial selectors", async () => {
  const core = await loadCore();
  const klass = { namespace: "Example.Network", name: "ApiClient" };

  assert.equal(core.classMatches(klass, { className: "ApiClient", allowPartial: false }), true);
  assert.equal(
    core.classMatches(klass, {
      namespace: "Network",
      className: "Api",
      allowPartial: true,
    }),
    true,
  );
  assert.equal(core.classMatches(klass, { className: "Api", allowPartial: false }), false);
});

test("buildHookList applies name, regex, exclusion, and address filters", async () => {
  const core = await loadCore();
  const missingAddress = { name: "SendPending", virtualAddress: null };
  const methods = [
    hookableMethod("SendRequest"),
    hookableMethod("SendInternal"),
    hookableMethod("ReceiveResponse"),
    missingAddress,
  ];

  const selected = core.buildHookList({ methods }, {
    exclude: ["ApiClient.SendInternal(System.String)"],
    methodNameContains: "Send",
    methodRegex: "Request|Pending",
  });

  assert.deepEqual(Array.from(selected, (method) => method.name), ["SendRequest"]);
});
