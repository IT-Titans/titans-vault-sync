import type { SecretProperties} from "@azure/keyvault-secrets";

import {type MergedSecrets, MergeState, type VaultNames} from "~~/types/types";
import {getSecret, getSecretsList} from "~~/server/services/key-vault-services";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const queryParams = getQuery(event);

  if (!session || !session.user || !session.secure) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  try {
    const leftVault = await getSecretsList(queryParams.vaultA as string)
    const rightVault = await getSecretsList(queryParams.vaultB as string);

    return await mergeVaults(leftVault, rightVault, {leftVaultName: queryParams.vaultA as string, rightVaultName:queryParams.vaultB as string}) as MergedSecrets[];
  } catch (e) {
    console.error(e);
    throw createError({ statusCode: 500, statusMessage: 'Something went wrong' });
  }

});


async function mergeVaults(leftVault: SecretProperties[], rightVault: SecretProperties[], vaultNames: VaultNames): Promise<MergedSecrets[]> {
  const result: MergedSecrets[] = [];

  const leftMap = new Map(leftVault.map(secret => [secret.name, secret]));
  const rightMap = new Map(rightVault.map(secret => [secret.name, secret]));

  const allNames = new Set<string>([...leftMap.keys(), ...rightMap.keys()]);

  for (const name of allNames) {
    const left = leftMap.get(name);
    const right = rightMap.get(name);

    if (left && !right) {
      result.push({
        id: left.id || "",
        name: left.name,
        enabled: left.enabled ?? false,
        leftVault: true,
        rightVault: false,
        conflicts: false,
        mergeState: left.enabled ? MergeState.pending : MergeState.disabled,
      })
    } else if (!left && right) {
      result.push({
        id: right.id || "",
        name: right.name,
        enabled: right.enabled ?? false,
        leftVault: false,
        rightVault: true,
        conflicts: false,
        mergeState: right.enabled ? MergeState.pending : MergeState.disabled,

      })
    } else if (left && right) {
      if (!right.enabled && !left.enabled) {
        result.push({
          id: left.id || "",
          name: left.name,
          enabled: left.enabled ?? false,
          leftVault: true,
          rightVault: true,
          conflicts: false,
          mergeState: MergeState.disabled
        });
        continue;
      }

      let leftCredential = "";
      let rightCredential = "";
      if (left.enabled) {
        const credential = await getSecret(left.name, vaultNames.leftVaultName);

        leftCredential = credential.value ?? "";
      }

      if (right.enabled) {
        const credential = await getSecret(right.name,vaultNames.rightVaultName)
        rightCredential = credential.value ?? "";

      }

      const secretsAreEqual =
        leftCredential === rightCredential

      result.push({
        id: left.id || "",
        name: left.name,
        enabled: left.enabled ?? false,
        leftVault: true,
        rightVault: true,
        conflicts: !secretsAreEqual,
        mergeState: secretsAreEqual ? MergeState.merged : MergeState.conflict,
      });
    }
  }

  return result;
}
