import type { ParameterDescriptor } from "../runtime/contracts.js";

export interface Inspector {
  inspectArgument(value: NativePointer, parameter: ParameterDescriptor): string;
  inspectReturn(value: InvocationReturnValue, typeName: string, nativeType: unknown): string;
}
