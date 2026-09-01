import assert from "node:assert/strict";
import test from "node:test";

import { parseOptions, UsageError } from "../src/host/options.ts";

test("host CLI parses a complete spawn command", () => {
  const options = parseOptions([
    "--spawn", "com.example.game",
    "--config", "target.json",
    "--device", "usb",
    "--host", "127.0.0.1:27042",
    "--format", "jsonl",
    "--output", "session.jsonl",
  ]);

  assert.equal(options.command, "run");
  assert.deepEqual(options.target, { kind: "spawn", value: "com.example.game" });
  assert.equal(options.configPath, "target.json");
  assert.equal(options.device, "usb");
  assert.equal(options.remoteAddress, "127.0.0.1:27042");
  assert.equal(options.format, "jsonl");
  assert.equal(options.outputPath, "session.jsonl");
});

test("host CLI rejects ambiguous targets and missing configuration", () => {
  assert.throws(
    () => parseOptions(["--pid", "42", "--name", "game", "--config", "target.json"]),
    UsageError,
  );
  assert.throws(() => parseOptions(["--pid", "42"]), /--config is required/u);
});

test("host CLI list mode does not require a target or config", () => {
  assert.deepEqual(parseOptions(["--list", "--device", "remote"]), {
    command: "list",
    target: undefined,
    device: "remote",
    remoteAddress: undefined,
    configPath: undefined,
    agentPath: undefined,
    format: "pretty",
    outputPath: undefined,
  });
});
