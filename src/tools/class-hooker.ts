import { HookManager } from "../agent/engine/hook-manager.js";
import { ClassDiscovery } from "../agent/engine/discovery.js";
import { filterMethods } from "../agent/engine/filtering.js";
import type { Inspector } from "../agent/engine/inspector.js";
import type { HookObserver } from "../agent/engine/observer.js";
import type { RuntimeAdapter } from "../agent/runtime/contracts.js";
import { validateConfig, type RawClassHookerConfig } from "../shared/config.js";
import type { Reporter } from "../shared/events.js";

export interface ClassHookerDependencies {
  readonly runtime: RuntimeAdapter;
  readonly inspector: Inspector;
  readonly reporter: Reporter;
  readonly observers?: readonly HookObserver[];
}

export async function runClassHooker(
  rawConfig: RawClassHookerConfig,
  dependencies: ClassHookerDependencies,
): Promise<HookManager> {
  const config = validateConfig(rawConfig);
  const discovery = new ClassDiscovery(dependencies.runtime, dependencies.reporter);
  const target = discovery.select(config.target);
  const allMethods = dependencies.runtime.listMethods(target);
  const methods = filterMethods(allMethods, config.filters);

  dependencies.reporter.report({
    type: "session.started",
    class: target.descriptor,
    methodCount: methods.length,
    discoveredMethodCount: allMethods.length,
  });
  allMethods.forEach((method, index) => {
    dependencies.reporter.report({ type: "method.discovered", index, method: method.descriptor });
  });
  dependencies.reporter.report({ type: "method.discovery.completed" });

  const manager = new HookManager(
    dependencies.runtime,
    dependencies.inspector,
    dependencies.reporter,
    dependencies.observers,
  );
  await manager.install(methods, config);
  return manager;
}
