// Turns a failed Key Vault call into the error the API answers with.
//
// The error object of the SDK never leaves this function. It can carry the
// request that failed, and for a write that request contains the secret value.
// The caller gets a status code and a fixed text; the log gets the name, the
// code and the status of the error, which are enough to find the cause.

interface FailureDetails {
  name: string;
  code: string;
  status: number | undefined;
}

function detailsOf(error: unknown): FailureDetails {
  const source = (typeof error === "object" && error !== null ? error : {}) as Record<string, unknown>;
  return {
    name: typeof source.name === "string" ? source.name : "unknown",
    code: typeof source.code === "string" ? source.code : "unknown",
    status: typeof source.statusCode === "number" ? source.statusCode : undefined,
  };
}

function answerFor({ name, code, status }: FailureDetails) {
  // Only errors of the Key Vault service itself are translated by their status.
  // A failed sign-in of the app's credential also carries a status code, but
  // for the caller it is a fault of the server.
  if (name === "RestError") {
    // ENOTFOUND: the vault name does not resolve, so the vault does not exist.
    if (status === 404 || code === "ENOTFOUND") {
      return { statusCode: 404, statusMessage: "Secret or vault not found" };
    }
    // 401 means Key Vault refused the credential of the app. Passing it on
    // would tell the caller to sign in again, which would not help.
    if (status !== undefined && status >= 400 && status < 500 && status !== 401) {
      return { statusCode: status, statusMessage: "Key Vault refused the request" };
    }
    if (status !== undefined && status >= 500) {
      return { statusCode: 502, statusMessage: "Key Vault is not available" };
    }
  }
  return { statusCode: 500, statusMessage: "Key Vault request failed" };
}

export function keyVaultError(error: unknown, operation: string) {
  const details = detailsOf(error);
  console.error(`Key Vault request failed: operation=${operation} name=${details.name} code=${details.code} status=${details.status ?? "none"}`);
  return createError(answerFor(details));
}
