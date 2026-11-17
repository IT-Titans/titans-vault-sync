// Names as Azure Key Vault accepts them.
//
// A vault name becomes the host part of the vault URL. Checking it before a
// client is created keeps request input from pointing the client, and the
// token it sends, at another host.

// 3 to 24 characters: letters, digits and hyphens, starting with a letter,
// ending with a letter or digit, without two hyphens in a row.
const VAULT_NAME = /^[a-z](?!.*--)[a-z0-9-]{1,22}[a-z0-9]$/i;

// 1 to 127 characters: letters, digits and hyphens.
const SECRET_NAME = /^[a-z0-9-]{1,127}$/i;

export function isVaultName(value: unknown): value is string {
  return typeof value === "string" && VAULT_NAME.test(value);
}

export function isSecretName(value: unknown): value is string {
  return typeof value === "string" && SECRET_NAME.test(value);
}
