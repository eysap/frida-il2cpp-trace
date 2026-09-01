import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { RawClassHookerConfig } from "../shared/config.js";

export async function loadConfig(path: string): Promise<RawClassHookerConfig> {
  const absolutePath = resolve(path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(absolutePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to load config ${absolutePath}: ${message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Config ${absolutePath} must contain a JSON object`);
  }
  return parsed as RawClassHookerConfig;
}
