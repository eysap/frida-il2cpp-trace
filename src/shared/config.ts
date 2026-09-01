import {
  normalizeClassSelector,
  type ClassSelector,
  type MethodSelector,
  type NormalizedClassSelector,
} from "./selectors.js";

export interface RawClassHookerConfig {
  readonly target?: ClassSelector;
  readonly filters?: {
    readonly methodNameContains?: string | null;
    readonly methodRegex?: string | null;
    readonly exclude?: readonly string[];
  };
  readonly performance?: {
    readonly enabled?: boolean;
    readonly hookDelayMs?: number;
    readonly maxHooks?: number;
  };
  readonly logging?: {
    readonly args?: boolean;
    readonly return?: boolean;
    readonly showThis?: boolean;
    readonly maxArgs?: number;
  };
  readonly [key: string]: unknown;
}

export interface ClassHookerConfig {
  readonly target: NormalizedClassSelector;
  readonly filters: MethodSelector;
  readonly performance: {
    readonly enabled: boolean;
    readonly hookDelayMs: number;
    readonly maxHooks: number;
  };
  readonly logging: {
    readonly args: boolean;
    readonly returnValue: boolean;
    readonly showThis: boolean;
    readonly maxArgs: number;
  };
  readonly raw: RawClassHookerConfig;
}

export class ConfigurationError extends Error {
  public constructor(public readonly issues: readonly string[]) {
    super(`Invalid configuration:\n- ${issues.join("\n- ")}`);
    this.name = "ConfigurationError";
  }
}

export function validateConfig(raw: RawClassHookerConfig): ClassHookerConfig {
  const issues: string[] = [];
  const target = normalizeClassSelector(raw.target ?? {});
  const filters = raw.filters ?? {};
  const performance = raw.performance ?? {};
  const logging = raw.logging ?? {};

  if (!target.className) issues.push("target.className or target.fullName is required");
  if (!Number.isInteger(target.pickIndex)) issues.push("target.pickIndex must be an integer");

  if (filters.methodRegex) {
    try {
      new RegExp(filters.methodRegex, "u");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(`filters.methodRegex is invalid: ${message}`);
    }
  }

  const hookDelayMs = performance.hookDelayMs ?? 25;
  const maxHooks = performance.maxHooks ?? 300;
  const maxArgs = logging.maxArgs ?? 8;
  if (!Number.isFinite(hookDelayMs) || hookDelayMs < 0) {
    issues.push("performance.hookDelayMs must be a non-negative number");
  }
  if (!Number.isInteger(maxHooks) || maxHooks <= 0) {
    issues.push("performance.maxHooks must be a positive integer");
  }
  if (!Number.isInteger(maxArgs) || maxArgs < 0) {
    issues.push("logging.maxArgs must be a non-negative integer");
  }

  if (issues.length > 0) throw new ConfigurationError(issues);

  return {
    target,
    filters: {
      nameContains: filters.methodNameContains?.trim() || null,
      regex: filters.methodRegex?.trim() || null,
      exclude: filters.exclude ?? [],
    },
    performance: {
      enabled: performance.enabled ?? true,
      hookDelayMs,
      maxHooks,
    },
    logging: {
      args: logging.args ?? true,
      returnValue: logging.return ?? false,
      showThis: logging.showThis ?? true,
      maxArgs,
    },
    raw,
  };
}
