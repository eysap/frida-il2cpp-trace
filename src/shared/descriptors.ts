export interface ClassDescriptor {
  readonly id: string;
  readonly assembly: string;
  readonly namespace: string;
  readonly name: string;
  readonly fullName: string;
}

export interface ParameterDescriptor {
  readonly name: string;
  readonly typeName: string;
  readonly nativeType: unknown;
}

export interface MethodDescriptor {
  readonly id: string;
  readonly className: string;
  readonly name: string;
  readonly signature: string;
  readonly isStatic: boolean;
  readonly parameters: readonly ParameterDescriptor[];
  readonly returnTypeName: string;
  readonly nativeReturnType: unknown;
  readonly address: string;
}
