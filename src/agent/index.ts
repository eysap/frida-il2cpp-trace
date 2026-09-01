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
  LegacyConsoleReporter,
  LegacyInspector,
} from "./compatibility/legacy-runtime.js";
import { Il2CppRuntimeAdapter } from "./runtime/il2cpp-adapter.js";
import type { HookManager } from "./engine/hook-manager.js";
import { runClassHooker } from "../tools/class-hooker.js";
import type { RawClassHookerConfig } from "../shared/config.js";

let activeManager: HookManager | null = null;

rpc.exports = {
  detachall(): number {
    return activeManager?.detachAll() ?? 0;
  },
  hookcount(): number {
    return activeManager?.size ?? 0;
  },
};

void Il2Cpp.perform(async () => {
  try {
    const legacy = getLegacyToolkit();
    const normalized = legacy.normalizeConfig
      ? legacy.normalizeConfig(legacy.CONFIG)
      : legacy.CONFIG;
    initializeLegacyUi(legacy);
    const reporter = new LegacyConsoleReporter(legacy.ui);
    const inspector = new LegacyInspector(legacy.formatters, normalized);
    activeManager = await runClassHooker(normalized as RawClassHookerConfig, {
      runtime: new Il2CppRuntimeAdapter(),
      inspector,
      reporter,
    });
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    send({ type: "toolkit.error", message });
  }
});
