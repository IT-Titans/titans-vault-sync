// Stand-in for the Nitro virtual module "#imports".
// It provides what the server utilities of nuxt-auth-utils read from it.
// All values are fixed test values. None of them is a working credential.
export { createError } from "h3";

export const TEST_SESSION_PASSWORD = "test-only-session-password-0123456789abcdef";
export const TEST_TENANT = "11111111-1111-1111-1111-111111111111";
export const TEST_CLIENT_ID = "22222222-2222-2222-2222-222222222222";
export const TEST_CLIENT_SECRET = "test-only-client-secret";
export const TEST_REDIRECT_URL = "http://localhost/api/auth/microsoft";

function defaults() {
  return {
    session: {
      name: "nuxt-session",
      password: TEST_SESSION_PASSWORD,
      cookie: { sameSite: "lax" as const },
    },
    oauth: {
      microsoft: {
        tenant: TEST_TENANT as string | undefined,
        clientId: TEST_CLIENT_ID,
        clientSecret: TEST_CLIENT_SECRET,
        redirectURL: TEST_REDIRECT_URL,
      },
    },
  };
}

/** What useRuntimeConfig returns. A test may change it; test/setup.ts resets it before every test. */
export const runtimeConfig = defaults();

export function resetRuntimeConfig() {
  Object.assign(runtimeConfig, defaults());
}

export function useRuntimeConfig() {
  return runtimeConfig;
}
