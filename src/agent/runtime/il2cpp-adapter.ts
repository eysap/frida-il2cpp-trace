import type {
  ClassDescriptor,
  MethodDescriptor,
  RuntimeAdapter,
  RuntimeClass,
  RuntimeHookCallbacks,
  RuntimeMethod,
} from "./contracts.js";

function asClass(target: RuntimeClass): Il2Cpp.Class {
  return target.native as Il2Cpp.Class;
}

function asMethod(method: RuntimeMethod): Il2Cpp.Method {
  return method.native as Il2Cpp.Method;
}

function describeClass(assembly: Il2Cpp.Assembly, klass: Il2Cpp.Class): ClassDescriptor {
  const namespace = klass.namespace ?? "";
  const fullName = namespace ? `${namespace}.${klass.name}` : klass.name;
  return {
    id: `${assembly.name}:${fullName}`,
    assembly: assembly.name,
    namespace,
    name: klass.name,
    fullName,
  };
}

function describeMethod(owner: ClassDescriptor, method: Il2Cpp.Method): MethodDescriptor {
  const parameters = method.parameters.map((parameter) => ({
    name: parameter.name ?? "",
    typeName: parameter.type.name,
    nativeType: parameter.type,
  }));
  const parameterTypes = parameters.map((parameter) => parameter.typeName).join(",");
  const signatureParameters = parameters
    .map((parameter) => `${parameter.typeName} ${parameter.name}`.trim())
    .join(", ");
  const signature = `${method.isStatic ? "static " : ""}${method.returnType.name} ${method.name}(${signatureParameters})`;
  const address = method.virtualAddress;

  return {
    id: `${owner.id}:${method.name}(${parameterTypes})`,
    className: owner.fullName,
    name: method.name,
    signature,
    isStatic: method.isStatic,
    parameters,
    returnTypeName: method.returnType.name,
    nativeReturnType: method.returnType,
    address: address.toString(),
  };
}

export class Il2CppRuntimeAdapter implements RuntimeAdapter {
  public findClasses(assemblyName: string | null): readonly RuntimeClass[] {
    const assemblies = assemblyName
      ? [Il2Cpp.domain.assembly(assemblyName)]
      : Il2Cpp.domain.assemblies;
    const classes: RuntimeClass[] = [];

    for (const assembly of assemblies) {
      for (const klass of assembly.image.classes) {
        classes.push({ descriptor: describeClass(assembly, klass), native: klass });
      }
    }
    return classes;
  }

  public listMethods(target: RuntimeClass): readonly RuntimeMethod[] {
    return asClass(target).methods.flatMap((method) => {
      try {
        if (method.virtualAddress.isNull()) return [];
        return [{ descriptor: describeMethod(target.descriptor, method), native: method }];
      } catch {
        return [];
      }
    });
  }

  public attach(method: RuntimeMethod, callbacks: RuntimeHookCallbacks): InvocationListener {
    const nativeMethod = asMethod(method);
    return Interceptor.attach(nativeMethod.virtualAddress, {
      onEnter(args) {
        const context = this as InvocationContext & { toolkitState?: unknown };
        context.toolkitState = callbacks.onEnter(args);
      },
      onLeave(returnValue) {
        const context = this as InvocationContext & { toolkitState?: unknown };
        callbacks.onLeave(returnValue, context.toolkitState);
      },
    });
  }
}
