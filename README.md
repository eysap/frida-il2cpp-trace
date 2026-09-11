# Frida IL2CPP Trace

[![License: MIT](https://img.shields.io/badge/License-MIT-410099?style=flat-square&labelColor=0d1117)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&labelColor=0d1117&logo=typescript&logoColor=white)](src/)
[![Frida 17](https://img.shields.io/badge/Frida-17-00bcd4?style=flat-square&labelColor=0d1117)](https://frida.re/)

Observe selected methods inside a running Unity application, from your terminal.

Unity's IL2CPP backend compiles managed code into native binaries, making runtime
behavior harder to inspect. This TypeScript tool uses Frida to locate a class,
hook selected methods, and show their arguments and return values as they execute.

## Overview

Example session targeting a fictional network client:

```text
Selected Assembly-CSharp -> Example.Network.ApiClient
Discovered 18 methods; selected 2
Installing 2 hooks...
Active hooks: 2; failed: 0; candidates: 2
-> Example.Network.ApiClient.Send(payload="hello") this=0x7f3499c120
<- Example.Network.ApiClient.Receive: "accepted"
```

- **Selective tracing** — choose a class, filter methods by name or regex, and exclude noisy calls.
- **Controlled installation** — space out hook installation and limit the number of hooks.
- **Readable results** — preview values in the terminal or emit JSONL events for other tools.

## Architecture

The Node.js CLI manages process attachment and output. An injected agent discovers
IL2CPP classes through `frida-il2cpp-bridge` and manages hooks. Shared TypeScript
types define configuration and the events exchanged between them.

Value inspection stays shallow to limit work inside the target process. Hooks are
detached on shutdown; native calling conventions still require validation on the
target platform.

## Quick start

Requires **Node.js 22.13+**, a Unity IL2CPP application, and a compatible Frida setup.

```bash
git clone https://github.com/eysap/frida-il2cpp-trace.git
cd frida-il2cpp-trace
npm ci
npm run build
```

Edit the assembly, namespace, class and method filters in
[`examples/class-hooker.json`](examples/class-hooker.json) to match your target,
then attach to its running process:

```bash
npm run cli -- --name "Game.x64" --config examples/class-hooker.json
```

Replace `Game.x64` with your process name. Set `logging.return` to `true` to include
return values, and press `Ctrl+C` to end the session.

Use `--format jsonl` for structured events. Local, USB and remote devices are
supported; run `npm run cli -- --help` for all options.

## Development

```bash
npm run check
```

Runs linting, TypeScript checks, unit and CLI integration tests, and the production
build. Explore [`src/host/`](src/host/) for the CLI,
[`src/agent/`](src/agent/) for instrumentation, and [`test/`](test/) for tests.

---
## License

Released under the [MIT License](LICENSE).
