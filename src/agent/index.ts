import { detachAll, hookCount, startAgent } from "./bootstrap.js";
import type { RawClassHookerConfig } from "../shared/config.js";

rpc.exports = {
  detachall(): number {
    return detachAll();
  },
  hookcount(): number {
    return hookCount();
  },
  async start(config: RawClassHookerConfig): Promise<{ hookCount: number }> {
    return startAgent(config);
  },
};
