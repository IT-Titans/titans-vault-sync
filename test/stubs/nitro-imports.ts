// Stand-in for the Nitro virtual module "#imports".
// The password is a fixed test value. It seals session cookies inside the test process only.
export const TEST_SESSION_PASSWORD = "test-only-session-password-0123456789abcdef";

export function useRuntimeConfig() {
  return {
    session: {
      name: "nuxt-session",
      password: TEST_SESSION_PASSWORD,
      cookie: { sameSite: "lax" as const },
    },
  };
}
