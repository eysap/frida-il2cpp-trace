import type { Reporter } from "../../shared/events.js";
import type { ClassHookerConfig } from "../../shared/config.js";
import type { RuntimeAdapter, RuntimeMethod } from "../runtime/contracts.js";
import type { Inspector } from "./inspector.js";

export interface HookHandle {
  readonly id: string;
  readonly method: RuntimeMethod;
  readonly state: "active" | "detached";
  detach(): void;
}

interface InvocationState {
  readonly callId: string;
}

function delay(milliseconds: number): Promise<void> {
  if (milliseconds === 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class HookManager {
  private readonly hooks = new Map<string, { method: RuntimeMethod; listener: InvocationListener }>();
  private callSequence = 0;

  public constructor(
    private readonly runtime: RuntimeAdapter,
    private readonly inspector: Inspector,
    private readonly reporter: Reporter,
  ) {}

  public get size(): number {
    return this.hooks.size;
  }

  public async install(
    methods: readonly RuntimeMethod[],
    config: ClassHookerConfig,
  ): Promise<readonly HookHandle[]> {
    if (!config.performance.enabled) {
      this.reporter.report({ type: "warning", message: "Hook installation is disabled." });
      return [];
    }

    const selected = methods.slice(0, config.performance.maxHooks);
    this.reporter.report({ type: "hook.installing", count: selected.length });
    const handles: HookHandle[] = [];
    let failed = 0;

    for (const [methodIndex, method] of selected.entries()) {
      if (this.hooks.has(method.descriptor.id)) continue;
      try {
        const listener = this.runtime.attach(method, {
          onEnter: (args) => this.onEnter(method, args, config),
          onLeave: (value, state) => this.onLeave(method, value, state, config),
        });
        this.hooks.set(method.descriptor.id, { method, listener });
        const handle = this.createHandle(method);
        handles.push(handle);
        this.reporter.report({ type: "hook.installed", method: method.descriptor });
      } catch (error) {
        failed++;
        this.reporter.report({
          type: "hook.failed",
          method: method.descriptor,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      if (methodIndex < selected.length - 1) {
        await delay(config.performance.hookDelayMs);
      }
    }

    this.reporter.report({
      type: "session.completed",
      installed: handles.length,
      failed,
      total: methods.length,
    });
    return handles;
  }

  public detach(id: string): boolean {
    const registration = this.hooks.get(id);
    if (!registration) return false;
    try {
      registration.listener.detach();
    } catch (error) {
      this.reporter.report({
        type: "warning",
        message: `Failed to detach ${registration.method.descriptor.signature}: ${this.errorMessage(error)}`,
      });
    } finally {
      this.hooks.delete(id);
      this.reporter.report({ type: "hook.detached", method: registration.method.descriptor });
    }
    return true;
  }

  public detachAll(): number {
    const ids = [...this.hooks.keys()];
    for (const id of ids) this.detach(id);
    return ids.length;
  }

  private createHandle(method: RuntimeMethod): HookHandle {
    const hooks = this.hooks;
    const detach = () => this.detach(method.descriptor.id);
    return {
      id: method.descriptor.id,
      method,
      get state() {
        return hooks.has(method.descriptor.id) ? "active" : "detached";
      },
      detach,
    };
  }

  private onEnter(
    method: RuntimeMethod,
    args: InvocationArguments,
    config: ClassHookerConfig,
  ): InvocationState {
    const callId = `${method.descriptor.id}#${++this.callSequence}`;
    const argumentOffset = method.descriptor.isStatic ? 0 : 1;
    const previews = config.logging.args
      ? method.descriptor.parameters.slice(0, config.logging.maxArgs).map((parameter, index) => ({
          name: parameter.name || `arg${index}`,
          value: this.inspectArgumentSafely(
            method,
            args[index + argumentOffset] as NativePointer,
            parameter,
          ),
        }))
      : [];
    const thisPointer = !method.descriptor.isStatic && config.logging.showThis
      ? (args[0] as NativePointer).toString()
      : null;

    this.reporter.report({
      type: "hook.call",
      callId,
      method: method.descriptor,
      arguments: previews,
      thisPointer,
    });
    return { callId };
  }

  private onLeave(
    method: RuntimeMethod,
    value: InvocationReturnValue,
    state: unknown,
    config: ClassHookerConfig,
  ): void {
    if (!config.logging.returnValue) return;
    const invocation = state as InvocationState | undefined;
    if (!invocation?.callId) return;
    this.reporter.report({
      type: "hook.return",
      callId: invocation.callId,
      method: method.descriptor,
      value: this.inspectReturnSafely(method, value),
    });
  }

  private inspectArgumentSafely(
    method: RuntimeMethod,
    value: NativePointer,
    parameter: RuntimeMethod["descriptor"]["parameters"][number],
  ): string {
    try {
      return this.inspector.inspectArgument(value, parameter);
    } catch (error) {
      this.reporter.report({
        type: "warning",
        message: `Unable to inspect ${method.descriptor.name}.${parameter.name}: ${this.errorMessage(error)}`,
      });
      return value?.toString() ?? "<unavailable>";
    }
  }

  private inspectReturnSafely(method: RuntimeMethod, value: InvocationReturnValue): string {
    try {
      return this.inspector.inspectReturn(
        value,
        method.descriptor.returnTypeName,
        method.descriptor.nativeReturnType,
      );
    } catch (error) {
      this.reporter.report({
        type: "warning",
        message: `Unable to inspect return value of ${method.descriptor.name}: ${this.errorMessage(error)}`,
      });
      return value.toString();
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
