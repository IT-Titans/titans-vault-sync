import { vi } from "vitest";

function describe(value: unknown): string {
  if (value instanceof Error) {
    // Message, stack, cause and every other own property, nested ones included.
    const own = value as unknown as Record<string, unknown>;
    const properties = Object.getOwnPropertyNames(value).map(key => `${key}=${describe(own[key])}`);
    return `${value.name}: ${properties.join(" ")}`;
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value) ?? String(value);
}

/**
 * Silences console.error and records what the code under test writes to it,
 * so a test can assert what a log line contains and what it must not contain.
 */
export function captureConsoleError() {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});

  return {
    /** Everything that was logged, as one string. */
    text() {
      return spy.mock.calls.flat().map(describe).join("\n");
    },
    count() {
      return spy.mock.calls.length;
    },
    restore() {
      spy.mockRestore();
    },
  };
}
