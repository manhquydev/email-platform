/**
 * Services barrel export - Phase 4 Code Quality
 * Centralized API service layer
 */

export { messageService } from './messageService';
export type {
    Message,
    Attachment,
    MessageQueryParams,
} from './messageService';

export { inboxService } from './inboxService';
export type {
    Inbox,
    CreateInboxRequest,
} from './inboxService';

// Re-export shared types from types module
export type { PaginatedResponse } from '../types/api';
