import { readFile } from "node:fs/promises";
import vm from "node:vm";

export async function loadRuntimeModule(relativePath, toolkit = {}) {
  const sourceUrl = new URL(`../${relativePath}`, import.meta.url);
  const source = await readFile(sourceUrl, "utf8");
  const context = vm.createContext({
    IL2CPPHooker: toolkit,
    console,
    setInterval,
    clearInterval,
  });

  vm.runInContext(source, context, { filename: sourceUrl.pathname });
  return context.IL2CPPHooker;
}
