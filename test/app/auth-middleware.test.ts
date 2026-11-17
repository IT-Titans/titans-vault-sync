import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// The route middleware uses three names Nuxt auto-imports. Outside Nuxt they
// are provided as globals.
const loggedIn = { value: false };
const navigateTo = vi.fn((to: string) => ({ redirectedTo: to }));

let guard: () => unknown;

beforeAll(async () => {
  vi.stubGlobal("defineNuxtRouteMiddleware", (middleware: () => unknown) => middleware);
  vi.stubGlobal("useUserSession", () => ({ loggedIn }));
  vi.stubGlobal("navigateTo", navigateTo);

  guard = (await import("../../app/middleware/auth")).default as unknown as () => unknown;
});

beforeEach(() => {
  navigateTo.mockClear();
});

describe("auth route middleware", () => {
  it("sends a visitor who is not signed in to the login page", () => {
    loggedIn.value = false;

    expect(guard()).toEqual({ redirectedTo: "/login" });
    expect(navigateTo).toHaveBeenCalledWith("/login");
  });

  it("lets a signed-in user through", () => {
    loggedIn.value = true;

    expect(guard()).toBeUndefined();
    expect(navigateTo).not.toHaveBeenCalled();
  });
});
