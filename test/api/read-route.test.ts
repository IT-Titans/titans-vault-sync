import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type MergedSecrets, MergeState } from "../../types/types";
import { createTestApp } from "../helpers/app";
import { captureConsoleError } from "../helpers/console";
import { azure, restError, vaultUrl } from "../helpers/fake-key-vault";

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

  describe("comparison", () => {
    async function compare() {
      const response = await getVaults();
      expect(response.status).toBe(200);
      const rows = await response.json() as MergedSecrets[];
      return Object.fromEntries(rows.map(row => [row.name, row]));
    }

    it("returns an empty list for two empty vaults", async () => {
      const response = await getVaults();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
    });

    it("reports a secret that exists only in the left vault as mergeable", async () => {
      azure.seed("left-vault", { "only-left": "value" });

      expect((await compare())["only-left"]).toEqual({
        id: `${vaultUrl("left-vault")}/secrets/only-left`,
        name: "only-left",
        enabled: true,
        leftVault: true,
        rightVault: false,
        conflicts: false,
        mergeState: MergeState.pending,
      });
    });

    it("reports a secret that exists only in the right vault as mergeable", async () => {
      azure.seed("right-vault", { "only-right": "value" });

      expect((await compare())["only-right"]).toEqual({
        id: `${vaultUrl("right-vault")}/secrets/only-right`,
        name: "only-right",
        enabled: true,
        leftVault: false,
        rightVault: true,
        conflicts: false,
        mergeState: MergeState.pending,
      });
    });

    it("reports a secret with the same value in both vaults as merged", async () => {
      azure.seed("left-vault", { shared: "same-value" });
      azure.seed("right-vault", { shared: "same-value" });

      expect((await compare()).shared).toMatchObject({
        leftVault: true,
        rightVault: true,
        conflicts: false,
        mergeState: MergeState.merged,
      });
    });

    it("reports a secret with different values as a conflict", async () => {
      azure.seed("left-vault", { shared: "left-value" });
      azure.seed("right-vault", { shared: "right-value" });

      expect((await compare()).shared).toMatchObject({
        leftVault: true,
        rightVault: true,
        conflicts: true,
        mergeState: MergeState.conflict,
      });
    });

    it.each(["left-vault", "right-vault"])("reports a disabled secret that exists only in the %s as disabled", async (vault) => {
      azure.seed(vault, { retired: { value: "value", enabled: false } });

      expect((await compare()).retired).toMatchObject({
        enabled: false,
        conflicts: false,
        mergeState: MergeState.disabled,
      });
    });

    it("reports a secret that is disabled in both vaults as disabled without reading its value", async () => {
      azure.seed("left-vault", { retired: { value: "left-value", enabled: false } });
      azure.seed("right-vault", { retired: { value: "right-value", enabled: false } });

      expect((await compare()).retired).toMatchObject({
        enabled: false,
        leftVault: true,
        rightVault: true,
        conflicts: false,
        mergeState: MergeState.disabled,
      });
      expect(azure.callsOf("get")).toEqual([]);
    });

    // A secret that is enabled in one vault and disabled in the other differs,
    // whichever side is disabled. The row is reported as not enabled, which is
    // what makes the user interface offer no copy in either direction.
    describe.each([
      ["left-vault", "right-vault"],
      ["right-vault", "left-vault"],
    ])("a secret that is disabled only in the %s", (disabledIn, enabledIn) => {
      it("is reported as a conflict that cannot be copied", async () => {
        azure.seed(disabledIn, { shared: { value: "old-value", enabled: false } });
        azure.seed(enabledIn, { shared: "current-value" });

        expect((await compare()).shared).toMatchObject({
          enabled: false,
          leftVault: true,
          rightVault: true,
          conflicts: true,
          mergeState: MergeState.conflict,
        });
      });

      it("is a conflict even when the enabled secret has an empty value", async () => {
        azure.seed(disabledIn, { shared: { value: "old-value", enabled: false } });
        azure.seed(enabledIn, { shared: "" });

        expect((await compare()).shared).toMatchObject({ conflicts: true, mergeState: MergeState.conflict });
      });

      it("reads no value, because there is nothing to compare it with", async () => {
        azure.seed(disabledIn, { shared: { value: "old-value", enabled: false } });
        azure.seed(enabledIn, { shared: "current-value" });

        await compare();

        // Azure refuses to return the value of a disabled secret.
        expect(azure.callsOf("get")).toEqual([]);
      });
    });

    it("reports a secret that is disabled in one vault the same way from either side", async () => {
      azure.seed("left-vault", { shared: { value: "old-value", enabled: false } });
      azure.seed("right-vault", { shared: "current-value" });
      const disabledOnTheLeft = (await compare()).shared!;

      azure.seed("left-vault", { shared: "current-value" });
      azure.seed("right-vault", { shared: { value: "old-value", enabled: false } });
      const disabledOnTheRight = (await compare()).shared!;

      expect(disabledOnTheLeft.enabled).toBe(disabledOnTheRight.enabled);
      expect(disabledOnTheLeft.mergeState).toBe(disabledOnTheRight.mergeState);
      expect(disabledOnTheLeft.conflicts).toBe(disabledOnTheRight.conflicts);
    });

    it("reads values only for secrets that exist in both vaults", async () => {
      azure.seed("left-vault", { "only-left": "a", "shared": "b" });
      azure.seed("right-vault", { "only-right": "c", "shared": "b" });

      const rows = await compare();

      expect(Object.keys(rows).sort()).toEqual(["only-left", "only-right", "shared"]);
      expect(azure.callsOf("get").map(call => call.name)).toEqual(["shared", "shared"]);
    });

    it("never sends a secret value to the browser", async () => {
      azure.seed("left-vault", { "only-left": "left-only-value", "shared": "left-shared-value", "same": "same-value" });
      azure.seed("right-vault", { "only-right": "right-only-value", "shared": "right-shared-value", "same": "same-value" });

      const response = await getVaults();
      const text = await response.text();

      expect(response.status).toBe(200);
      for (const value of ["left-only-value", "left-shared-value", "same-value", "right-only-value", "right-shared-value"]) {
        expect(text).not.toContain(value);
      }
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

    async function expectFailure(response: Response) {
      expect(response.status).toBe(500);
      expect(await response.json()).toMatchObject({ statusCode: 500, statusMessage: "Something went wrong" });
    }

    it("answers 500 and logs the cause when a vault does not exist", async () => {
      await expectFailure(await getVaults("vaultA=left-vault&vaultB=missing-vault"));

      expect(logged.text()).toContain("ENOTFOUND");
    });

    it("answers 500 when the app may not list the secrets of a vault", async () => {
      azure.failOn("right-vault", "list", restError("Caller is not authorized to perform action on resource.", 403, "Forbidden"));

      await expectFailure(await getVaults());

      expect(logged.text()).toContain("Caller is not authorized");
    });

    it("leaks no secret value into the response or the log when reading a value fails", async () => {
      azure.seed("left-vault", { shared: "left-secret-value" });
      azure.seed("right-vault", { shared: "right-secret-value" });
      azure.failOn("right-vault", "get", restError("Caller is not authorized to perform action on resource.", 403, "Forbidden"));

      const response = await getVaults();
      const text = await response.clone().text();

      await expectFailure(response);
      // The left value had already been read when the right vault refused.
      expect(text).not.toContain("left-secret-value");
      expect(logged.text()).not.toContain("left-secret-value");
      expect(logged.text()).not.toContain("right-secret-value");
    });
  });
});
