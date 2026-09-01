import type { ClassDescriptor, MethodDescriptor } from "./descriptors.js";

export interface ArgumentPreview {
  readonly name: string;
  readonly value: string;
}

export type ToolkitEvent =
  | { readonly type: "class.candidate"; readonly index: number; readonly class: ClassDescriptor }
  | { readonly type: "class.selected"; readonly index: number; readonly class: ClassDescriptor }
  | {
      readonly type: "session.started";
      readonly class: ClassDescriptor;
      readonly methodCount: number;
      readonly discoveredMethodCount: number;
    }
  | { readonly type: "method.discovered"; readonly index: number; readonly method: MethodDescriptor }
  | { readonly type: "method.discovery.completed" }
  | { readonly type: "hook.installing"; readonly count: number }
  | { readonly type: "hook.installed"; readonly method: MethodDescriptor }
  | { readonly type: "hook.failed"; readonly method: MethodDescriptor; readonly error: string }
  | {
      readonly type: "hook.call";
      readonly callId: string;
      readonly method: MethodDescriptor;
      readonly arguments: readonly ArgumentPreview[];
      readonly thisPointer: string | null;
    }
  | {
      readonly type: "hook.return";
      readonly callId: string;
      readonly method: MethodDescriptor;
      readonly value: string;
    }
  | { readonly type: "hook.detached"; readonly method: MethodDescriptor }
  | { readonly type: "session.completed"; readonly installed: number; readonly failed: number; readonly total: number }
  | { readonly type: "warning"; readonly message: string };

export interface Reporter {
  report(event: ToolkitEvent): void;
}
