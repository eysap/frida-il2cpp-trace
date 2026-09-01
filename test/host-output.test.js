import assert from "node:assert/strict";
import test from "node:test";

import { EventOutput } from "../src/host/output.ts";

const selectedEvent = {
  type: "class.selected",
  index: 0,
  class: {
    id: "Core:Example.ApiClient",
    assembly: "Core",
    namespace: "Example",
    name: "ApiClient",
    fullName: "Example.ApiClient",
  },
};

test("pretty host output renders concise event lines", async () => {
  const lines = [];
  const output = new EventOutput(
    "pretty",
    undefined,
    { write: (line) => lines.push(line) },
    { write: () => {} },
  );

  output.event(selectedEvent);
  await output.close();

  assert.deepEqual(lines, ["Selected Core -> Example.ApiClient\n"]);
});

test("jsonl host output keeps agent logs away from the event stream", async () => {
  const stdout = [];
  const stderr = [];
  const output = new EventOutput(
    "jsonl",
    undefined,
    { write: (line) => stdout.push(line) },
    { write: (line) => stderr.push(line) },
  );

  output.event(selectedEvent);
  output.log("info", "runtime ready");
  await output.close();

  assert.equal(JSON.parse(stdout[0]).type, "class.selected");
  assert.deepEqual(stderr, ["[agent:info] runtime ready\n"]);
});
