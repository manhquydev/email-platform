import { appConfig } from "../../config";
import { prisma } from "../../lib/prisma";

export class OidcService {
  private client: any;

  private constructor(client: any) {
    this.client = client;
  }

  static async create(providerConfig: any, providerId: string): Promise<OidcService> {
    // Dynamic import for ESM package in CJS environment
    const { Issuer } = await import("openid-client");

    let issuer;
    if (providerConfig.discoveryUrl) {
      issuer = await Issuer.discover(providerConfig.discoveryUrl);
    } else {
      issuer = new Issuer({
        issuer: providerConfig.issuer,
        authorization_endpoint: providerConfig.authorizationEndpoint,
        token_endpoint: providerConfig.tokenEndpoint,
        userinfo_endpoint: providerConfig.userInfoEndpoint,
        jwks_uri: providerConfig.jwksUri,
      });
    }

    const client = new issuer.Client({
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
      redirect_uris: [`${appConfig.apiUrl}/sso/oidc/${providerId}/callback`],
      response_types: ["code"],
    });

    return new OidcService(client);
  }

  getAuthorizationUrl(): string {
    return this.client.authorizationUrl({
      scope: "openid email profile",
    });
  }

  async callback(params: any): Promise<{ email: string; sub: string; name?: string }> {
    const tokenSet = await this.client.callback(
      this.client.metadata.redirect_uris[0],
      params
    );

    const userInfo = await this.client.userinfo(tokenSet.access_token);

    return {
      email: userInfo.email,
      sub: userInfo.sub,
      name: userInfo.name || userInfo.given_name
    };
  }

  static async getProvider(providerId: string) {
    const provider = await prisma.identityProvider.findUnique({
      where: { id: providerId }
    });

    if (!provider || provider.type !== "oidc" || !provider.enabled) {
      throw new Error("Invalid or disabled OIDC provider");
    }

    return OidcService.create(provider.config, providerId);
  }
}
