/**
 * Types for Providers Page module
 */

export interface Provider {
  id: string;
  name: string;
  contactEmail: string;
  billingEmail?: string;
  tier: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  apiKeyPrefix: string;
  maxTenants: number;
  maxMailboxes: number;
  maxStorageGb: number;
  tenantCount: number;
  createdAt: string;
}

export interface ProviderUsage {
  period: string;
  summary: {
    tenants: number;
    mailboxes: number;
    messages: number;
  };
  byTenant?: Array<{
    tenantId: string;
    externalId: string;
    mailboxes: number;
    messages: number;
  }>;
}

export interface ProviderUsageLog {
  id: string;
  providerId: string;
  tenantId?: string;
  period: string;
  tenantCount: number;
  mailboxes: number;
  storageBytes: number;
  messagesSent: number;
  messagesReceived: number;
  createdAt: string;
}

export interface CreateProviderData {
  name: string;
  contactEmail: string;
  billingEmail?: string;
  webhookUrl?: string;
  tier?: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
}

export interface UpdateProviderData {
  name?: string;
  contactEmail?: string;
  billingEmail?: string;
  webhookUrl?: string;
  tier?: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
}

export const PAGE_SIZE = 20;

export const TIER_OPTIONS = [
  { value: 'STARTER', label: 'Starter', description: '100 tenants, 1,000 mailboxes' },
  { value: 'GROWTH', label: 'Growth', description: '500 tenants, 5,000 mailboxes' },
  { value: 'ENTERPRISE', label: 'Enterprise', description: 'Unlimited' },
] as const;

export const STATUS_COLORS = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  SUSPENDED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  TERMINATED: 'bg-red-500/20 text-red-400 border-red-500/30',
} as const;

export const TIER_COLORS = {
  STARTER: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  GROWTH: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  ENTERPRISE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
} as const;
