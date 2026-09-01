import assert from "node:assert/strict";
import test from "node:test";

import { HookManager } from "../src/agent/engine/hook-manager.ts";
import { validateConfig } from "../src/shared/config.ts";

function runtimeMethod() {
  return {
    native: {},
    descriptor: {
      id: "Assembly:Example.ApiClient:Send(System.String)",
      className: "Example.ApiClient",
      name: "Send",
      signature: "System.Void Send(System.String payload)",
      isStatic: false,
      parameters: [{ name: "payload", typeName: "System.String", nativeType: {} }],
      returnTypeName: "System.Void",
      nativeReturnType: {},
      address: "0x1234",
    },
  };
}

test("v0.3 hook manager deduplicates hooks and detaches the complete session", async () => {
  const registrations = [];
  let detached = 0;
  const runtime = {
    attach(method, callbacks) {
      registrations.push({ method, callbacks });
      return { detach: () => detached++ };
    },
  };
  const events = [];
  const inspector = {
    inspectArgument: (_value, parameter) => `<${parameter.typeName}>`,
    inspectReturn: () => "void",
  };
  const manager = new HookManager(runtime, inspector, { report: (event) => events.push(event) });
  const method = runtimeMethod();
  const config = validateConfig({
    target: { className: "ApiClient" },
    performance: { hookDelayMs: 0 },
    logging: { return: true },
  });

  const handles = await manager.install([method, method], config);

  assert.equal(handles.length, 1);
  assert.equal(manager.size, 1);
  assert.equal(handles[0].state, "active");
  assert.equal(registrations.length, 1);

  const state = registrations[0].callbacks.onEnter([
    { toString: () => "0xaaaa" },
    { toString: () => "0xbbbb" },
  ]);
  registrations[0].callbacks.onLeave({}, state);

  assert.equal(events.filter(({ type }) => type === "hook.call").length, 1);
  assert.equal(events.filter(({ type }) => type === "hook.return").length, 1);
  assert.equal(manager.detachAll(), 1);
  assert.equal(detached, 1);
  assert.equal(manager.size, 0);
  assert.equal(handles[0].state, "detached");
});
