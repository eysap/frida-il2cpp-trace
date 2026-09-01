#!/usr/bin/env node

import { fileURLToPath } from "node:url";

import { loadConfig } from "./config-loader.js";
import { parseOptions, usage, UsageError } from "./options.js";
import { EventOutput } from "./output.js";
import { ActiveSession, listProcesses } from "./session.js";
import { validateConfig } from "../shared/config.js";

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (options.command === "help") {
    process.stdout.write(usage);
    return;
  }
  if (options.command === "list") {
    const processes = await listProcesses(options.device, options.remoteAddress);
    process.stdout.write(`${processes.join("\n")}\n`);
    return;
  }

  const config = await loadConfig(options.configPath!);
  validateConfig(config);
  const output = new EventOutput(options.format, options.outputPath);
  let session: ActiveSession | undefined;

  const stop = (): void => {
    void session?.stop();
  };
  try {
    const agentPath = options.agentPath ?? fileURLToPath(new URL("../../agent.js", import.meta.url));
    session = await ActiveSession.create(
      { ...options, target: options.target!, agentPath },
      config,
      output,
    );
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    await session.wait();
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    await session?.stop();
    await output.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`error: ${message}\n`);
  if (error instanceof UsageError) process.stderr.write(`\n${usage}`);
  process.exitCode = 1;
});
