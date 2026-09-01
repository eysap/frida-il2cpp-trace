import type { ClassDescriptor, MethodDescriptor } from "../../shared/descriptors.js";

export type { ClassDescriptor, MethodDescriptor, ParameterDescriptor } from "../../shared/descriptors.js";

export interface RuntimeClass {
  readonly descriptor: ClassDescriptor;
  readonly native: unknown;
}

export interface RuntimeMethod {
  readonly descriptor: MethodDescriptor;
  readonly native: unknown;
}

export interface RuntimeHookCallbacks {
  onEnter(args: InvocationArguments): unknown;
  onLeave(returnValue: InvocationReturnValue, state: unknown): void;
}

export interface RuntimeAdapter {
  findClasses(assembly: string | null): readonly RuntimeClass[];
  listMethods(target: RuntimeClass): readonly RuntimeMethod[];
  attach(method: RuntimeMethod, callbacks: RuntimeHookCallbacks): InvocationListener;
}
