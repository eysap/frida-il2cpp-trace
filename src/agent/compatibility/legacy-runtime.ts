import type { Reporter } from "../../shared/events.js";
import type { Inspector } from "../engine/inspector.js";
import type { HookEnterContext, HookLeaveContext, HookObserver } from "../engine/observer.js";
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
  stackTrace(stack: string): void;
  httpBlock(data: {
    method: string | null;
    path: string | null;
    url: string | null;
    body: string | null;
    headers: string | null | undefined;
  }): void;
  httpResponse(summary: string): void;
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
  getPreviewOptions(config: unknown): unknown;
  shouldDumpType(typeName: string, config: unknown): boolean;
  dumpObjectFields(value: NativePointer, typeName: string, config: unknown): void;
}

interface LegacyHttpAnalysis {
  readHttpMethod(value: NativePointer): string | null;
  extractBasePathFromConfig(value: NativePointer): string | null;
  extractOptionsDetails(value: NativePointer, options: unknown): {
    body: string | null;
    form: string | null;
  };
  buildUrl(basePath: string, path: string): string;
  extractRequestSummary(value: NativePointer, options: unknown): {
    headersBlock: string | null;
  } | null;
  extractResponseSummary(value: NativePointer, options: unknown): string | null;
}

interface LegacyUtils {
  tryReadString(value: NativePointer): string | null;
}

interface LegacyToolkit {
  CONFIG: Record<string, unknown>;
  normalizeConfig?(config: Record<string, unknown>): Record<string, unknown>;
  formatters: LegacyFormatters;
  httpAnalysis: LegacyHttpAnalysis;
  ui: LegacyUi;
  utils: LegacyUtils;
}

interface LegacyConfigShape {
  readonly formatting?: { readonly strings?: { readonly maxLength?: number } };
  readonly logging?: { readonly rawArgs?: boolean };
  readonly ui?: { readonly verbosity?: string };
}

interface LegacyAnalysisConfig extends LegacyConfigShape {
  readonly analysis?: { readonly http?: { readonly enabled?: boolean } };
  readonly dump?: { readonly enabled?: boolean } & Record<string, unknown>;
  readonly logging?: {
    readonly rawArgs?: boolean;
    readonly showStack?: boolean;
  };
  readonly formatting?: {
    readonly numbers?: unknown;
    readonly strings?: {
      readonly maxLength?: number;
      readonly httpMaxLength?: number;
    };
  };
}

interface HttpInvocationState {
  readonly isNewRequest: boolean;
  readonly method: string | null;
  readonly path: string | null;
  readonly url: string | null;
  readonly body: string | null;
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

export class LegacyAnalysisObserver implements HookObserver {
  public constructor(private readonly toolkit: LegacyToolkit) {}

  public onEnter(context: HookEnterContext): HttpInvocationState | undefined {
    const config = context.config.raw as LegacyAnalysisConfig;
    this.dumpConfiguredArguments(context, config);
    this.logStackTrace(context, config);

    if (!config.analysis?.http?.enabled || context.method.descriptor.name !== "NewRequest") {
      return undefined;
    }

    const parameters = new Map<string, NativePointer>();
    context.method.descriptor.parameters.forEach((parameter, index) => {
      parameters.set(
        parameter.name.toLowerCase(),
        context.arguments[index + context.argumentOffset] as NativePointer,
      );
    });
    const methodPointer = parameters.get("method");
    const pathPointer = parameters.get("path");
    const basePathPointer = parameters.get("basepath");
    const configurationPointer = parameters.get("configuration");
    const optionsPointer = parameters.get("options");
    const method = methodPointer ? this.toolkit.httpAnalysis.readHttpMethod(methodPointer) : null;
    const path = pathPointer ? this.toolkit.utils.tryReadString(pathPointer) : null;
    let basePath = basePathPointer ? this.toolkit.utils.tryReadString(basePathPointer) : null;
    if (!basePath && configurationPointer) {
      basePath = this.toolkit.httpAnalysis.extractBasePathFromConfig(configurationPointer);
    }
    const options = optionsPointer
      ? this.toolkit.httpAnalysis.extractOptionsDetails(
          optionsPointer,
          this.toolkit.formatters.getPreviewOptions(config),
        )
      : null;
    const acceptsBody = method ? ["POST", "PUT", "PATCH"].includes(method.toUpperCase()) : false;

    return {
      isNewRequest: true,
      method,
      path,
      url: basePath && path ? this.toolkit.httpAnalysis.buildUrl(basePath, path) : null,
      body: acceptsBody && options ? options.body ?? options.form : null,
    };
  }

  public onLeave(context: HookLeaveContext): void {
    const config = context.config.raw as LegacyAnalysisConfig;
    if (!config.analysis?.http?.enabled) return;
    const maxStringLength = config.formatting?.strings?.maxLength ?? 200;
    const state = context.state as HttpInvocationState | undefined;

    if (state?.isNewRequest) {
      const request = this.toolkit.httpAnalysis.extractRequestSummary(
        context.returnValue,
        {
          maxStringLength,
          reqToStringMaxLen: config.formatting?.strings?.httpMaxLength ?? 2048,
        },
      );
      this.toolkit.ui.httpBlock({
        method: state.method,
        path: state.path,
        url: state.url,
        body: state.body,
        headers: request?.headersBlock,
      });
      return;
    }

    if (
      context.method.descriptor.name.includes("CallApi") ||
      context.method.descriptor.name.includes("SendAsync")
    ) {
      const summary = this.toolkit.httpAnalysis.extractResponseSummary(
        context.returnValue,
        { maxStringLength },
      );
      if (summary) this.toolkit.ui.httpResponse(summary);
    }
  }

  private dumpConfiguredArguments(context: HookEnterContext, config: LegacyAnalysisConfig): void {
    if (!config.dump?.enabled) return;
    context.method.descriptor.parameters.forEach((parameter, index) => {
      if (!this.toolkit.formatters.shouldDumpType(parameter.typeName, config.dump)) return;
      this.toolkit.formatters.dumpObjectFields(
        context.arguments[index + context.argumentOffset] as NativePointer,
        parameter.typeName,
        config.dump,
      );
    });
  }

  private logStackTrace(context: HookEnterContext, config: LegacyAnalysisConfig): void {
    if (!config.logging?.showStack) return;
    const stack = Thread.backtrace(context.invocation.context, Backtracer.ACCURATE)
      .slice(0, 6)
      .map(DebugSymbol.fromAddress)
      .join("\n");
    this.toolkit.ui.stackTrace(stack);
  }
}

export function initializeLegacyUi(toolkit: LegacyToolkit): void {
  const config = toolkit.CONFIG as LegacyConfigShape;
  toolkit.ui.init(config.ui);
}
