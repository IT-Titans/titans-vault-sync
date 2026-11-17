import {isTenantId, tenantOfIdToken} from "~~/server/utils/tenant";

export default defineOAuthMicrosoftEventHandler({
  config: {
    scope: [
      // "openid" makes the token endpoint return an ID token. The tenant
      // check below reads the tenant of the user from it.
      "openid", "email", "profile", "User.Read",
    ],
  },
  async onSuccess(event, { user, tokens }) {
    // Which accounts Microsoft lets through depends on the app registration
    // and on the configured authority. This check does not rely on either:
    // a session is created only for a user of the one configured tenant.
    // Without the ID of one tenant, nobody is let in.
    const configuredTenant = useRuntimeConfig(event).oauth?.microsoft?.tenant;
    const userTenant = tenantOfIdToken(tokens.id_token);

    if (!isTenantId(configuredTenant) || userTenant?.toLowerCase() !== configuredTenant.toLowerCase()) {
      console.error(
        isTenantId(configuredTenant)
          ? `Microsoft sign-in refused: the user belongs to tenant ${userTenant ?? "unknown"}, not to the configured tenant.`
          : "Microsoft sign-in refused: NUXT_OAUTH_MICROSOFT_TENANT must be the ID of one tenant.",
      );
      throw createError({ statusCode: 403, statusMessage: "Sign-in is not allowed for this account" });
    }

    await setUserSession(event, {
      user: user,
      secure: {
        accessToken: tokens.access_token,
      },
    });
    return sendRedirect(event, "/");
  },
  onError(event, error) {
    console.error("Microsoft OAuth error:", error);
    return sendRedirect(event, "/");
  },
});
