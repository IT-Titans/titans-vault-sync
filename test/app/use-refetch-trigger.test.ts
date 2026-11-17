import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRefetchTrigger } from "../../app/composables/useRefetchTrigger";

// useState is the Nuxt function for state that is shared by key. The stand-in
// keeps one value per key, which is the behaviour the composable relies on.
const states = new Map<string, { value: unknown }>();

beforeEach(() => {
  states.clear();
  vi.stubGlobal("useState", (key: string, init: () => unknown) => {
    if (!states.has(key)) {
      states.set(key, { value: init() });
    }
    return states.get(key);
  });
});

describe("useRefetchTrigger", () => {
  it("starts at zero", () => {
    expect(useRefetchTrigger().value).toBe(0);
  });

  it("hands every caller the same counter", () => {
    const table = useRefetchTrigger();
    const page = useRefetchTrigger();

    table.value++;

    // The table increments it after a copy, the page watches it to reload.
    expect(page.value).toBe(1);
  });
});
