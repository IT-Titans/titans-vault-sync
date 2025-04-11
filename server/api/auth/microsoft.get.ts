export default defineOAuthMicrosoftEventHandler({
  config: {
    scope: [
      "openId", "email", "profile", "User.Read",
    ],
  },
  async onSuccess(event, { user, tokens }) {

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
