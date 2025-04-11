import {DefaultAzureCredential} from "@azure/identity";
import {type KeyVaultSecret, SecretClient, type SecretProperties} from "@azure/keyvault-secrets";

export async function getSecretsList(vaultName: string) {
  try {
    const credential = new DefaultAzureCredential();
    const vaultUrl = `https://${vaultName}.vault.azure.net`;

    const secrets: SecretProperties[] = [];
    const secretClient = new SecretClient(vaultUrl, credential);

    for await (const secret of secretClient.listPropertiesOfSecrets()) {
      secrets.push(secret);
    }

    return secrets;
  } catch (error) {
    console.error(error);
    console.error(typeof error);
    throw error;
  }
}

export async function getSecret(secretName: string, vaultName: string): Promise<KeyVaultSecret> {
  const credential = new DefaultAzureCredential();

  const vaultUrl = `https://${vaultName}.vault.azure.net`;
  const secretClient = new SecretClient(vaultUrl, credential);

  return secretClient.getSecret(secretName);
}