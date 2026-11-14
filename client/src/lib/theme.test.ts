import { strict as assert } from "node:assert";
import { test } from "node:test";
import { applyTheme, readTheme, saveTheme } from "./theme";

test("theme defaults to light and persists and applies both choices", () => {
  const values = new Map<string, string>();
  const classes = new Set<string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      documentElement: {
        classList: {
          toggle: (name: string, enabled: boolean) => enabled ? classes.add(name) : classes.delete(name),
        },
      },
    },
  });
  try {
    assert.equal(readTheme(), "light");
    saveTheme("dark");
    assert.equal(readTheme(), "dark");
    assert.equal(classes.has("dark"), true);
    applyTheme(readTheme());
    assert.equal(classes.has("dark"), true);
    saveTheme("light");
    assert.equal(readTheme(), "light");
    assert.equal(classes.has("dark"), false);
  } finally {
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "document");
  }
});
