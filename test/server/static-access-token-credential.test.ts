import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaticAccessTokenCredential } from "../../server/utils/custome-credential";

describe("StaticAccessTokenCredential", () => {
  const now = new Date("2026-01-01T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hands out the token it was created with", async () => {
    const credential = new StaticAccessTokenCredential("token-of-the-signed-in-user");

    expect((await credential.getToken()).token).toBe("token-of-the-signed-in-user");
  });

  it("lets the token expire one hour after creation by default", async () => {
    const credential = new StaticAccessTokenCredential("token");

    vi.setSystemTime(new Date("2026-01-01T12:30:00.000Z"));

    // The expiry is fixed at creation. It does not move with later calls.
    expect((await credential.getToken()).expiresOnTimestamp).toBe(new Date("2026-01-01T13:00:00.000Z").getTime());
  });

  it("uses the expiry it was given", async () => {
    const expiresOn = new Date("2026-01-01T12:05:00.000Z");
    const credential = new StaticAccessTokenCredential("token", expiresOn);

    expect((await credential.getToken()).expiresOnTimestamp).toBe(expiresOn.getTime());
  });
});
