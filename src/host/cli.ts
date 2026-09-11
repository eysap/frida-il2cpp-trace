#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "./config-loader.js";
import { parseOptions, usage, UsageError } from "./options.js";
import { EventOutput } from "./output.js";
import { ActiveSession, listProcesses } from "./session.js";
import { validateConfig } from "../shared/config.js";

export interface CliIo {
  readonly stdout: { write(value: string): unknown };
  readonly stderr: { write(value: string): unknown };
}

async function execute(args: readonly string[], io: CliIo): Promise<void> {
  const options = parseOptions(args);
  if (options.command === "help") {
    io.stdout.write(usage);
    return;
  }
  if (options.command === "list") {
    const processes = await listProcesses(options.device, options.remoteAddress);
    io.stdout.write(`${processes.join("\n")}\n`);
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

export async function runCli(
  args: readonly string[],
  io: CliIo = { stdout: process.stdout, stderr: process.stderr },
): Promise<number> {
  try {
    await execute(args, io);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`error: ${message}\n`);
    if (error instanceof UsageError) io.stderr.write(`\n${usage}`);
    return 1;
  }
}

const entryPath = process.argv[1];
if (entryPath && resolve(entryPath) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runCli(process.argv.slice(2));
}
