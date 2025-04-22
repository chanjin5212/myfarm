import { GraphQLClient } from "graphql-request";

// DeliveryTracker API 클라이언트 클래스
export class DeliveryTrackerGraphQLClient extends GraphQLClient {
  private _accessToken: string | null = null;
  private _credentials: string;

  constructor(clientId: string, clientSecret: string) {
    super("https://apis.tracker.delivery/graphql", {
      fetch: (input, init) => this._fetch(input, init),
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });
    this._accessToken = null;
    this._credentials = "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  }

  async _fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = await this.getAccessToken();
    let response = await fetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      }
    });

    let responseBody = await response.text();

    if (this._hasUnauthenticatedError(JSON.parse(responseBody))) {
      const newToken = await this.getAccessToken(true);
      response = await fetch(input, {
        ...init,
        headers: {
          ...init?.headers,
          "Authorization": `Bearer ${newToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        }
      });
      responseBody = await response.text();
    }

    if (!response.ok) {
      throw new Error(`GraphQL Error (Code: ${response.status}): ${responseBody}`);
    }

    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  private _hasUnauthenticatedError(responseBody: any) {
    if (!Array.isArray(responseBody.errors)) {
      return false;
    }
    for (const error of responseBody.errors) {
      try {
        if (error.extensions?.code === "UNAUTHENTICATED") {
          return true;
        }
      } catch (e) {}
    }
    return false;
  }

  private async getAccessToken(forceFetchNewAccessToken = false) {
    if (this._accessToken === null || forceFetchNewAccessToken) {
      this._accessToken = await this._fetchNewAccessToken();
    }
    return this._accessToken;
  }

  private async _fetchNewAccessToken() {
    const authResponse = await fetch(
      "https://auth.tracker.delivery/oauth2/token",
      {
        method: "POST",
        headers: {
          "Authorization": this._credentials,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      },
    );
    
    if(authResponse.status >= 400) {
      throw new Error(`Auth error: http response code=${authResponse.status} body=${await authResponse.text()}`);
    }
    
    try {
      const authResponseBody = await authResponse.json();
      const accessToken = authResponseBody.access_token;
      if (typeof accessToken !== "string") {
        throw new Error('typeof accessToken !== "string"');
      }
      return accessToken;
    } catch (e) {
      throw new Error("The access_token field was not found.", { cause: e });
    }
  }
} 