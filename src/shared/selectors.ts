export interface ClassSelector {
  readonly assembly?: string | null;
  readonly namespace?: string | null;
  readonly className?: string | null;
  readonly fullName?: string | null;
  readonly pickIndex?: number;
  readonly allowPartial?: boolean;
}

export interface NormalizedClassSelector {
  readonly assembly: string | null;
  readonly namespace: string | null;
  readonly className: string;
  readonly pickIndex: number;
  readonly allowPartial: boolean;
}

export interface MethodSelector {
  readonly nameContains?: string | null;
  readonly regex?: string | null;
  readonly exclude?: readonly string[];
}

export function normalizeClassSelector(selector: ClassSelector): NormalizedClassSelector {
  let namespace = selector.namespace?.trim() || null;
  let className = selector.className?.trim() || "";
  const fullName = selector.fullName?.trim();

  if (fullName && (!namespace || !className)) {
    const separator = fullName.lastIndexOf(".");
    namespace = separator === -1 ? null : fullName.slice(0, separator);
    className = separator === -1 ? fullName : fullName.slice(separator + 1);
  } else if (!namespace && className.includes(".")) {
    // Accept a fully-qualified class name in className as well. This is a
    // common configuration shape and descriptor.name only contains the short
    // class name at runtime.
    const separator = className.lastIndexOf(".");
    namespace = className.slice(0, separator);
    className = className.slice(separator + 1);
  }

  return {
    assembly: selector.assembly?.replace(/\.dll$/iu, "").trim() || null,
    namespace,
    className,
    pickIndex: Math.max(0, selector.pickIndex ?? 0),
    allowPartial: selector.allowPartial ?? false,
  };
}

export function normalizeExcludedMethod(value: string): string {
  let name = value.trim();
  if (name.startsWith(".")) name = name.slice(1);
  const parameters = name.indexOf("(");
  if (parameters !== -1) name = name.slice(0, parameters);
  if (name.includes(".")) name = name.split(".").at(-1) ?? name;
  return name.trim();
}
