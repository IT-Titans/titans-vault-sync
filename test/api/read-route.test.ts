import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/app";
import { azure } from "../helpers/fake-key-vault";

let app: Awaited<ReturnType<typeof createTestApp>>;
let cookie: string;

function getVaults(query = "vaultA=left-vault&vaultB=right-vault", sessionCookie: string | undefined = cookie) {
  return app.request("GET", `/api/key-vaults?${query}`, { cookie: sessionCookie });
}

beforeAll(async () => {
  app = await createTestApp();
});

beforeEach(async () => {
  azure.seed("left-vault");
  azure.seed("right-vault");
  cookie = await app.signIn();
});

describe("GET /api/key-vaults", () => {
  describe("session", () => {
    it("rejects a request without a session and never touches Azure", async () => {
      const response = await app.request("GET", "/api/key-vaults?vaultA=left-vault&vaultB=right-vault");

      expect(response.status).toBe(401);
      expect(azure.credentialsCreated).toBe(0);
      expect(azure.clientsCreated).toEqual([]);
    });

    it("rejects a session cookie that was not sealed by this server", async () => {
      const response = await getVaults(undefined, "nuxt-session=forged-value");

      expect(response.status).toBe(401);
      expect(azure.clientsCreated).toEqual([]);
    });

    it.each([
      ["no user", { secure: { accessToken: "test-access-token" } }],
      ["no secure part", { user: { displayName: "Test User" } }],
    ])("rejects a sealed session that holds %s", async (_label, session) => {
      const response = await getVaults(undefined, await app.signIn(session));

      expect(response.status).toBe(401);
      expect(azure.clientsCreated).toEqual([]);
    });
  });

  describe("validation", () => {
    it.each([
      ["no vault names", ""],
      ["only the left vault", "vaultA=left-vault"],
      ["only the right vault", "vaultB=right-vault"],
      ["a vault name given twice", "vaultA=left-vault&vaultA=other-vault&vaultB=right-vault"],
      ["a host instead of a vault name", "vaultA=attacker.example.com%2F&vaultB=right-vault"],
      ["a vault name with a path", "vaultA=left-vault&vaultB=right-vault%2Fsecrets"],
    ])("rejects %s", async (_label, query) => {
      const response = await getVaults(query);

      expect(response.status).toBe(400);
      // Nothing may reach Azure before the input is known to be valid.
      expect(azure.credentialsCreated).toBe(0);
      expect(azure.clientsCreated).toEqual([]);
    });
  });
});
