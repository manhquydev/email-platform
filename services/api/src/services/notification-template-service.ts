/**
 * NotificationTemplateService
 * Handles CRUD operations for notification templates with variable substitution
 */

import { prisma } from '../lib/prisma';
import { NotificationType } from '@prisma/client';

// Variable definition for template
export interface TemplateVariable {
  name: string;
  required: boolean;
  description?: string;
}

// Template create/update payload
export interface TemplatePayload {
  name: string;
  title: string;
  message: string;
  type?: NotificationType;
  variables?: TemplateVariable[];
  imageUrl?: string;
}

// Available system variables
export const SYSTEM_VARIABLES: TemplateVariable[] = [
  { name: 'username', required: false, description: 'User display name' },
  { name: 'email', required: false, description: 'User email address' },
  { name: 'tier', required: false, description: 'Subscription tier' },
  { name: 'date', required: false, description: 'Current date' },
  { name: 'appName', required: false, description: 'Application name' },
];

/**
 * List all templates with optional archived filter
 */
export async function listTemplates(includeArchived = false) {
  return prisma.notificationTemplate.findMany({
    where: includeArchived ? {} : { isArchived: false },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get template by ID
 */
export async function getTemplateById(id: string) {
  return prisma.notificationTemplate.findUnique({
    where: { id },
    include: {
      _count: { select: { notifications: true, scheduledNotifications: true } },
    },
  });
}

/**
 * Create new template
 */
export async function createTemplate(payload: TemplatePayload) {
  return prisma.notificationTemplate.create({
    data: {
      name: payload.name,
      title: payload.title,
      message: payload.message,
      type: payload.type || 'INFO',
      variables: payload.variables ? JSON.parse(JSON.stringify(payload.variables)) : [],
      imageUrl: payload.imageUrl,
    },
  });
}

/**
 * Update template
 */
export async function updateTemplate(id: string, payload: Partial<TemplatePayload>) {
  const updateData: Record<string, any> = {};
  if (payload.name) updateData.name = payload.name;
  if (payload.title) updateData.title = payload.title;
  if (payload.message) updateData.message = payload.message;
  if (payload.type) updateData.type = payload.type;
  if (payload.variables !== undefined) {
    updateData.variables = JSON.parse(JSON.stringify(payload.variables));
  }
  if (payload.imageUrl !== undefined) updateData.imageUrl = payload.imageUrl;

  return prisma.notificationTemplate.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Archive template (soft delete)
 */
export async function archiveTemplate(id: string) {
  return prisma.notificationTemplate.update({
    where: { id },
    data: { isArchived: true },
  });
}

/**
 * Restore archived template
 */
export async function restoreTemplate(id: string) {
  return prisma.notificationTemplate.update({
    where: { id },
    data: { isArchived: false },
  });
}

/**
 * Clone template with new name
 */
export async function cloneTemplate(id: string, newName?: string) {
  const original = await prisma.notificationTemplate.findUnique({ where: { id } });
  if (!original) throw new Error('Template not found');

  const cloneName = newName || `${original.name}-copy`;

  return prisma.notificationTemplate.create({
    data: {
      name: cloneName,
      title: original.title,
      message: original.message,
      type: original.type,
      variables: original.variables || [],
      imageUrl: original.imageUrl,
    },
  });
}

/**
 * Render template with variable substitution
 */
export function renderTemplate(
  template: { title: string; message: string },
  variables: Record<string, string>
): { title: string; message: string } {
  let { title, message } = template;

  // Replace {{variable}} patterns
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    title = title.replace(pattern, value);
    message = message.replace(pattern, value);
  }

  return { title, message };
}

/**
 * Extract variables from template content
 */
export function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}
