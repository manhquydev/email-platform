import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate a unique slug from a name
 */
export async function generateSlug(name: string, suffix = ''): Promise<string> {
  // Convert to lowercase and replace spaces and special characters
  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Add suffix if provided
  if (suffix) {
    baseSlug = `${baseSlug}-${suffix}`;
  }

  // Check if slug exists
  const existing = await prisma.organization.findUnique({
    where: { slug: baseSlug }
  });

  if (!existing) {
    return baseSlug;
  }

  // If slug exists, try adding a number
  let counter = 1;
  let newSlug = `${baseSlug}-${counter}`;

  while (await prisma.organization.findUnique({ where: { slug: newSlug } })) {
    counter++;
    newSlug = `${baseSlug}-${counter}`;
  }

  return newSlug;
}

/**
 * Generate a random slug
 */
export function generateRandomSlug(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  // Allow lowercase letters, numbers, and hyphens
  // Must be between 3 and 50 characters
  // Cannot start or end with a hyphen
  const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
}

/**
 * Normalize a slug (clean up format)
 */
export function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}