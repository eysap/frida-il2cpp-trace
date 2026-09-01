import assert from "node:assert/strict";
import test from "node:test";

import {
  ClassDiscovery,
  ClassNotFoundError,
} from "../src/agent/engine/discovery.ts";

function runtimeClass(assembly, namespace, name) {
  return {
    native: {},
    descriptor: {
      id: `${assembly}:${namespace}.${name}`,
      assembly,
      namespace,
      name,
      fullName: `${namespace}.${name}`,
    },
  };
}

test("v0.3 discovery reports candidates and honors pickIndex", () => {
  const classes = [
    runtimeClass("Core", "Example.Network", "ApiClient"),
    runtimeClass("Game", "Example.Network", "ApiClient"),
  ];
  const events = [];
  const discovery = new ClassDiscovery(
    { findClasses: () => classes },
    { report: (event) => events.push(event) },
  );

  const selected = discovery.select({
    assembly: null,
    namespace: "Example.Network",
    className: "ApiClient",
    pickIndex: 1,
    allowPartial: false,
  });

  assert.equal(selected.descriptor.assembly, "Game");
  assert.equal(events.filter(({ type }) => type === "class.candidate").length, 2);
  assert.equal(events.at(-1).type, "class.selected");
});

test("v0.3 discovery returns a typed failure when no class matches", () => {
  const discovery = new ClassDiscovery(
    { findClasses: () => [] },
    { report: () => {} },
  );

  assert.throws(
    () => discovery.select({
      assembly: null,
      namespace: null,
      className: "Missing",
      pickIndex: 0,
      allowPartial: false,
    }),
    ClassNotFoundError,
  );
});
