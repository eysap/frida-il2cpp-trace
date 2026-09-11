import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import frida, { MessageType, type Device, type Message, type Script, type Session } from "frida";

import type { ToolkitEvent } from "../shared/events.js";
import type { RawClassHookerConfig } from "../shared/config.js";
import type { CliOptions, TargetOptions } from "./options.js";
import type { EventOutput } from "./output.js";

interface AgentExports {
  start(config: RawClassHookerConfig): Promise<{ hookCount: number }>;
  detachall(): Promise<number>;
}

interface ToolkitPayload {
  readonly type: "toolkit.event";
  readonly event: ToolkitEvent;
}

export interface SessionDependencies {
  readonly getDevice: typeof resolveDevice;
  readonly readAgent: (path: string) => Promise<string>;
}

const defaultSessionDependencies: SessionDependencies = {
  getDevice: resolveDevice,
  readAgent: (path) => readFile(resolve(path), "utf8"),
};

function isToolkitPayload(value: unknown): value is ToolkitPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ToolkitPayload>;
  return candidate.type === "toolkit.event" && Boolean(candidate.event);
}

export async function resolveDevice(name: string, remoteAddress?: string): Promise<Device> {
  if (remoteAddress) return frida.getDeviceManager().addRemoteDevice(remoteAddress);
  switch (name) {
    case "local":
      return frida.getLocalDevice();
    case "usb":
      return frida.getUsbDevice();
    case "remote":
      return frida.getRemoteDevice();
    default:
      return frida.getDevice(name);
  }
}

export async function listProcesses(deviceName: string, remoteAddress?: string): Promise<readonly string[]> {
  const device = await resolveDevice(deviceName, remoteAddress);
  const processes = await device.enumerateProcesses();
  return processes
    .sort((left, right) => left.pid - right.pid)
    .map((process) => `${String(process.pid).padStart(7)}  ${process.name}`);
}

export class ActiveSession {
  private stopped = false;
  private readonly detached: Promise<void>;
  private resolveDetached: (() => void) | undefined;

  private constructor(
    private readonly session: Session,
    private readonly script: Script,
    private readonly output: EventOutput,
  ) {
    this.detached = new Promise((resolve) => {
      this.resolveDetached = resolve;
    });
    session.detached.connect(() => this.resolveDetached?.());
  }

  public static async create(
    options: CliOptions & { readonly target: TargetOptions; readonly agentPath: string },
    config: RawClassHookerConfig,
    output: EventOutput,
    dependencies: SessionDependencies = defaultSessionDependencies,
  ): Promise<ActiveSession> {
    const device = await dependencies.getDevice(options.device, options.remoteAddress);
    const spawned = options.target.kind === "spawn";
    const target = spawned
      ? await device.spawn(options.target.value)
      : options.target.value;
    let session: Session | undefined;
    let script: Script | undefined;
    let active: ActiveSession | undefined;
    try {
      session = await device.attach(target);
      const source = await dependencies.readAgent(options.agentPath);
      script = await session.createScript(source, { name: "frida-il2cpp-toolkit" });
      script.logHandler = (level, text) => output.log(level, text);
      script.message.connect((message, data) => ActiveSession.handleMessage(message, data, output));
      await script.load();

      active = new ActiveSession(session, script, output);
      const agent = script.exports as unknown as AgentExports;
      const start = agent.start(config);
      if (spawned) await device.resume(target);
      await start;
      return active;
    } catch (error) {
      if (spawned) {
        try {
          await device.resume(target);
        } catch {
          // The process may already have resumed or exited.
        }
      }
      if (active) {
        await active.stop();
      } else {
        if (script) {
          try {
            await script.unload();
          } catch {
            // The script may not have loaded successfully.
          }
        }
        if (session && !session.isDetached()) await session.detach();
      }
      throw error;
    }
  }

  public wait(): Promise<void> {
    return this.detached;
  }

  public async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    try {
      const agent = this.script.exports as unknown as AgentExports;
      await agent.detachall();
    } catch {
      // The target may already be gone.
    }
    try {
      await this.script.unload();
    } catch {
      // The script may already be destroyed.
    }
    if (!this.session.isDetached()) await this.session.detach();
    this.resolveDetached?.();
  }

  private static handleMessage(message: Message, _data: Buffer | null, output: EventOutput): void {
    if (message.type === MessageType.Send) {
      if (isToolkitPayload(message.payload)) output.event(message.payload.event);
      return;
    }
    output.error(message.stack ?? message.description);
  }
}
