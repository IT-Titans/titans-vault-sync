import { createApp, createRouter, defineEventHandler, getQuery, readBody, toWebHandler } from "h3";
import { getUserSession, setUserSession } from "../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session.js";

interface RequestOptions {
  cookie?: string;
  /** Sent as JSON. Use rawBody to send text that is not valid JSON. */
  body?: unknown;
  rawBody?: string;
}

/** What the sign-in callback stores for a user who signed in with Microsoft. */
export const signedInSession = {
  user: { displayName: "Test User" },
  secure: { accessToken: "test-access-token" },
};

/**
 * Mounts the three server routes on an h3 app and returns functions that send
 * requests to it in-process. Two test-only routes create and read a session
 * the same way the application does.
 */
export async function createTestApp() {
  const [readRoute, updateRoute, signInRoute] = await Promise.all([
    import("../../server/api/key-vaults/index.get"),
    import("../../server/api/key-vaults/update/index.post"),
    import("../../server/api/auth/microsoft.get"),
  ]);

  const router = createRouter()
    .get("/api/key-vaults", readRoute.default)
    .post("/api/key-vaults/update", updateRoute.default)
    .get("/api/auth/microsoft", signInRoute.default)
    .post(
      "/test/sign-in",
      defineEventHandler(async (event) => {
        await setUserSession(event, await readBody(event));
        return { ok: true };
      }),
    )
    .get(
      "/test/session",
      defineEventHandler(async (event) => {
        // The secure part of a session is never sent to the browser. It is
        // returned here only when a test asks for it.
        const { user, secure } = await getUserSession(event);
        return getQuery(event).secure === "1" ? { user, secure } : { user };
      }),
    );

  const handle = toWebHandler(createApp().use(router));

  function request(method: string, path: string, options: RequestOptions = {}) {
    const headers: Record<string, string> = {};
    if (options.cookie) {
      headers.cookie = options.cookie;
    }
    let body: string | undefined;
    if (options.rawBody !== undefined) {
      headers["content-type"] = "application/json";
      body = options.rawBody;
    }
    else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }
    return handle(new Request(`http://localhost${path}`, { method, headers, body }));
  }

  /** Returns the cookie header of a new session. */
  async function signIn(session: object = signedInSession) {
    const response = await request("POST", "/test/sign-in", { body: session });
    return sessionCookie(response);
  }

  return { request, signIn };
}

/** Extracts "name=value" of the session cookie from a response, or fails. */
export function sessionCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("The response did not set a session cookie.");
  }
  return setCookie.split(";")[0]!;
}
