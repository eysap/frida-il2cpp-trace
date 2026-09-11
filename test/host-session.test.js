import assert from "node:assert/strict";
import test from "node:test";

import { ActiveSession } from "../src/host/session.ts";

const output = {
  log() {},
  event() {},
  error() {},
};

function options(target) {
  return {
    command: "run",
    target,
    device: "local",
    configPath: "target.json",
    agentPath: "agent.js",
    format: "pretty",
  };
}

test("session cleanup detaches after an agent read failure", async () => {
  let detached = 0;
  const session = {
    isDetached: () => false,
    detach: async () => { detached++; },
  };
  const device = {
    attach: async () => session,
  };

  await assert.rejects(
    ActiveSession.create(
      options({ kind: "name", value: "Game" }),
      {},
      output,
      {
        getDevice: async () => device,
        readAgent: async () => { throw new Error("agent unreadable"); },
      },
    ),
    /agent unreadable/u,
  );
  assert.equal(detached, 1);
});

test("session cleanup resumes a spawned target before detaching", async () => {
  const actions = [];
  const session = {
    isDetached: () => false,
    detach: async () => { actions.push("detach"); },
  };
  const device = {
    spawn: async () => 42,
    attach: async () => session,
    resume: async () => { actions.push("resume"); },
  };

  await assert.rejects(
    ActiveSession.create(
      options({ kind: "spawn", value: "com.example.game" }),
      {},
      output,
      {
        getDevice: async () => device,
        readAgent: async () => { throw new Error("agent unreadable"); },
      },
    ),
  );
  assert.deepEqual(actions, ["resume", "detach"]);
});
