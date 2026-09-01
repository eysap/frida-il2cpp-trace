export { ClassDiscovery, ClassNotFoundError } from "./agent/engine/discovery.js";
export { filterMethods } from "./agent/engine/filtering.js";
export { HookManager, type HookHandle } from "./agent/engine/hook-manager.js";
export type { Inspector } from "./agent/engine/inspector.js";
export type {
  RuntimeAdapter,
  RuntimeClass,
  RuntimeHookCallbacks,
  RuntimeMethod,
} from "./agent/runtime/contracts.js";
export {
  ConfigurationError,
  validateConfig,
  type ClassHookerConfig,
  type RawClassHookerConfig,
} from "./shared/config.js";
export type { ClassDescriptor, MethodDescriptor, ParameterDescriptor } from "./shared/descriptors.js";
export type { Reporter, ToolkitEvent } from "./shared/events.js";
export type { ClassSelector, MethodSelector } from "./shared/selectors.js";
export { runClassHooker, type ClassHookerDependencies } from "./tools/class-hooker.js";
