import {DefaultAzureCredential} from "@azure/identity";
import {SecretClient} from "@azure/keyvault-secrets";
import type {UpdateSecretsBody} from "~~/types/types";

export default defineEventHandler(async (event) => {
  // Answer 401 before the body is read or any Azure client is created.
  await requireUserSession(event);

  const body = await readBody<UpdateSecretsBody>(event);

  const credential = new DefaultAzureCredential();

  const leftVaultUrl = `https://${body.leftVaultName}.vault.azure.net`;
  const rightVaultUrl = `https://${body.rightVaultName}.vault.azure.net`;

  const leftVaultClient = new SecretClient(leftVaultUrl, credential);
  const rightVaultClient = new SecretClient(rightVaultUrl, credential);

  if (body.direction === 'leftToRight') {
    const secretLeft = await leftVaultClient.getSecret(body.secretName);
    if (!secretLeft.value) {
      throw Error(`Cannot update keyVault for ${body.secretName}`);
    }
    await rightVaultClient.setSecret(body.secretName, secretLeft.value);
    return {name: body.secretName};
  }

  const secretRight = await rightVaultClient.getSecret(body.secretName);
  if (!secretRight.value) {
    throw Error(`Cannot update keyVault for ${body.secretName}`);
  }
  // setSecret returns the written secret including its value. Only the name
  // goes back to the browser.
  await leftVaultClient.setSecret(body.secretName, secretRight.value);
  return {name: body.secretName};
})