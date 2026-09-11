import type { ParameterDescriptor } from "../runtime/contracts.js";

export interface Inspector {
  inspectArgument(value: NativePointer, parameter: ParameterDescriptor, nativeType: unknown): string;
  inspectReturn(value: InvocationReturnValue, typeName: string, nativeType: unknown): string;
}

/** Conservative value previews backed only by frida-il2cpp-bridge. */
export class Il2CppInspector implements Inspector {
  public inspectArgument(value: NativePointer, parameter: ParameterDescriptor, nativeType: unknown): string {
    return this.inspect(value, parameter.typeName, nativeType as Il2Cpp.Type);
  }

  public inspectReturn(value: InvocationReturnValue, typeName: string, nativeType: unknown): string {
    return this.inspect(value as NativePointer, typeName, nativeType as Il2Cpp.Type);
  }

  private inspect(value: NativePointer, typeName: string, type: Il2Cpp.Type): string {
    if (typeName === "System.Void") return "void";
    if (value.isNull()) return "null";

    switch (type.enumValue) {
      case Il2Cpp.Type.Enum.BOOLEAN:
        return value.toInt32() === 0 ? "false" : "true";
      case Il2Cpp.Type.Enum.BYTE:
      case Il2Cpp.Type.Enum.UBYTE:
      case Il2Cpp.Type.Enum.SHORT:
      case Il2Cpp.Type.Enum.USHORT:
      case Il2Cpp.Type.Enum.INT:
      case Il2Cpp.Type.Enum.UINT:
      case Il2Cpp.Type.Enum.CHAR:
        return String(value.toInt32());
      case Il2Cpp.Type.Enum.STRING:
        return JSON.stringify(new Il2Cpp.String(value).content) ?? "null";
      default:
        return value.toString();
    }
  }
}
