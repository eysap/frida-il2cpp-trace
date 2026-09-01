import type { Reporter } from "../../shared/events.js";
import type { NormalizedClassSelector } from "../../shared/selectors.js";
import type { RuntimeAdapter, RuntimeClass } from "../runtime/contracts.js";

export class ClassNotFoundError extends Error {
  public constructor(selector: NormalizedClassSelector) {
    super(`No class matched ${selector.namespace ? `${selector.namespace}.` : ""}${selector.className}`);
    this.name = "ClassNotFoundError";
  }
}

export class ClassDiscovery {
  public constructor(
    private readonly runtime: RuntimeAdapter,
    private readonly reporter: Reporter,
  ) {}

  public select(selector: NormalizedClassSelector): RuntimeClass {
    const matches = this.runtime.findClasses(selector.assembly).filter((candidate) => {
      const descriptor = candidate.descriptor;
      const nameMatches = selector.allowPartial
        ? descriptor.name.includes(selector.className)
        : descriptor.name === selector.className;
      if (!nameMatches) return false;
      if (!selector.namespace) return true;
      return selector.allowPartial
        ? descriptor.namespace.includes(selector.namespace)
        : descriptor.namespace === selector.namespace;
    });

    if (matches.length === 0) throw new ClassNotFoundError(selector);
    matches.forEach((candidate, index) => {
      this.reporter.report({ type: "class.candidate", index, class: candidate.descriptor });
    });

    const index = Math.min(selector.pickIndex, matches.length - 1);
    const selected = matches[index];
    if (!selected) throw new ClassNotFoundError(selector);
    this.reporter.report({ type: "class.selected", index, class: selected.descriptor });
    return selected;
  }
}
