import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });

const executable = process.platform === "win32" ? "frida-compile.cmd" : "frida-compile";
const compiler = spawn(executable, ["src/agent/index.ts", "-o", "dist/agent.js", "-c"], {
  stdio: "inherit",
});

compiler.on("error", (error) => {
  console.error(`Unable to start frida-compile: ${error.message}`);
  process.exitCode = 1;
});

compiler.on("exit", (code) => {
  if (code !== 0) process.exitCode = code ?? 1;
});
