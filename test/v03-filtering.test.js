import assert from "node:assert/strict";
import test from "node:test";

import { filterMethods } from "../src/agent/engine/filtering.ts";

function method(name) {
  return { descriptor: { name } };
}

test("v0.3 method filtering composes substring, regex and exclusions", () => {
  const methods = [
    method("SendRequest"),
    method("SendInternal"),
    method("ReceiveResponse"),
  ];

  const selected = filterMethods(methods, {
    nameContains: "Send",
    regex: "Request|Internal",
    exclude: ["ApiClient.SendInternal(System.String)"],
  });

  assert.deepEqual(selected.map(({ descriptor }) => descriptor.name), ["SendRequest"]);
});
