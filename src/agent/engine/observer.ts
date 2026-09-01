import type { ClassHookerConfig } from "../../shared/config.js";
import type { RuntimeMethod } from "../runtime/contracts.js";

export interface HookEnterContext {
  readonly method: RuntimeMethod;
  readonly arguments: InvocationArguments;
  readonly argumentOffset: number;
  readonly invocation: InvocationContext;
  readonly config: ClassHookerConfig;
}

export interface HookLeaveContext {
  readonly method: RuntimeMethod;
  readonly returnValue: InvocationReturnValue;
  readonly invocation: InvocationContext;
  readonly config: ClassHookerConfig;
  readonly state: unknown;
}

export interface HookObserver {
  onEnter?(context: HookEnterContext): unknown;
  onLeave?(context: HookLeaveContext): void;
}
