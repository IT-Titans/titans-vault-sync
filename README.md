# Titans Key Vault Sync

Titans Key Vault Sync is a web tool that compares the secrets of two Azure Key Vaults and copies single secrets from one vault to the other. You sign in with a Microsoft work account, enter two vault names, see which secrets are missing or different on either side, and copy them one at a time. It is a Nuxt application that you host yourself; the server talks to the vaults with a service principal you provide.

**Status:** Maintained. IT Titans GmbH develops this tool, fixes reported problems and keeps its dependencies current. Every pull request is linted, type-checked, tested and built by CI. Read [Security](#security) before you deploy it: the tool does not authorize signed-in users individually.

## Prerequisites

- Node.js 24. The version is recorded in `.nvmrc`.
- pnpm 12.18.0. The version is declared in `package.json`; `corepack enable` makes it available.
- To sign in and work with vaults:
  - a Microsoft Entra app registration with a client secret and the redirect URI `http://localhost:3000/api/auth/microsoft`,
  - two Azure Key Vaults that use Azure role-based access control,
  - the role `Key Vault Secrets Officer` on both vaults for the service principal of the app registration.

## Quick start

```bash
git clone https://github.com/IT-Titans/titans-vault-sync.git
cd titans-vault-sync
pnpm install
cp .env.example .env
pnpm dev
```

The app runs at <http://localhost:3000> and shows the login page. On first start, `pnpm dev` appends a generated `NUXT_SESSION_PASSWORD` to `.env`.

Signing in needs real values in `.env`, see [Configuration](#configuration). With the placeholder values the login button returns to the login page and the server logs a configuration error.

## Configuration

The server reads its configuration from environment variables. In development they come from `.env`.

| Variable | Purpose |
| --- | --- |
| `AZURE_TENANT_ID` | Tenant of the service principal that accesses the vaults. |
| `AZURE_CLIENT_ID` | Application (client) ID of that service principal. |
| `AZURE_CLIENT_SECRET` | Client secret of that service principal. |
| `NUXT_OAUTH_MICROSOFT_TENANT` | ID of the tenant whose users may sign in. It must be a tenant ID. With `common`, `organizations` or a domain name every sign-in is refused. |
| `NUXT_OAUTH_MICROSOFT_CLIENT_ID` | Application (client) ID used for user sign-in. This can be the same app registration. |
| `NUXT_OAUTH_MICROSOFT_CLIENT_SECRET` | Client secret used for user sign-in. |
| `NUXT_OAUTH_MICROSOFT_REDIRECT_URL` | Redirect URI registered for the app. It ends in `/api/auth/microsoft`. |
| `NUXT_SESSION_PASSWORD` | Key that seals the session cookie, at least 32 characters. `pnpm dev` generates it if `.env` does not contain it. A production build does not; set it explicitly there. |

Grant the service principal access to each of the two vaults:

```bash
az role assignment create \
  --assignee <application-client-id> \
  --role "Key Vault Secrets Officer" \
  --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.KeyVault/vaults/<vault-name>
```

## Usage

1. Open the app and sign in with a Microsoft work account.
2. Enter the names of the two vaults, for example `my-vault-dev` and `my-vault-test`. Enter the name only, not the vault URL.
3. Select **Load Vaults**. The table lists every secret name found in either vault, with one of four states:
   - `Merged`: the secret exists in both vaults with the same value.
   - `Mergeable`: the secret exists in one vault only and can be copied to the other.
   - `Conflict`: the secret exists in both vaults with different values, and you decide which side wins. A secret that is enabled in one vault and disabled in the other is also a conflict. It is shown as not enabled and cannot be copied; enable or disable it in Azure first.
   - `Disabled`: the secret is disabled and cannot be copied.
4. Open the action menu of a row and choose the vault to copy to. The copy starts immediately, without a confirmation dialog, and creates a new version of the secret in the target vault.

Back up both vaults before you copy anything. The app has no undo. Only the secret value is copied; tags, content type and expiry dates are not.

## Deployment

The `Dockerfile` builds a Node.js image that serves the app on port 80. Pass all variables from [Configuration](#configuration) to the container, including `NUXT_SESSION_PASSWORD`. Register the redirect URI of the deployed address in the app registration.

```bash
docker build -t titans-vault-sync .
```

CI does not build the image.

## Tests

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

CI runs these four commands on every pull request and on `main`. `pnpm test` runs the tests without measuring coverage.

The tests run the three server routes in-process on an h3 app. The session and sign-in code of `nuxt-auth-utils` is the real one. The Azure SDK is replaced by an in-memory vault and Microsoft's sign-in endpoints by a stub, so the tests need no Azure access and send no requests. They cover the session requirement of both API routes, input validation, the comparison of two vaults, copying in both directions, failures of a vault and the sign-in callback.

Coverage is enforced. `pnpm test:coverage` fails when a file of the measured set has less than 90 % of its lines covered. On 2026-11-17 the figure was 100 % of 127 lines, in total and for each of the eleven files.

The measured set is defined in `vitest.config.ts`:

- every TypeScript file under `server/`: routes, services and utilities,
- `types/`, which holds an enum,
- TypeScript files under `app/`: the composable and the route middleware.

Not measured are the Vue components and pages, `app/app.config.ts`, which only holds theme settings, type declarations, and the configuration files of Nuxt, ESLint and vitest.

Not covered by any automated test: the pages in a browser, and the behaviour against a real Entra tenant and real Key Vaults.

Pull request titles must be Conventional Commits. The [contributing guide](https://github.com/IT-Titans/.github/blob/main/CONTRIBUTING.md) of the organization applies.

## Security

Report vulnerabilities as described in the [security policy](https://github.com/IT-Titans/titans-vault-sync/security/policy). Do not open a public issue for a security problem.

### What the app protects against

- **Requests without a signed-in session.** Both API routes, `GET /api/key-vaults` and `POST /api/key-vaults/update`, answer `401` without a valid session cookie. Reading and copying secrets both require a signed-in user.
- **Secret values reaching the browser.** Values are compared on the server. The list sent to the browser contains names and states only, and the copy route answers with the name of the copied secret.
- **A sign-in that the visitor did not start.** Every sign-in begins with a random `state` that is kept in a cookie. The callback refuses a code whose `state` does not match, so a prepared link cannot sign a visitor in as someone else.
- **Users of other tenants.** The sign-in callback reads the tenant of the user from the ID token and creates a session only if it is the tenant in `NUXT_OAUTH_MICROSOFT_TENANT`. Everyone else gets `403`. This holds even if the app registration accepts accounts of other organizations. Guests of your tenant who sign in at your tenant count as users of it.
- **Request input reaching Azure unchecked.** Both routes answer `400` before any Azure client is created unless the vault names and the secret name match what Azure Key Vault accepts. A vault name can therefore not point the server at another host. The copy route also rejects an unknown direction and a copy from a vault to itself.

### What the app does not protect against

- **Signed-in users are not authorized individually.** Every vault access uses the service principal from `AZURE_CLIENT_ID`, not the identity of the signed-in user. Anyone who can sign in can list the secret names of, and copy secrets between, all vaults that service principal can reach. The user's own Azure role assignments are not consulted.
- **Whether two secrets are equal is disclosed.** The states `Merged` and `Conflict` tell a signed-in user whether the values in both vaults match.
- **There is no audit log.** The app does not record who read or copied what. Key Vault diagnostic logs show the service principal, not the user.
- **Sessions have no server-side lifetime.** No maximum age is configured. A session cookie stays valid until the browser discards it or `NUXT_SESSION_PASSWORD` changes.
- **Two dependency advisories are open.** On 2026-11-17 `pnpm audit` reported one moderate advisory against minimatch and one low advisory against esbuild. Both packages are build tooling and are not part of the server that is deployed. Neither has a fixed version within the ranges of the packages that depend on them.

Until these points are addressed, give the service principal access only to vaults that every person who can sign in is allowed to read from and write to, and restrict who can reach the app.

## License

Copyright 2025 IT Titans GmbH

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full text. The license does not grant permission to use the trade names, trademarks, service marks or product names of IT Titans GmbH (section 6 of the license).
