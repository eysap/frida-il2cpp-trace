import "frida-il2cpp-bridge";

import "../../scripts/class_hooker/constants.js";
import "../../scripts/class_hooker/config.js";
import "../../scripts/class_hooker/utils.js";
import "../../scripts/class_hooker/formatters.js";
import "../../scripts/class_hooker/http-analysis.js";
import "../../scripts/class_hooker/ui/colors.js";
import "../../scripts/class_hooker/ui/box.js";
import "../../scripts/class_hooker/ui/index.js";

import {
  getLegacyToolkit,
  initializeLegacyUi,
  LegacyAnalysisObserver,
  LegacyInspector,
} from "./compatibility/legacy-runtime.js";
import type { HookManager } from "./engine/hook-manager.js";
import { MessageReporter } from "./message-reporter.js";
import { Il2CppRuntimeAdapter } from "./runtime/il2cpp-adapter.js";
import type { RawClassHookerConfig } from "../shared/config.js";
import { runClassHooker } from "../tools/class-hooker.js";

export interface StartResult {
  readonly hookCount: number;
}

let activeManager: HookManager | null = null;

export async function startAgent(config?: RawClassHookerConfig): Promise<StartResult> {
  activeManager?.detachAll();
  activeManager = null;

  const manager = await Il2Cpp.perform(async () => {
    const legacy = getLegacyToolkit();
    const source = config ?? (legacy.CONFIG as RawClassHookerConfig);
    const normalized = legacy.normalizeConfig
      ? legacy.normalizeConfig(source as Record<string, unknown>)
      : source;
    initializeLegacyUi(legacy, normalized);
    return runClassHooker(normalized as RawClassHookerConfig, {
      runtime: new Il2CppRuntimeAdapter(),
      inspector: new LegacyInspector(legacy.formatters, normalized),
      reporter: new MessageReporter(),
      observers: [new LegacyAnalysisObserver(legacy)],
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
