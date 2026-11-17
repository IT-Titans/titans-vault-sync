import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp, findCookie, sessionCookie } from "../helpers/app";
import { captureConsoleError } from "../helpers/console";
import { azure } from "../helpers/fake-key-vault";
import { TEST_CLIENT_ID, TEST_CLIENT_SECRET, TEST_REDIRECT_URL, TEST_TENANT } from "../stubs/nitro-imports";

const AUTHORITY = `https://login.microsoftonline.com/${TEST_TENANT}/oauth2/v2.0`;
const ACCESS_TOKEN = "access-token-issued-by-microsoft";

type FetchOptions = { method?: string; body?: string; headers?: Record<string, string> };

let app: Awaited<ReturnType<typeof createTestApp>>;
let logged: ReturnType<typeof captureConsoleError>;

// The sign-in code of nuxt-auth-utils calls Microsoft through the global $fetch.
// The stub answers for the token endpoint and for the Graph profile, so no
// request leaves the test process.
const microsoft = {
  token: vi.fn<(url: string, options: FetchOptions) => Promise<unknown>>(),
  profile: vi.fn<(url: string, options: FetchOptions) => Promise<unknown>>(),
};

function fetchStub(url: string, options: FetchOptions = {}) {
  if (url === `${AUTHORITY}/token`) {
    return microsoft.token(url, options);
  }
  if (url === "https://graph.microsoft.com/v1.0/me") {
    return microsoft.profile(url, options);
  }
  return Promise.reject(new Error(`Unexpected request to ${url}`));
}

function callback(query = "", cookie?: string) {
  return app.request("GET", `/api/auth/microsoft${query}`, { cookie });
}

/**
 * Starts a sign-in the way a browser does: the first request is redirected to
 * Microsoft with a random state, and the same state is kept in a cookie.
 */
async function startSignIn() {
  const response = await callback();
  const state = new URL(response.headers.get("location") ?? "").searchParams.get("state") ?? "";
  return { state, cookie: findCookie(response, "nuxt-auth-state") };
}

/** Returns from Microsoft with a code and the state of the started sign-in. */
async function completeSignIn(code = "code-from-microsoft") {
  const { state, cookie } = await startSignIn();
  return callback(`?code=${code}&state=${encodeURIComponent(state)}`, cookie);
}

async function sessionOf(response: Response) {
  const cookie = findCookie(response, "nuxt-session");
  const session = await app.request("GET", "/test/session?secure=1", { cookie });
  return await session.json() as { user?: { displayName: string }; secure?: { accessToken: string } };
}

beforeAll(async () => {
  app = await createTestApp();
});

beforeEach(() => {
  logged = captureConsoleError();
  vi.stubGlobal("$fetch", fetchStub);
  microsoft.token.mockReset().mockResolvedValue({ token_type: "Bearer", access_token: ACCESS_TOKEN });
  microsoft.profile.mockReset().mockResolvedValue({ id: "user-object-id", displayName: "Ada Example" });
});

afterEach(() => {
  logged.restore();
});

describe("GET /api/auth/microsoft", () => {
  it("sends a visitor without a code to the sign-in page of the configured tenant", async () => {
    const response = await callback();
    const location = new URL(response.headers.get("location") ?? "");

    expect(response.status).toBe(302);
    expect(`${location.origin}${location.pathname}`).toBe(`${AUTHORITY}/authorize`);
    expect(location.searchParams.get("client_id")).toBe(TEST_CLIENT_ID);
    expect(location.searchParams.get("response_type")).toBe("code");
    expect(location.searchParams.get("redirect_uri")).toBe(TEST_REDIRECT_URL);
    expect(location.searchParams.get("scope")?.split(" ")).toContain("User.Read");
    expect(microsoft.token).not.toHaveBeenCalled();
  });

  it("starts every sign-in with a new state and keeps it in a cookie scripts cannot read", async () => {
    const response = await callback();
    const state = new URL(response.headers.get("location") ?? "").searchParams.get("state");
    const other = await startSignIn();

    expect(state).toBeTruthy();
    expect(findCookie(response, "nuxt-auth-state")).toBe(`nuxt-auth-state=${state}`);
    expect(response.headers.getSetCookie().join(" ")).toMatch(/HttpOnly/i);
    expect(other.state).not.toBe(state);
  });

  it.each([
    ["a state that differs from the one in the cookie", (state: string) => `&state=${state}x`, true],
    ["no state in the address", () => "", true],
    ["no state cookie", (state: string) => `&state=${state}`, false],
  ])("refuses a callback with %s", async (_label, stateQuery, sendCookie) => {
    const { state, cookie } = await startSignIn();

    const response = await callback(`?code=code-from-microsoft${stateQuery(state)}`, sendCookie ? cookie : undefined);

    // Without this check, a prepared link could sign a visitor in as someone else.
    expect(microsoft.token).not.toHaveBeenCalled();
    expect((await sessionOf(response)).user).toBeUndefined();
    expect(response.headers.get("location")).toBe("/");
    expect(logged.text()).toContain("state mismatch");
  });

  it("exchanges the code at the token endpoint of the configured tenant", async () => {
    await completeSignIn();

    expect(microsoft.token).toHaveBeenCalledTimes(1);
    const [url, options] = microsoft.token.mock.calls[0]!;
    const form = new URLSearchParams(options.body);
    expect(url).toBe(`${AUTHORITY}/token`);
    expect(form.get("grant_type")).toBe("authorization_code");
    expect(form.get("code")).toBe("code-from-microsoft");
    expect(form.get("client_id")).toBe(TEST_CLIENT_ID);
    expect(form.get("redirect_uri")).toBe(TEST_REDIRECT_URL);
  });

  it("creates a session for the signed-in user and returns to the start page", async () => {
    const response = await completeSignIn();

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect(await sessionOf(response)).toEqual({
      user: { id: "user-object-id", displayName: "Ada Example" },
      secure: { accessToken: ACCESS_TOKEN },
    });
    expect(microsoft.profile.mock.calls[0]![1].headers).toEqual({ Authorization: `Bearer ${ACCESS_TOKEN}` });
  });

  it("keeps the access token out of the response and seals it inside the cookie", async () => {
    const response = await completeSignIn();
    const sessionSetCookie = response.headers.getSetCookie().find(setCookie => setCookie.startsWith("nuxt-session=")) ?? "";

    expect(await response.text()).not.toContain(ACCESS_TOKEN);
    expect(response.headers.getSetCookie().join(" ")).not.toContain(ACCESS_TOKEN);
    expect(sessionSetCookie).toMatch(/HttpOnly/i);
  });

  it("gives the signed-in user access to the vault routes", async () => {
    azure.seed("left-vault", { example: "value" });
    azure.seed("right-vault");
    const cookie = sessionCookie(await completeSignIn());

    const response = await app.request("GET", "/api/key-vaults?vaultA=left-vault&vaultB=right-vault", { cookie });

    expect(response.status).toBe(200);
  });

  it("creates no session when Microsoft refuses the code", async () => {
    microsoft.token.mockResolvedValue({ error: "invalid_grant", error_description: "The code has expired." });

    const response = await completeSignIn("expired-code");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect((await sessionOf(response)).user).toBeUndefined();
    expect(microsoft.profile).not.toHaveBeenCalled();
    expect(logged.text()).toContain("The code has expired.");
  });

  it("creates no session when the profile of the user cannot be read", async () => {
    microsoft.profile.mockRejectedValue(new Error("Graph is unavailable"));

    const response = await completeSignIn();

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect((await sessionOf(response)).user).toBeUndefined();
    expect(logged.count()).toBe(1);
  });

  it("does not write the client secret or the access token to the log when sign-in fails", async () => {
    microsoft.profile.mockRejectedValue(new Error("Graph is unavailable"));

    await completeSignIn();

    expect(logged.text()).not.toContain(TEST_CLIENT_SECRET);
    expect(logged.text()).not.toContain(ACCESS_TOKEN);
  });

  // Defect: the callback has no tenant check. It stores whoever Microsoft
  // returns. Which tenants may sign in is decided only by the app registration
  // and by the configured authority. A check needs the tenant ID of the user,
  // which the handler does not request today.
  it.skip("rejects a user whose home tenant is not the configured one", async () => {
    const foreignTenant = "99999999-9999-9999-9999-999999999999";
    const claims = btoa(JSON.stringify({ tid: foreignTenant })).replace(/=+$/, "");
    microsoft.token.mockResolvedValue({ token_type: "Bearer", access_token: ACCESS_TOKEN, id_token: `e30.${claims}.signature` });

    const response = await completeSignIn();

    expect((await sessionOf(response)).user).toBeUndefined();
  });
});
