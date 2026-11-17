// Helpers for the tenant check of the sign-in callback.

const TENANT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * True for the ID of one tenant. False for "common", "organizations",
 * "consumers" and for domain names: none of them can be compared with the
 * tenant ID inside a token.
 */
export function isTenantId(value: unknown): value is string {
  return typeof value === "string" && TENANT_ID.test(value);
}

/**
 * Reads the tenant ID ("tid") from an ID token, or returns undefined.
 *
 * The signature is not verified here. The token comes directly from the token
 * endpoint of Microsoft, over TLS, in exchange for the code and the client
 * secret. It must not be used for a token that arrived any other way.
 */
export function tenantOfIdToken(idToken: unknown): string | undefined {
  if (typeof idToken !== "string") {
    return undefined;
  }
  const segments = idToken.split(".");
  if (segments.length !== 3) {
    return undefined;
  }
  try {
    const base64 = segments[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    const tenant = typeof claims === "object" && claims !== null ? (claims as Record<string, unknown>).tid : undefined;
    return isTenantId(tenant) ? tenant : undefined;
  }
  catch {
    return undefined;
  }
}
