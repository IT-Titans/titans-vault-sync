export enum MergeState {
  merged = "merged",
  pending = "mergeable",
  conflict = "conflict",
  disabled = "disabled",
}

export interface VaultNames {
  leftVaultName: string;
  rightVaultName: string;
}

export interface Secret {
  id?: string;
  name: string;
}

export interface MergedSecrets {
  id: string;
  name: string;
  version?: string;
  leftVault: boolean;
  rightVault: boolean;
  conflicts: boolean;
  enabled: boolean;
  mergeState: MergeState;
}

export interface UpdateSecretsBody {
  leftVaultName: string;
  rightVaultName: string;
  secretName: string;
  direction: string;
}