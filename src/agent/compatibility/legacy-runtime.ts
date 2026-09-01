import type { Reporter } from "../../shared/events.js";
import type { Inspector } from "../engine/inspector.js";
import type { ParameterDescriptor } from "../runtime/contracts.js";

interface LegacyUi {
  init(config: unknown): void;
  info(message: string): void;
  warn(message: string): void;
  success(message: string): void;
  classMatch(index: number, assembly: string, className: string): void;
  banner(data: { target: string; assembly: string; methodCount: number }): void;
  methodListStart(className: string, count: number): void;
  methodListItem(index: number, signature: string, address: string | null): void;
  methodListEnd(): void;
  hookInstalled(signature: string): void;
  hookFailed(signature: string, error: string): void;
  hookCall(data: {
    className: string;
    methodName: string;
    args: readonly { name: string; value: string }[];
    thisPtr: string | null;
    showThis: boolean;
  }): void;
  hookReturn(data: { className: string; methodName: string; value: string }): void;
  hookSummary(installed: number, failed: number, total: number): void;
}

interface LegacyFormatters {
  formatArgRaw(
    value: NativePointer,
    typeName: string,
    nativeType: unknown,
    numbers: unknown,
  ): string;
  formatArg(
    value: NativePointer,
    typeName: string,
    maxStringLength: number,
    config: unknown,
    nativeType: unknown,
  ): string;
  formatReturn(
    value: InvocationReturnValue,
    typeName: string,
    maxStringLength: number,
    config: unknown,
    nativeType: unknown,
  ): string;
}

interface LegacyToolkit {
  CONFIG: Record<string, unknown>;
  normalizeConfig?(config: Record<string, unknown>): Record<string, unknown>;
  formatters: LegacyFormatters;
  ui: LegacyUi;
}

interface LegacyConfigShape {
  readonly formatting?: { readonly strings?: { readonly maxLength?: number } };
  readonly logging?: { readonly rawArgs?: boolean };
  readonly ui?: { readonly verbosity?: string };
}

export function getLegacyToolkit(): LegacyToolkit {
  const scope = globalThis as typeof globalThis & { IL2CPPHooker?: LegacyToolkit };
  if (!scope.IL2CPPHooker) throw new Error("Legacy compatibility modules were not initialized");
  return scope.IL2CPPHooker;
}

export class LegacyInspector implements Inspector {
  private readonly maxStringLength: number;

  public constructor(
    private readonly formatters: LegacyFormatters,
    private readonly config: Record<string, unknown>,
  ) {
    const shape = config as LegacyConfigShape;
    this.maxStringLength = shape.formatting?.strings?.maxLength ?? 200;
  }

  public inspectArgument(value: NativePointer, parameter: ParameterDescriptor): string {
    const shape = this.config as LegacyConfigShape & {
      readonly formatting?: { readonly numbers?: unknown; readonly strings?: { readonly maxLength?: number } };
    };
    if (shape.logging?.rawArgs && shape.ui?.verbosity !== "verbose") {
      return this.formatters.formatArgRaw(
        value,
        parameter.typeName,
        parameter.nativeType,
        shape.formatting?.numbers,
      );
    }
    return this.formatters.formatArg(
      value,
      parameter.typeName,
      this.maxStringLength,
      this.config,
      parameter.nativeType,
    );
  }

  public inspectReturn(value: InvocationReturnValue, typeName: string, nativeType: unknown): string {
    return this.formatters.formatReturn(
      value,
      typeName,
      this.maxStringLength,
      this.config,
      nativeType,
    );
  }
}

export class LegacyConsoleReporter implements Reporter {
  public constructor(private readonly ui: LegacyUi) {}

  public report(event: Parameters<Reporter["report"]>[0]): void {
    switch (event.type) {
      case "class.candidate":
        this.ui.classMatch(event.index, event.class.assembly, event.class.fullName);
        break;
      case "class.selected":
        this.ui.success(`Using [${event.index}] ${event.class.assembly} -> ${event.class.fullName}`);
        break;
      case "session.started":
        this.ui.banner({
          target: event.class.fullName,
          assembly: event.class.assembly,
          methodCount: event.methodCount,
        });
        this.ui.methodListStart(event.class.fullName, event.discoveredMethodCount);
        break;
      case "method.discovered":
        this.ui.methodListItem(event.index, event.method.signature, event.method.address);
        break;
      case "hook.installing":
        this.ui.info(`Hooking ${event.count} methods...`);
        break;
      case "method.discovery.completed":
        this.ui.methodListEnd();
        break;
      case "hook.installed":
        this.ui.hookInstalled(event.method.signature);
        break;
      case "hook.failed":
        this.ui.hookFailed(event.method.signature, event.error);
        break;
      case "hook.call":
        this.ui.hookCall({
          className: event.method.className,
          methodName: event.method.name,
          args: event.arguments,
          thisPtr: event.thisPointer,
          showThis: event.thisPointer !== null,
        });
        break;
      case "hook.return":
        this.ui.hookReturn({
          className: event.method.className,
          methodName: event.method.name,
          value: event.value,
        });
        break;
      case "session.completed":
        this.ui.hookSummary(event.installed, event.failed, event.total);
        break;
      case "warning":
        this.ui.warn(event.message);
        break;
      case "hook.detached":
        this.ui.info(`Detached ${event.method.signature}`);
        break;
    }
  }
}

export function initializeLegacyUi(toolkit: LegacyToolkit): void {
  const config = toolkit.CONFIG as LegacyConfigShape;
  toolkit.ui.init(config.ui);
}
