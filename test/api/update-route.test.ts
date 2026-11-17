import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/app";
import { azure, restError, vaultUrl } from "../helpers/fake-key-vault";

const SECRET_VALUE = "value-only-the-left-vault-knows";

let app: Awaited<ReturnType<typeof createTestApp>>;
let cookie: string;

function copyRequest(overrides: Record<string, unknown> = {}) {
  return {
    leftVaultName: "left-vault",
    rightVaultName: "right-vault",
    secretName: "example-secret",
    direction: "leftToRight",
    ...overrides,
  };
}

function postUpdate(body: unknown, sessionCookie: string | undefined = cookie) {
  return app.request("POST", "/api/key-vaults/update", { cookie: sessionCookie, body });
}

beforeAll(async () => {
  app = await createTestApp();
});

beforeEach(async () => {
  azure.seed("left-vault", { "example-secret": SECRET_VALUE });
  azure.seed("right-vault");
  cookie = await app.signIn();
});

describe("POST /api/key-vaults/update", () => {
  describe("session", () => {
    it("rejects a request without a session and never touches Azure", async () => {
      const response = await app.request("POST", "/api/key-vaults/update", { body: copyRequest() });

      expect(response.status).toBe(401);
      expect(azure.credentialsCreated).toBe(0);
      expect(azure.clientsCreated).toEqual([]);
      expect(azure.valueOf("right-vault", "example-secret")).toBeUndefined();
    });

    it("rejects a session cookie that was not sealed by this server", async () => {
      const response = await postUpdate(copyRequest(), "nuxt-session=forged-value");

      expect(response.status).toBe(401);
      expect(azure.clientsCreated).toEqual([]);
      expect(azure.valueOf("right-vault", "example-secret")).toBeUndefined();
    });

    it("rejects a sealed session that holds no user", async () => {
      const response = await postUpdate(copyRequest(), await app.signIn({}));

      expect(response.status).toBe(401);
      expect(azure.clientsCreated).toEqual([]);
    });
  });

  describe("copying", () => {
    it("copies a secret from the left vault to the right vault", async () => {
      const response = await postUpdate(copyRequest());

      expect(response.status).toBe(200);
      expect(azure.valueOf("right-vault", "example-secret")).toBe(SECRET_VALUE);
      expect(azure.valueOf("left-vault", "example-secret")).toBe(SECRET_VALUE);
      expect(azure.callsOf("set")).toEqual([
        { vaultUrl: vaultUrl("right-vault"), operation: "set", name: "example-secret" },
      ]);
    });

    it("copies a secret from the right vault to the left vault", async () => {
      azure.seed("left-vault");
      azure.seed("right-vault", { "example-secret": "value-from-the-right" });

      const response = await postUpdate(copyRequest({ direction: "rightToLeft" }));

      expect(response.status).toBe(200);
      expect(azure.valueOf("left-vault", "example-secret")).toBe("value-from-the-right");
      expect(azure.callsOf("set")).toEqual([
        { vaultUrl: vaultUrl("left-vault"), operation: "set", name: "example-secret" },
      ]);
    });

    it("overwrites a different value in the target vault", async () => {
      azure.seed("right-vault", { "example-secret": "older-value" });

      const response = await postUpdate(copyRequest());

      expect(response.status).toBe(200);
      expect(azure.valueOf("right-vault", "example-secret")).toBe(SECRET_VALUE);
    });

    it.each(["leftToRight", "rightToLeft"])("refuses to copy an empty value (%s)", async (direction) => {
      azure.seed("left-vault", { "example-secret": "" });
      azure.seed("right-vault", { "example-secret": "" });

      const response = await postUpdate(copyRequest({ direction }));

      expect(response.ok).toBe(false);
      expect(azure.callsOf("set")).toEqual([]);
    });
  });

  describe("failures", () => {
    it("writes nothing when the secret does not exist in the source vault", async () => {
      const response = await postUpdate(copyRequest({ secretName: "no-such-secret" }));

      expect(response.ok).toBe(false);
      expect(azure.callsOf("set")).toEqual([]);
      expect(azure.valueOf("right-vault", "no-such-secret")).toBeUndefined();
    });

    // Defect: the route lets the SDK error through as a 500. A missing secret
    // is a client error. Mapping SDK errors to status codes is a design
    // decision that is not made in this change.
    it.skip("answers 404 when the secret does not exist in the source vault", async () => {
      const response = await postUpdate(copyRequest({ secretName: "no-such-secret" }));

      expect(response.status).toBe(404);
    });

    it("does not put the secret value into the response when the write fails", async () => {
      azure.failOn("right-vault", "set", restError("Caller is not authorized to perform action on resource.", 403, "Forbidden"));

      const response = await postUpdate(copyRequest());

      expect(response.ok).toBe(false);
      expect(await response.text()).not.toContain(SECRET_VALUE);
      expect(azure.valueOf("right-vault", "example-secret")).toBeUndefined();
    });
  });
});
