declare module '#auth-utils' {
  interface User {
    displayName: string;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- extension point of nuxt-auth-utils, intentionally empty
  interface UserSession {
    // Add your own fields
  }

  interface SecureSessionData {
    // Add your own fields
    accessToken: string;
  }
}

export {}