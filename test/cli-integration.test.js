import assert from "node:assert/strict";
import test from "node:test";

import { runCli as executeCli } from "../src/host/cli.ts";

async function runCli(...args) {
  let stdout = "";
  let stderr = "";
  const status = await executeCli(args, {
    stdout: { write: (value) => { stdout += value; } },
    stderr: { write: (value) => { stderr += value; } },
  });
  return { status, stdout, stderr };
}

test("CLI help is executable without connecting to Frida", async () => {
  const result = await runCli("--help");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Usage: il2cpp-toolkit/u);
  assert.equal(result.stderr, "");
});

test("CLI reports usage errors with a non-zero exit status", async () => {
  const result = await runCli("--unknown");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /error: unknown option: --unknown/u);
  assert.match(result.stderr, /Usage: il2cpp-toolkit/u);
});
