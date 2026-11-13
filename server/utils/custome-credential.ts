import type {AccessToken, TokenCredential} from "@azure/core-auth";


export class StaticAccessTokenCredential implements TokenCredential {
  constructor(private token: string, private expiresOn: Date = new Date(Date.now() + 60 * 60 * 1000)) {}

  async getToken(): Promise<AccessToken> {
    return {
      token: this.token,
      expiresOnTimestamp: this.expiresOn.getTime(),
    };
  }
}