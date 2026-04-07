import { SAML } from "@node-saml/passport-saml";
import { appConfig } from "../../config";
import { prisma } from "../../lib/prisma";

export class SamlService {
  private saml: SAML;

  constructor(private providerConfig: any, private providerId: string) {
    this.saml = new SAML({
      callbackUrl: `${appConfig.apiUrl}/sso/saml/${providerId}/acs`,
      entryPoint: providerConfig.entryPoint,
      issuer: providerConfig.issuer || "email-platform",
      idpCert: providerConfig.idpCert || providerConfig.cert,
      identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
      disableRequestedAuthnContext: true
    });
  }

  getAuthorizeUrl(host?: string): Promise<string> {
    return this.saml.getAuthorizeUrlAsync("", host, {});
  }

  async validatePostResponse(body: any): Promise<any> {
    return this.saml.validatePostResponseAsync(body);
  }

  generateMetadata(): string {
    return this.saml.generateServiceProviderMetadata(
      null,
      this.providerConfig.publicCert || null
    );
  }

  static async getProvider(providerId: string) {
    const provider = await prisma.identityProvider.findUnique({
      where: { id: providerId }
    });

    if (!provider || provider.type !== "saml" || !provider.enabled) {
      throw new Error("Invalid or disabled SAML provider");
    }

    return new SamlService(provider.config, providerId);
  }
}
