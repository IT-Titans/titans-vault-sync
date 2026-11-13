import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, createRouter, defineEventHandler, readBody, toWebHandler } from "h3";
// The real session utilities of nuxt-auth-utils, so the test exercises the same
// check the deployed route runs. The package does not export this path.
import { requireUserSession, setUserSession } from "../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session.js";

// The Azure SDK is replaced completely. No request leaves the test process,
// and no credential on the machine running the tests is ever read.
const azure = vi.hoisted(() => ({
  credentialsCreated: vi.fn(),
  clientsCreated: vi.fn(),
  getSecret: vi.fn(),
  setSecret: vi.fn(),
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: function DefaultAzureCredential() {
    azure.credentialsCreated();
  },
}));

vi.mock("@azure/keyvault-secrets", () => ({
  SecretClient: class {
    constructor(public readonly vaultUrl: string) {
      azure.clientsCreated(vaultUrl);
    }

    getSecret(name: string) {
      return azure.getSecret(this.vaultUrl, name);
    }

    setSecret(name: string, value: string) {
      return azure.setSecret(this.vaultUrl, name, value);
    }
  },
}));

const updateRequest = {
  leftVaultName: "left-vault",
  rightVaultName: "right-vault",
  secretName: "example-secret",
  direction: "leftToRight",
};

let handle: (request: Request) => Promise<Response>;

function postUpdate(cookie?: string) {
  return handle(
    new Request("http://localhost/api/key-vaults/update", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(updateRequest),
    }),
  );
}

async function signIn() {
  const response = await handle(new Request("http://localhost/test/sign-in", { method: "POST" }));
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("The test sign-in route did not set a session cookie.");
  }
  return setCookie.split(";")[0];
}

beforeAll(async () => {
  // Nitro auto-imports these names into server routes. Outside Nitro they are provided as globals.
  vi.stubGlobal("defineEventHandler", defineEventHandler);
  vi.stubGlobal("readBody", readBody);
  vi.stubGlobal("requireUserSession", requireUserSession);

  const { default: updateRoute } = await import("../server/api/key-vaults/update/index.post");

  const router = createRouter()
    .post("/api/key-vaults/update", updateRoute)
    // Test-only route that creates a session the same way the OAuth callback does.
    .post(
      "/test/sign-in",
      defineEventHandler(async (event) => {
        await setUserSession(event, { user: { displayName: "Test User" } });
        return { ok: true };
      }),
    );

  handle = toWebHandler(createApp().use(router));
});

beforeEach(() => {
  vi.clearAllMocks();
  azure.getSecret.mockResolvedValue({ name: updateRequest.secretName, value: "value-from-left-vault" });
  azure.setSecret.mockResolvedValue({ name: updateRequest.secretName });
});

describe("POST /api/key-vaults/update", () => {
  it("rejects a request without a session and never touches Azure", async () => {
    const response = await postUpdate();

    expect(response.status).toBe(401);
    expect(azure.credentialsCreated).not.toHaveBeenCalled();
    expect(azure.clientsCreated).not.toHaveBeenCalled();
    expect(azure.getSecret).not.toHaveBeenCalled();
    expect(azure.setSecret).not.toHaveBeenCalled();
  });

  it("rejects a session cookie that was not sealed by this server", async () => {
    const response = await postUpdate("nuxt-session=forged-value");

    expect(response.status).toBe(401);
    expect(azure.clientsCreated).not.toHaveBeenCalled();
    expect(azure.setSecret).not.toHaveBeenCalled();
  });

  it("copies the secret for a signed-in session", async () => {
    const response = await postUpdate(await signIn());

    expect(response.status).toBe(200);
    expect(azure.getSecret).toHaveBeenCalledWith("https://left-vault.vault.azure.net", "example-secret");
    expect(azure.setSecret).toHaveBeenCalledWith(
      "https://right-vault.vault.azure.net",
      "example-secret",
      "value-from-left-vault",
    );
  });
});
