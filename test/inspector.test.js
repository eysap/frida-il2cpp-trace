import assert from "node:assert/strict";
import test from "node:test";

globalThis.Il2Cpp = {
  Type: {
    Enum: {
      BOOLEAN: 1,
      BYTE: 2,
      UBYTE: 3,
      SHORT: 4,
      USHORT: 5,
      INT: 6,
      UINT: 7,
      CHAR: 8,
      STRING: 9,
    },
  },
  String: class {
    constructor(value) {
      this.content = value.content;
    }
  },
};

const { Il2CppInspector } = await import("../src/agent/engine/inspector.ts");

function value(integer, content) {
  return {
    content,
    isNull: () => integer === 0,
    toInt32: () => integer,
    toString: () => `0x${integer.toString(16)}`,
  };
}

test("inspector does not confuse zero-value primitives with null references", () => {
  const inspector = new Il2CppInspector();

  assert.equal(inspector.inspectArgument(value(0), { typeName: "System.Boolean" }, { enumValue: 1 }), "false");
  assert.equal(inspector.inspectArgument(value(0), { typeName: "System.Int32" }, { enumValue: 6 }), "0");
  assert.equal(inspector.inspectArgument(value(0), { typeName: "System.String" }, { enumValue: 9 }), "null");
  assert.equal(inspector.inspectArgument(value(42, "hello"), { typeName: "System.String" }, { enumValue: 9 }), "\"hello\"");
});
