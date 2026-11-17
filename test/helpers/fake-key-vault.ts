// In-memory replacement for the Azure SDK at its boundary: the two classes the
// server code constructs, DefaultAzureCredential and SecretClient.
// No request leaves the test process, and no credential on the machine that
// runs the tests is ever read.

interface StoredSecret {
  value: string;
  enabled: boolean;
}

type Operation = "list" | "get" | "set";

interface Call {
  vaultUrl: string;
  operation: Operation;
  name?: string;
}

interface PlannedFailure {
  vaultUrl: string;
  operation: Operation;
  error: Error;
}

const vaults = new Map<string, Map<string, StoredSecret>>();
const failures: PlannedFailure[] = [];

/** The URL the server code is expected to build for a vault name. */
export function vaultUrl(vaultName: string) {
  return `https://${vaultName}.vault.azure.net`;
}

/** An error shaped like the RestError of the Azure SDK. */
export function restError(message: string, statusCode: number, code: string) {
  return Object.assign(new Error(message), { name: "RestError", statusCode, code });
}

export const azure = {
  credentialsCreated: 0,
  clientsCreated: [] as string[],
  calls: [] as Call[],

  /** Creates a vault with the given secrets. A string is an enabled secret. */
  seed(vaultName: string, secrets: Record<string, string | StoredSecret> = {}) {
    const stored = new Map<string, StoredSecret>();
    for (const [name, secret] of Object.entries(secrets)) {
      stored.set(name, typeof secret === "string" ? { value: secret, enabled: true } : secret);
    }
    vaults.set(vaultUrl(vaultName), stored);
  },

  /** The value a vault currently holds for a secret, or undefined. */
  valueOf(vaultName: string, secretName: string) {
    return vaults.get(vaultUrl(vaultName))?.get(secretName)?.value;
  },

  /** Makes the next matching operation on a vault fail with the given error. */
  failOn(vaultName: string, operation: Operation, error: Error) {
    failures.push({ vaultUrl: vaultUrl(vaultName), operation, error });
  },

  callsOf(operation: Operation) {
    return azure.calls.filter(call => call.operation === operation);
  },

  reset() {
    vaults.clear();
    failures.length = 0;
    azure.credentialsCreated = 0;
    azure.clientsCreated.length = 0;
    azure.calls.length = 0;
  },
};

export function DefaultAzureCredential() {
  azure.credentialsCreated += 1;
}

export class SecretClient {
  constructor(public readonly vaultUrl: string) {
    azure.clientsCreated.push(vaultUrl);
  }

  private begin(operation: Operation, name?: string) {
    azure.calls.push({ vaultUrl: this.vaultUrl, operation, name });

    const planned = failures.findIndex(failure => failure.vaultUrl === this.vaultUrl && failure.operation === operation);
    if (planned >= 0) {
      throw failures.splice(planned, 1)[0]!.error;
    }

    const vault = vaults.get(this.vaultUrl);
    if (!vault) {
      // What the SDK reports for a vault name that does not resolve.
      throw restError(`getaddrinfo ENOTFOUND ${new URL(this.vaultUrl).host}`, 0, "ENOTFOUND");
    }
    return vault;
  }

  async* listPropertiesOfSecrets() {
    const vault = this.begin("list");
    for (const [name, secret] of vault) {
      yield { name, id: `${this.vaultUrl}/secrets/${name}`, vaultUrl: this.vaultUrl, enabled: secret.enabled };
    }
  }

  async getSecret(name: string) {
    const secret = this.begin("get", name).get(name);
    if (!secret) {
      throw restError(`A secret with (name/id) ${name} was not found in this key vault.`, 404, "SecretNotFound");
    }
    if (!secret.enabled) {
      throw restError("Operation get is not allowed on a disabled secret.", 403, "Forbidden");
    }
    return { name, value: secret.value, properties: { name, vaultUrl: this.vaultUrl, enabled: true } };
  }

  // Like the SDK, the result of a write contains the value that was written.
  async setSecret(name: string, value: string) {
    this.begin("set", name).set(name, { value, enabled: true });
    return { name, value, properties: { name, vaultUrl: this.vaultUrl, enabled: true } };
  }
}
