export type OutputFormat = "pretty" | "jsonl";

export type TargetOptions =
  | { readonly kind: "pid"; readonly value: number }
  | { readonly kind: "name"; readonly value: string }
  | { readonly kind: "spawn"; readonly value: string };

export interface CliOptions {
  readonly command: "run" | "list" | "help";
  readonly target?: TargetOptions;
  readonly device: string;
  readonly remoteAddress?: string;
  readonly configPath?: string;
  readonly agentPath?: string;
  readonly format: OutputFormat;
  readonly outputPath?: string;
}

export class UsageError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

function readValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) throw new UsageError(`${option} requires a value`);
  return value;
}

export function parseOptions(args: readonly string[]): CliOptions {
  let command: CliOptions["command"] = "run";
  let target: TargetOptions | undefined;
  let device = "local";
  let remoteAddress: string | undefined;
  let configPath: string | undefined;
  let agentPath: string | undefined;
  let format: OutputFormat = "pretty";
  let outputPath: string | undefined;

  const setTarget = (next: TargetOptions): void => {
    if (target) throw new UsageError("choose exactly one of --pid, --name, or --spawn");
    target = next;
  };

  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    switch (option) {
      case "-p":
      case "--pid": {
        const value = readValue(args, index++, option);
        const pid = Number(value);
        if (!Number.isInteger(pid) || pid <= 0) throw new UsageError("--pid must be a positive integer");
        setTarget({ kind: "pid", value: pid });
        break;
      }
      case "-n":
      case "--name":
        setTarget({ kind: "name", value: readValue(args, index++, option) });
        break;
      case "-f":
      case "--spawn":
        setTarget({ kind: "spawn", value: readValue(args, index++, option) });
        break;
      case "-D":
      case "--device":
        device = readValue(args, index++, option);
        break;
      case "-H":
      case "--host":
        remoteAddress = readValue(args, index++, option);
        break;
      case "-c":
      case "--config":
        configPath = readValue(args, index++, option);
        break;
      case "--agent":
        agentPath = readValue(args, index++, option);
        break;
      case "--format": {
        const value = readValue(args, index++, option);
        if (value !== "pretty" && value !== "jsonl") {
          throw new UsageError("--format must be pretty or jsonl");
        }
        format = value;
        break;
      }
      case "-o":
      case "--output":
        outputPath = readValue(args, index++, option);
        break;
      case "--list":
        command = "list";
        break;
      case "-h":
      case "--help":
        command = "help";
        break;
      default:
        throw new UsageError(`unknown option: ${option ?? ""}`);
    }
  }

  if (command === "run") {
    if (!target) throw new UsageError("one of --pid, --name, or --spawn is required");
    if (!configPath) throw new UsageError("--config is required");
  }

  return { command, target, device, remoteAddress, configPath, agentPath, format, outputPath };
}

export const usage = `Usage: il2cpp-toolkit [options]

Targets:
  -p, --pid PID           attach to a process ID
  -n, --name NAME         attach by process name
  -f, --spawn PROGRAM     spawn a package or executable

Options:
  -c, --config PATH       JSON configuration file (required for instrumentation)
  -D, --device DEVICE     local, usb, remote, or a Frida device ID
  -H, --host ADDRESS      connect to a remote frida-server
      --agent PATH        compiled agent (default: dist/agent.js)
      --format FORMAT     pretty or jsonl (default: pretty)
  -o, --output PATH       write events to a file
      --list              list processes on the selected device
  -h, --help              show this help
`;
