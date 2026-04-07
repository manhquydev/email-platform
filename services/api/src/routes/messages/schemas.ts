import { z } from "zod";

export const messageIdParamsSchema = z.object({ id: z.string().uuid() });

export const listMessagesQuerySchema = z.object({
  inboxId: z.string().uuid(),
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
  q: z.string().optional(),
  hasAttachments: z.coerce.boolean().optional(),
});

export const inboxMessagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
  q: z.string().optional(),
  from: z.string().optional(),
  subject: z.string().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  hasAttachments: z.coerce.boolean().optional(),
  isRead: z.coerce.boolean().optional(),
});

export const searchMessagesQuerySchema = z.object({
  q: z.string().optional(),
  domain: z.string().optional(),
  from: z.string().optional(),
  hasAttachment: z.enum(["true", "false"]).optional(),
  isRead: z.enum(["true", "false"]).optional(),
  after: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const fuzzySearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().min(1).max(100).optional(),
  threshold: z.coerce.number().min(0).max(1).optional(),
});

export const readBodySchema = z.object({ isRead: z.boolean() });
export const pinBodySchema = z.object({ isPinned: z.boolean() });
export const snoozeBodySchema = z.object({ snoozedUntil: z.string().datetime().nullable() });

export const replyBodySchema = z.object({
  text: z.string().optional(),
  html: z.string().optional(),
  subject: z.string().optional(),
  replyAll: z.boolean().optional().default(false),
});

export const forwardBodySchema = z.object({
  to: z.string().email(),
  text: z.string().optional(),
  html: z.string().optional(),
  includeAttachments: z.boolean().optional().default(false),
});

export const summarizeBodySchema = z.object({
  forceRegenerate: z.boolean().optional().default(false),
});

export const moveBodySchema = z.object({ folderId: z.string().uuid() });
export const flagBodySchema = z.object({ flag: z.string() });
export const flagParamsSchema = z.object({ id: z.string().uuid(), flag: z.string() });
