import {DefaultAzureCredential} from "@azure/identity";
import {SecretClient} from "@azure/keyvault-secrets";
import type {UpdateSecretsBody} from "~~/types/types";
import {isSecretName, isVaultName} from "~~/server/utils/vault-names";
import {keyVaultError} from "~~/server/utils/key-vault-errors";

// A failed Key Vault call is answered with a status and a fixed text. The error
// of the SDK, which can carry the secret value, is not passed on.
const failed = (operation: string) => (error: unknown): never => {
  throw keyVaultError(error, operation);
};

export default defineEventHandler(async (event) => {
  // Answer 401 before the body is read or any Azure client is created.
  await requireUserSession(event);

  // The body is request input. Nothing in it is used before it is checked.
  const input = await readBody<Partial<Record<keyof UpdateSecretsBody, unknown>> | null>(event);
  const {leftVaultName, rightVaultName, secretName, direction} = input ?? {};

  if (
    !isVaultName(leftVaultName)
    || !isVaultName(rightVaultName)
    || !isSecretName(secretName)
    || (direction !== 'leftToRight' && direction !== 'rightToLeft')
  ) {
    throw createError({statusCode: 400, statusMessage: 'Invalid request body'});
  }

  // Vault names are not case-sensitive.
  if (leftVaultName.toLowerCase() === rightVaultName.toLowerCase()) {
    throw createError({statusCode: 400, statusMessage: 'Source and target vault must differ'});
  }

  const body = {leftVaultName, rightVaultName, secretName, direction};

  const credential = new DefaultAzureCredential();

  const leftVaultUrl = `https://${body.leftVaultName}.vault.azure.net`;
  const rightVaultUrl = `https://${body.rightVaultName}.vault.azure.net`;

  const leftVaultClient = new SecretClient(leftVaultUrl, credential);
  const rightVaultClient = new SecretClient(rightVaultUrl, credential);

  if (body.direction === 'leftToRight') {
    const secretLeft = await leftVaultClient.getSecret(body.secretName).catch(failed('read'));
    if (!secretLeft.value) {
      throw Error(`Cannot update keyVault for ${body.secretName}`);
    }
    await rightVaultClient.setSecret(body.secretName, secretLeft.value).catch(failed('write'));
    return {name: body.secretName};
  }

  const secretRight = await rightVaultClient.getSecret(body.secretName).catch(failed('read'));
  if (!secretRight.value) {
    throw Error(`Cannot update keyVault for ${body.secretName}`);
  }
  // setSecret returns the written secret including its value. Only the name
  // goes back to the browser.
  await leftVaultClient.setSecret(body.secretName, secretRight.value).catch(failed('write'));
  return {name: body.secretName};
})