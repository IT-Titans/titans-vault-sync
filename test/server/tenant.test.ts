import { describe, expect, it } from "vitest";
import { isTenantId, tenantOfIdToken } from "../../server/utils/tenant";

const TENANT = "11111111-2222-3333-4444-555555555555";

function segment(value: unknown) {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function idToken(claims: unknown) {
  return `${segment({ alg: "RS256" })}.${segment(claims)}.signature`;
}

describe("isTenantId", () => {
  it.each([TENANT, TENANT.toUpperCase()])("accepts the tenant ID %s", (value) => {
    expect(isTenantId(value)).toBe(true);
  });

  it.each([
    "common",
    "organizations",
    "consumers",
    "contoso.onmicrosoft.com",
    "",
    `${TENANT}/`,
    ` ${TENANT}`,
    `${TENANT}\n`,
    "11111111222233334444555555555555",
  ])("rejects \"%s\"", (value) => {
    expect(isTenantId(value)).toBe(false);
  });

  it.each([undefined, null, 42, [TENANT]])("rejects the non-string %j", (value) => {
    expect(isTenantId(value)).toBe(false);
  });
});

describe("tenantOfIdToken", () => {
  it("returns the tenant ID of the token", () => {
    expect(tenantOfIdToken(idToken({ tid: TENANT, name: "Ada Example" }))).toBe(TENANT);
  });

  it("reads claims that contain characters outside ASCII", () => {
    expect(tenantOfIdToken(idToken({ name: "Zoë", tid: TENANT }))).toBe(TENANT);
  });

  it.each([
    ["a token without a tenant", idToken({ name: "Ada Example" })],
    ["a tenant that is not an ID", idToken({ tid: "common" })],
    ["a tenant that is not a string", idToken({ tid: 42 })],
    ["claims that are not an object", idToken("just a string")],
    ["claims that are null", idToken(null)],
    ["claims that are not JSON", `${segment({})}.${btoa("not json")}.signature`],
    ["claims that are not base64", `${segment({})}.%%%.signature`],
    ["two segments", `${segment({})}.${segment({ tid: TENANT })}`],
    ["four segments", `${idToken({ tid: TENANT })}.extra`],
    ["an empty string", ""],
  ])("returns nothing for %s", (_label, token) => {
    expect(tenantOfIdToken(token)).toBeUndefined();
  });

  it.each([undefined, null, 42, { tid: TENANT }])("returns nothing for the non-string %j", (value) => {
    expect(tenantOfIdToken(value)).toBeUndefined();
  });
});
