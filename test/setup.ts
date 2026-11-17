import { beforeEach, vi } from "vitest";
import { createError, defineEventHandler, getQuery, readBody, sendRedirect } from "h3";
// The server utilities of nuxt-auth-utils, unchanged, so the tests exercise the
// same session and sign-in code the deployed routes run. The package does not
// export these paths.
import { getUserSession, requireUserSession, setUserSession } from "../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session.js";
import { defineOAuthMicrosoftEventHandler } from "../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/microsoft.js";
import { azure } from "./helpers/fake-key-vault";

vi.mock("@azure/identity", async () => {
  const fake = await import("./helpers/fake-key-vault");
  return { DefaultAzureCredential: fake.DefaultAzureCredential };
});

vi.mock("@azure/keyvault-secrets", async () => {
  const fake = await import("./helpers/fake-key-vault");
  return { SecretClient: fake.SecretClient };
});

// Nitro auto-imports these names into server files. Outside Nitro they are provided as globals.
vi.stubGlobal("createError", createError);
vi.stubGlobal("defineEventHandler", defineEventHandler);
vi.stubGlobal("getQuery", getQuery);
vi.stubGlobal("readBody", readBody);
vi.stubGlobal("sendRedirect", sendRedirect);
vi.stubGlobal("getUserSession", getUserSession);
vi.stubGlobal("requireUserSession", requireUserSession);
vi.stubGlobal("setUserSession", setUserSession);
vi.stubGlobal("defineOAuthMicrosoftEventHandler", defineOAuthMicrosoftEventHandler);

beforeEach(() => {
  azure.reset();
});
