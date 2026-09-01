import { normalizeExcludedMethod, type MethodSelector } from "../../shared/selectors.js";
import type { RuntimeMethod } from "../runtime/contracts.js";

export function filterMethods(
  methods: readonly RuntimeMethod[],
  selector: MethodSelector,
): readonly RuntimeMethod[] {
  const excluded = new Set((selector.exclude ?? []).map(normalizeExcludedMethod).filter(Boolean));
  const regex = selector.regex ? new RegExp(selector.regex, "u") : null;

  return methods.filter(({ descriptor }) => {
    if (excluded.has(descriptor.name)) return false;
    if (selector.nameContains && !descriptor.name.includes(selector.nameContains)) return false;
    if (regex && !regex.test(descriptor.name)) return false;
    return true;
  });
}
