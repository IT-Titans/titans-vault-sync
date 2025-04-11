declare module '#auth-utils' {
  interface User {
    displayName: string;
  }

  interface UserSession {
    // Add your own fields
  }

  interface SecureSessionData {
    // Add your own fields
    accessToken: string;
  }
}

export {}