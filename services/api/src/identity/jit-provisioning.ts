import { prisma } from "../lib/prisma";
import { UserRole } from "@prisma/client";
import crypto from "crypto";

export async function provisionUser(
  providerId: string,
  externalId: string,
  email: string,
  attributes: any
) {
  const provider = await prisma.identityProvider.findUnique({
    where: { id: providerId },
    include: { organization: true }
  });

  if (!provider || !provider.enabled) {
    throw new Error("Provider not found or disabled");
  }

  // 1. Try to find existing link
  const existingLink = await prisma.externalIdentity.findUnique({
    where: {
      providerId_externalId: {
        providerId,
        externalId
      }
    },
    include: { user: true }
  });

  if (existingLink) {
    // Update attributes and return user
    await prisma.externalIdentity.update({
      where: { id: existingLink.id },
      data: {
        email, // Update email if changed in IDP
        attributes,
        updatedAt: new Date()
      }
    });
    return existingLink.user;
  }

  // 2. Try to find user by email
  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (user) {
    // Security check: User must belong to the same organization
    // If user has no org, we can adopt them if policy allows (assuming yes for now)
    if (user.organizationId && user.organizationId !== provider.organizationId) {
      throw new Error("User email belongs to another organization");
    }

    // Link user if not linked
    if (!user.organizationId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { organizationId: provider.organizationId }
      });
    }
  } else {
    // 3. Create new user
    // Determine role from attributes (e.g. groups) - simplified for now
    const name = attributes.name || attributes.displayName || email.split("@")[0];

    user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: "SSO_MANAGED", // Placeholder
        role: UserRole.USER, // Default role
        emailVerified: new Date(), // Trusted from IDP
        organizationId: provider.organizationId,
        organizationMemberships: {
          create: {
            organizationId: provider.organizationId,
            role: "MEMBER" // Default org role
          }
        }
      }
    });
  }

  // Create ExternalIdentity link
  await prisma.externalIdentity.create({
    data: {
      userId: user.id,
      providerId,
      externalId,
      email,
      attributes
    }
  });

  return user;
}
