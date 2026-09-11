import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadConfig } from "../src/host/config-loader.ts";

test("config loader reads a JSON object", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "il2cpp-toolkit-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "target.json");
  await writeFile(path, JSON.stringify({ target: { className: "ApiClient" } }));

  assert.deepEqual(await loadConfig(path), { target: { className: "ApiClient" } });
});

test("config loader gives actionable errors for invalid JSON and non-objects", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "il2cpp-toolkit-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const invalid = join(directory, "invalid.json");
  const array = join(directory, "array.json");
  await writeFile(invalid, "{");
  await writeFile(array, "[]");

  await assert.rejects(loadConfig(invalid), /Unable to load config/u);
  await assert.rejects(loadConfig(array), /must contain a JSON object/u);
});
