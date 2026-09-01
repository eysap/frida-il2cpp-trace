import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await rm("dist/node", { recursive: true, force: true });

function run(executable, arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, arguments_, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${executable} exited with code ${code ?? "unknown"}`));
    });
  });
}

const fridaCompile = process.platform === "win32" ? "frida-compile.cmd" : "frida-compile";
const tsc = process.platform === "win32" ? "tsc.cmd" : "tsc";

await run(fridaCompile, ["src/agent/index.ts", "-o", "dist/agent.js", "-c"]);
await run(tsc, ["-p", "tsconfig.host.json"]);
