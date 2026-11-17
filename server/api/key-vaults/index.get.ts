import type { SecretProperties} from "@azure/keyvault-secrets";

import {type MergedSecrets, MergeState, type VaultNames} from "~~/types/types";
import {getSecret, getSecretsList} from "~~/server/services/key-vault-services";
import {isVaultName} from "~~/server/utils/vault-names";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session || !session.user || !session.secure) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  // The names are request input. They are checked before any Azure client is created.
  const {vaultA, vaultB} = getQuery(event);
  if (!isVaultName(vaultA) || !isVaultName(vaultB)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid vault name' });
  }

  try {
    const leftVault = await getSecretsList(vaultA)
    const rightVault = await getSecretsList(vaultB);

    return await mergeVaults(leftVault, rightVault, {leftVaultName: vaultA, rightVaultName: vaultB}) as MergedSecrets[];
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

      if (!left.enabled || !right.enabled) {
        // Enabled in one vault and disabled in the other. The two differ,
        // whichever side is disabled. Azure does not return the value of a
        // disabled secret, so there is nothing to compare. The row is reported
        // as not enabled, and the user interface then offers no copy in either
        // direction: a copy would read the disabled secret, or overwrite it
        // with an enabled one.
        result.push({
          id: left.id || "",
          name: left.name,
          enabled: false,
          leftVault: true,
          rightVault: true,
          conflicts: true,
          mergeState: MergeState.conflict
        });
        continue;
      }

      const leftCredential = (await getSecret(left.name, vaultNames.leftVaultName)).value ?? "";
      const rightCredential = (await getSecret(right.name, vaultNames.rightVaultName)).value ?? "";

      const secretsAreEqual =
        leftCredential === rightCredential

      result.push({
        id: left.id || "",
        name: left.name,
        enabled: true,
        leftVault: true,
        rightVault: true,
        conflicts: !secretsAreEqual,
        mergeState: secretsAreEqual ? MergeState.merged : MergeState.conflict,
      });
    }
  }

  return result;
}
