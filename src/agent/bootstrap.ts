import "frida-il2cpp-bridge";
import { Il2CppInspector } from "./engine/inspector.js";
import type { HookManager } from "./engine/hook-manager.js";
import { MessageReporter } from "./message-reporter.js";
import { Il2CppRuntimeAdapter } from "./runtime/il2cpp-adapter.js";
import type { RawClassHookerConfig } from "../shared/config.js";
import { runClassHooker } from "../tools/class-hooker.js";

export interface StartResult {
  readonly hookCount: number;
}

let activeManager: HookManager | null = null;

export async function startAgent(config: RawClassHookerConfig): Promise<StartResult> {
  activeManager?.detachAll();
  activeManager = null;

  const manager = await Il2Cpp.perform(async () => {
    return runClassHooker(config, {
      runtime: new Il2CppRuntimeAdapter(),
      inspector: new Il2CppInspector(),
      reporter: new MessageReporter(),
    });
  });

  activeManager = manager;
  return { hookCount: manager.size };
}

export function detachAll(): number {
  return activeManager?.detachAll() ?? 0;
}

export function hookCount(): number {
  return activeManager?.size ?? 0;
}
