import { describe, expect, it } from "vitest";
import { isSecretName, isVaultName } from "../../server/utils/vault-names";

describe("isVaultName", () => {
  it.each(["abc", "my-vault-dev", "MyVaultA", "vault-2", "a2345678901234567890123b"])("accepts \"%s\"", (name) => {
    expect(isVaultName(name)).toBe(true);
  });

  it.each([
    ["shorter than 3 characters", "ab"],
    ["longer than 24 characters", "a23456789012345678901234b"],
    ["starting with a digit", "1vault"],
    ["starting with a hyphen", "-vault"],
    ["ending with a hyphen", "vault-"],
    ["with two hyphens in a row", "my--vault"],
    ["with a dot", "my.vault"],
    ["with a slash", "my/vault"],
    ["with a colon", "my:vault"],
    ["with an at sign", "user@vault"],
    ["with a line break", "vault\nname"],
    ["ending with a line break", "my-vault\n"],
    ["with a non-ASCII letter", "trésor"],
    ["that is empty", ""],
  ])("rejects a name %s", (_label, name) => {
    expect(isVaultName(name)).toBe(false);
  });

  it.each([undefined, null, 42, ["my-vault"], { name: "my-vault" }])("rejects the non-string %j", (value) => {
    expect(isVaultName(value)).toBe(false);
  });
});

describe("isSecretName", () => {
  it.each(["a", "database-password", "Api-Key-2", "a".repeat(127)])("accepts a valid name (%#)", (name) => {
    expect(isSecretName(name)).toBe(true);
  });

  it.each([
    ["that is empty", ""],
    ["longer than 127 characters", "a".repeat(128)],
    ["with an underscore", "database_password"],
    ["with a dot", "database.password"],
    ["with a slash", "database/password"],
    ["with a space", "database password"],
    ["with a line break", "database\npassword"],
  ])("rejects a name %s", (_label, name) => {
    expect(isSecretName(name)).toBe(false);
  });

  it.each([undefined, null, 42, ["name"]])("rejects the non-string %j", (value) => {
    expect(isSecretName(value)).toBe(false);
  });
});
