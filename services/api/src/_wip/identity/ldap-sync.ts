import ldap from "ldapjs";
import { prisma } from "../lib/prisma";
import { appConfig } from "../config";
import { UserRole } from "@prisma/client";

export class LdapService {
  private client: ldap.Client;

  constructor(private config: any) {
    this.client = ldap.createClient({
      url: config.url,
      reconnect: true,
      tlsOptions: config.tlsOptions
    });
  }

  async bind(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.bind(this.config.bindDN, this.config.bindCredentials, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async searchUsers(filter: string): Promise<any[]> {
    const opts: ldap.SearchOptions = {
      filter: filter || this.config.searchFilter || "(objectClass=person)",
      scope: "sub",
      attributes: ["dn", "cn", "sn", "givenName", "mail", "memberOf"]
    };

    return new Promise((resolve, reject) => {
      const users: any[] = [];
      this.client.search(this.config.searchBase, opts, (err, res) => {
        if (err) return reject(err);

        res.on("searchEntry", (entry) => {
          users.push(entry.object);
        });

        res.on("error", (err) => {
          reject(err);
        });

        res.on("end", (result) => {
          resolve(users);
        });
      });
    });
  }

  async syncUsers(organizationId: string, providerId: string): Promise<void> {
    try {
      await this.bind();
      const users = await this.searchUsers(this.config.searchFilter);

      for (const ldapUser of users) {
        if (!ldapUser.mail) continue;

        const email = ldapUser.mail.toString();
        const externalId = ldapUser.dn.toString();

        // Find or create user
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: ldapUser.cn || ldapUser.givenName || email.split("@")[0],
              passwordHash: "LDAP_MANAGED", // Placeholder, auth via LDAP or SSO
              role: UserRole.USER,
              emailVerified: new Date(),
              organizationId
            }
          });
        } else if (user.organizationId !== organizationId) {
          // Skip if user belongs to another org (security check)
          continue;
        }

        // Link external identity
        await prisma.externalIdentity.upsert({
          where: {
            providerId_externalId: {
              providerId,
              externalId
            }
          },
          create: {
            userId: user.id,
            providerId,
            externalId,
            email,
            attributes: ldapUser
          },
          update: {
            email,
            attributes: ldapUser,
            updatedAt: new Date()
          }
        });
      }

      // Update sync timestamp
      await prisma.identityProvider.update({
        where: { id: providerId },
        data: { lastSyncAt: new Date() }
      });

    } finally {
      this.client.unbind();
    }
  }
}
