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
  const source = raw as Record<string, unknown>;
  const rejectUnknown = (section: Record<string, unknown>, allowed: readonly string[], prefix = ""): void => {
    for (const key of Object.keys(section)) {
      if (!allowed.includes(key)) issues.push(`unknown configuration key: ${prefix}${key}`);
    }
  };
  rejectUnknown(source, ["target", "filters", "performance", "logging"]);
  const objectSection = (name: string): Record<string, unknown> => {
    const value = source[name];
    if (value === undefined) return {};
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      issues.push(`${name} must be an object`);
      return {};
    }
    return value as Record<string, unknown>;
  };
  const targetSource = objectSection("target");
  const filtersSource = objectSection("filters");
  const performanceSource = objectSection("performance");
  const loggingSource = objectSection("logging");
  rejectUnknown(targetSource, ["assembly", "namespace", "className", "fullName", "pickIndex", "allowPartial"], "target.");
  rejectUnknown(filtersSource, ["methodNameContains", "methodRegex", "exclude"], "filters.");
  rejectUnknown(performanceSource, ["enabled", "hookDelayMs", "maxHooks"], "performance.");
  rejectUnknown(loggingSource, ["args", "return", "showThis", "maxArgs"], "logging.");
  const optionalString = (section: Record<string, unknown>, key: string, path: string): string | null | undefined => {
    const value = section[key];
    if (value === undefined || value === null || typeof value === "string") return value as string | null | undefined;
    issues.push(`${path} must be a string or null`);
    return undefined;
  };
  const optionalBoolean = (section: Record<string, unknown>, key: string, path: string): boolean | undefined => {
    const value = section[key];
    if (value === undefined || typeof value === "boolean") return value as boolean | undefined;
    issues.push(`${path} must be a boolean`);
    return undefined;
  };
  const target = normalizeClassSelector({
    assembly: optionalString(targetSource, "assembly", "target.assembly"),
    namespace: optionalString(targetSource, "namespace", "target.namespace"),
    className: optionalString(targetSource, "className", "target.className"),
    fullName: optionalString(targetSource, "fullName", "target.fullName"),
    pickIndex: typeof targetSource.pickIndex === "number" ? targetSource.pickIndex : undefined,
    allowPartial: optionalBoolean(targetSource, "allowPartial", "target.allowPartial"),
  });
  if (targetSource.pickIndex !== undefined && typeof targetSource.pickIndex !== "number") {
    issues.push("target.pickIndex must be an integer");
  }
  const methodNameContains = optionalString(filtersSource, "methodNameContains", "filters.methodNameContains");
  const methodRegex = optionalString(filtersSource, "methodRegex", "filters.methodRegex");
  const exclude = filtersSource.exclude ?? [];
  if (!Array.isArray(exclude) || exclude.some((value) => typeof value !== "string")) {
    issues.push("filters.exclude must be an array of strings");
  }
  const hookDelayMs = performanceSource.hookDelayMs ?? 25;
  const maxHooks = performanceSource.maxHooks ?? 300;
  const maxArgs = loggingSource.maxArgs ?? 8;
  const performanceEnabled = optionalBoolean(performanceSource, "enabled", "performance.enabled");
  const logArguments = optionalBoolean(loggingSource, "args", "logging.args");
  const logReturn = optionalBoolean(loggingSource, "return", "logging.return");
  const showThis = optionalBoolean(loggingSource, "showThis", "logging.showThis");

  if (!target.className) issues.push("target.className or target.fullName is required");
  if (!Number.isInteger(target.pickIndex)) issues.push("target.pickIndex must be an integer");

  if (methodRegex) {
    try {
      new RegExp(methodRegex, "u");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(`filters.methodRegex is invalid: ${message}`);
    }
  }

  if (typeof hookDelayMs !== "number" || !Number.isFinite(hookDelayMs) || hookDelayMs < 0) {
    issues.push("performance.hookDelayMs must be a non-negative number");
  }
  if (typeof maxHooks !== "number" || !Number.isInteger(maxHooks) || maxHooks <= 0) {
    issues.push("performance.maxHooks must be a positive integer");
  }
  if (typeof maxArgs !== "number" || !Number.isInteger(maxArgs) || maxArgs < 0) {
    issues.push("logging.maxArgs must be a non-negative integer");
  }

  if (issues.length > 0) throw new ConfigurationError(issues);

  return {
    target,
    filters: {
      nameContains: methodNameContains?.trim() || null,
      regex: methodRegex?.trim() || null,
      exclude: exclude as string[],
    },
    performance: {
      enabled: performanceEnabled ?? true,
      hookDelayMs: hookDelayMs as number,
      maxHooks: maxHooks as number,
    },
    logging: {
      args: logArguments ?? true,
      returnValue: logReturn ?? false,
      showThis: showThis ?? true,
      maxArgs: maxArgs as number,
    },
    raw,
  };
}
