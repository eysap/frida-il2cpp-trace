import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

function runCli(...args) {
  return spawnSync(process.execPath, ["--import", "tsx", "src/host/cli.ts", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

test("CLI help is executable without connecting to Frida", () => {
  const result = runCli("--help");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Usage: il2cpp-toolkit/u);
  assert.equal(result.stderr, "");
});

test("CLI reports usage errors with a non-zero exit status", () => {
  const result = runCli("--unknown");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /error: unknown option: --unknown/u);
  assert.match(result.stderr, /Usage: il2cpp-toolkit/u);
});
