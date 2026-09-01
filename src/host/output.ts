import { createWriteStream, type WriteStream } from "node:fs";

import type { ToolkitEvent } from "../shared/events.js";
import type { OutputFormat } from "./options.js";

export interface LineWriter {
  write(line: string): void;
}

function prettyEvent(event: ToolkitEvent): string | null {
  switch (event.type) {
    case "class.candidate":
      return `  [${event.index}] ${event.class.assembly} -> ${event.class.fullName}`;
    case "class.selected":
      return `Selected ${event.class.assembly} -> ${event.class.fullName}`;
    case "session.started":
      return `Discovered ${event.discoveredMethodCount} methods; selected ${event.methodCount}`;
    case "method.discovered":
    case "method.discovery.completed":
      return null;
    case "hook.installing":
      return `Installing ${event.count} hooks...`;
    case "hook.installed":
      return `  + ${event.method.signature} @ ${event.method.address}`;
    case "hook.failed":
      return `  ! ${event.method.signature}: ${event.error}`;
    case "hook.call": {
      const args = event.arguments.map((argument) => `${argument.name}=${argument.value}`).join(", ");
      const instance = event.thisPointer ? ` this=${event.thisPointer}` : "";
      return `-> ${event.method.className}.${event.method.name}(${args})${instance}`;
    }
    case "hook.return":
      return `<- ${event.method.className}.${event.method.name}: ${event.value}`;
    case "hook.detached":
      return `  - ${event.method.signature}`;
    case "session.completed":
      return `Active hooks: ${event.installed}; failed: ${event.failed}; candidates: ${event.total}`;
    case "warning":
      return `warning: ${event.message}`;
  }
}

export class EventOutput {
  private readonly file?: WriteStream;

  public constructor(
    private readonly format: OutputFormat,
    outputPath?: string,
    private readonly stdout: LineWriter = { write: (line) => process.stdout.write(line) },
    private readonly stderr: LineWriter = { write: (line) => process.stderr.write(line) },
  ) {
    if (outputPath) this.file = createWriteStream(outputPath, { flags: "w" });
  }

  public event(event: ToolkitEvent): void {
    const line = this.format === "jsonl"
      ? JSON.stringify({ timestamp: new Date().toISOString(), ...event })
      : prettyEvent(event);
    if (line) this.write(`${line}\n`);
  }

  public log(level: string, text: string): void {
    const line = `[agent:${level}] ${text}\n`;
    if (this.format === "jsonl") this.stderr.write(line);
    else this.write(line);
  }

  public error(message: string): void {
    this.stderr.write(`error: ${message}\n`);
  }

  public async close(): Promise<void> {
    if (!this.file) return;
    await new Promise<void>((resolve, reject) => {
      this.file?.once("error", reject);
      this.file?.end(resolve);
    });
  }

  private write(line: string): void {
    this.stdout.write(line);
    this.file?.write(line);
  }
}
