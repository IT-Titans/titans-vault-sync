import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSecret, getSecretsList } from "../../server/services/key-vault-services";
import { captureConsoleError } from "../helpers/console";
import { azure, restError, vaultUrl } from "../helpers/fake-key-vault";

describe("key vault services", () => {
  let logged: ReturnType<typeof captureConsoleError>;

  beforeEach(() => {
    logged = captureConsoleError();
  });

  afterEach(() => {
    logged.restore();
  });

  describe("getSecretsList", () => {
    it("returns the properties of every secret in the vault", async () => {
      azure.seed("team-vault", {
        "database-password": "value-a",
        "api-key": { value: "value-b", enabled: false },
      });

      const secrets = await getSecretsList("team-vault");

      expect(secrets.map(secret => [secret.name, secret.enabled])).toEqual([
        ["database-password", true],
        ["api-key", false],
      ]);
    });

    it("addresses the vault by its name under vault.azure.net", async () => {
      azure.seed("team-vault");

      await getSecretsList("team-vault");

      expect(azure.clientsCreated).toEqual([vaultUrl("team-vault")]);
      expect(azure.clientsCreated[0]).toBe("https://team-vault.vault.azure.net");
    });

    it("returns properties only, never values", async () => {
      azure.seed("team-vault", { "database-password": "value-that-must-stay-in-the-vault" });

      const secrets = await getSecretsList("team-vault");

      expect(JSON.stringify(secrets)).not.toContain("value-that-must-stay-in-the-vault");
      expect(azure.callsOf("get")).toEqual([]);
    });

    it("logs the failure and passes it on when the vault cannot be listed", async () => {
      const failure = restError("Caller is not authorized to perform action on resource.", 403, "Forbidden");
      azure.seed("team-vault");
      azure.failOn("team-vault", "list", failure);

      await expect(getSecretsList("team-vault")).rejects.toBe(failure);

      expect(logged.text()).toContain("Caller is not authorized");
    });
  });

  describe("getSecret", () => {
    it("returns the secret with its value", async () => {
      azure.seed("team-vault", { "database-password": "value-a" });

      const secret = await getSecret("database-password", "team-vault");

      expect(secret).toMatchObject({ name: "database-password", value: "value-a" });
      expect(azure.clientsCreated).toEqual([vaultUrl("team-vault")]);
    });

    it("fails when the secret does not exist", async () => {
      azure.seed("team-vault");

      await expect(getSecret("no-such-secret", "team-vault")).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
