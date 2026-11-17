import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/app";
import { captureConsoleError } from "../helpers/console";
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

  describe("validation", () => {
    async function expectRejected(response: Response) {
      expect(response.status).toBe(400);
      // Nothing may reach Azure before the input is known to be valid.
      expect(azure.credentialsCreated).toBe(0);
      expect(azure.clientsCreated).toEqual([]);
    }

    it("rejects a request without a body", async () => {
      await expectRejected(await app.request("POST", "/api/key-vaults/update", { cookie }));
    });

    it("rejects a body that is not valid JSON", async () => {
      await expectRejected(await app.request("POST", "/api/key-vaults/update", { cookie, rawBody: "{\"leftVaultName\": " }));
    });

    it.each([
      ["null", null],
      ["a string", "left-vault"],
      ["an array", ["left-vault", "right-vault", "example-secret", "leftToRight"]],
    ])("rejects a body that is %s", async (_label, body) => {
      await expectRejected(await postUpdate(body));
    });

    it.each(["leftVaultName", "rightVaultName", "secretName", "direction"])("rejects a body without %s", async (field) => {
      await expectRejected(await postUpdate(copyRequest({ [field]: undefined })));
    });

    it.each([
      ["a number as vault name", { leftVaultName: 42 }],
      ["an object as secret name", { secretName: { name: "example-secret" } }],
    ])("rejects %s", async (_label, overrides) => {
      await expectRejected(await postUpdate(copyRequest(overrides)));
    });

    // An unknown direction used to be treated as "right to left" and
    // overwrote the left vault.
    it.each(["sideways", "LeftToRight", ""])("rejects the unknown direction \"%s\" and writes nothing", async (direction) => {
      azure.seed("right-vault", { "example-secret": "value-from-the-right" });

      await expectRejected(await postUpdate(copyRequest({ direction })));

      expect(azure.valueOf("left-vault", "example-secret")).toBe(SECRET_VALUE);
    });

    it.each([
      ["the same vault", "left-vault"],
      ["the same vault in different case", "LEFT-VAULT"],
    ])("rejects %s as source and target", async (_label, rightVaultName) => {
      await expectRejected(await postUpdate(copyRequest({ rightVaultName })));
    });

    // The name becomes the host part of the vault URL. Anything that is not a
    // vault name would send the request, and the token, to another host.
    it.each([
      "attacker.example.com/",
      "left-vault.attacker.example.com",
      "left-vault/secrets",
      "left-vault#",
      "left vault",
      "ab",
      "a-name-that-is-longer-than-24-characters",
      "1starts-with-a-digit",
      "ends-with-a-hyphen-",
      "double--hyphen",
      "",
    ])("rejects the vault name \"%s\"", async (name) => {
      await expectRejected(await postUpdate(copyRequest({ leftVaultName: name })));
      await expectRejected(await postUpdate(copyRequest({ rightVaultName: name })));
    });

    it.each(["example/secret", "example secret", "example.secret", "example?x=1", "", "a".repeat(128)])(
      "rejects the secret name \"%s\"",
      async (secretName) => {
        await expectRejected(await postUpdate(copyRequest({ secretName })));
      },
    );

    it("accepts names at the limits of what Key Vault allows", async () => {
      const shortest = "abc";
      const longest = `v${"a".repeat(22)}9`;
      const secretName = "A".repeat(127);
      azure.seed(shortest, { [secretName]: SECRET_VALUE });
      azure.seed(longest);

      const response = await postUpdate({ leftVaultName: shortest, rightVaultName: longest, secretName, direction: "leftToRight" });

      expect(response.status).toBe(200);
      expect(azure.valueOf(longest, secretName)).toBe(SECRET_VALUE);
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

    it.each(["leftToRight", "rightToLeft"])("does not send the copied value back to the browser (%s)", async (direction) => {
      azure.seed("right-vault", { "example-secret": SECRET_VALUE });

      const response = await postUpdate(copyRequest({ direction }));
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).not.toContain(SECRET_VALUE);
      expect(JSON.parse(text)).toEqual({ name: "example-secret" });
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
    let logged: ReturnType<typeof captureConsoleError>;

    beforeEach(() => {
      logged = captureConsoleError();
    });

    afterEach(() => {
      logged.restore();
    });

    /** A failure as the SDK reports it: the request it sent travels with the error. */
    function failureCarryingTheValue(statusCode: number, code: string) {
      return Object.assign(restError(`Request failed while writing ${SECRET_VALUE}.`, statusCode, code), {
        request: { url: `${vaultUrl("right-vault")}/secrets/example-secret`, body: JSON.stringify({ value: SECRET_VALUE }) },
      });
    }

    it("answers 404 and writes nothing when the secret does not exist in the source vault", async () => {
      const response = await postUpdate(copyRequest({ secretName: "no-such-secret" }));

      expect(response.status).toBe(404);
      expect(azure.callsOf("set")).toEqual([]);
      expect(azure.valueOf("right-vault", "no-such-secret")).toBeUndefined();
    });

    it("answers 404 when a vault does not exist", async () => {
      const response = await postUpdate(copyRequest({ rightVaultName: "missing-vault" }));

      expect(response.status).toBe(404);
    });

    it("passes on no detail of the Key Vault error", async () => {
      const response = await postUpdate(copyRequest({ secretName: "no-such-secret" }));
      const text = await response.text();

      // The text of the SDK error and the address of the vault stay on the server.
      expect(text).not.toContain("was not found in this key vault");
      expect(text).not.toContain("vault.azure.net");
      expect(JSON.parse(text)).toMatchObject({ statusCode: 404, statusMessage: "Secret or vault not found" });
    });

    it.each([
      ["403 when the app may not write to the target vault", 403, "Forbidden", 403],
      ["409 when the secret is in a deleted but recoverable state", 409, "Conflict", 409],
      ["429 when Key Vault throttles the app", 429, "TooManyRequests", 429],
      ["502 when Key Vault itself fails", 503, "ServiceUnavailable", 502],
      // A 401 from Key Vault means the credential of the app was refused. For
      // the caller that is a fault of the server, and 401 would read as "sign in again".
      ["500 when Key Vault refuses the credential of the app", 401, "Unauthorized", 500],
    ])("answers %s", async (_label, vaultStatus, code, expected) => {
      azure.failOn("right-vault", "set", restError("Key Vault refused.", vaultStatus, code));

      const response = await postUpdate(copyRequest());

      expect(response.status).toBe(expected);
      expect(azure.valueOf("right-vault", "example-secret")).toBeUndefined();
    });

    it("answers 403 when the source secret is disabled", async () => {
      azure.seed("left-vault", { "example-secret": { value: SECRET_VALUE, enabled: false } });

      const response = await postUpdate(copyRequest());

      expect(response.status).toBe(403);
      expect(azure.callsOf("set")).toEqual([]);
    });

    it("answers 500 when the failure did not come from Key Vault", async () => {
      // What the credential reports when the client secret of the app has expired.
      const failure = Object.assign(new Error("invalid_client"), { name: "AuthenticationError", statusCode: 401 });
      azure.failOn("left-vault", "get", failure);

      const response = await postUpdate(copyRequest());

      expect(response.status).toBe(500);
    });

    it.each([403, 503])("puts the secret value neither into the response nor into the log when the write fails with %i", async (vaultStatus) => {
      azure.failOn("right-vault", "set", failureCarryingTheValue(vaultStatus, "Failure"));

      const response = await postUpdate(copyRequest());

      expect(response.ok).toBe(false);
      expect(await response.text()).not.toContain(SECRET_VALUE);
      expect(logged.text()).not.toContain(SECRET_VALUE);
      expect(azure.valueOf("right-vault", "example-secret")).toBeUndefined();
    });

    it("logs what failed, so the cause can be found without the response", async () => {
      azure.failOn("right-vault", "set", restError("Key Vault refused.", 403, "ForbiddenByRbac"));

      await postUpdate(copyRequest());

      expect(logged.count()).toBe(1);
      expect(logged.text()).toContain("ForbiddenByRbac");
      expect(logged.text()).toContain("403");
    });
  });
});
