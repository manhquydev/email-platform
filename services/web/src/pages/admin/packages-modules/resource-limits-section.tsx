/**
 * Resource Limits Section for Package Form
 * Allows admin to configure all tier resource limits
 */

import { PremiumToggle } from "../../../components/admin/AdminUIComponents";

// Limit field definitions with categories
const LIMIT_FIELDS = {
  app: [
    { key: "domains", label: "Tên miền", type: "number", hint: "-1 = Không giới hạn" },
    { key: "inboxes", label: "Hộp thư", type: "number", hint: "-1 = Không giới hạn" },
    { key: "storageGB", label: "Dung lượng (GB)", type: "number", step: "0.1" },
    { key: "dailyEmails", label: "Email/ngày", type: "number", hint: "-1 = Không giới hạn" },
    { key: "retentionDays", label: "Lưu trữ (ngày)", type: "number" },
    { key: "teams", label: "Đội nhóm", type: "number" },
    { key: "teamMembers", label: "Thành viên/đội", type: "number" },
    { key: "filters", label: "Bộ lọc", type: "number" },
    { key: "forwardingRules", label: "Quy tắc chuyển tiếp", type: "number" },
    { key: "labels", label: "Nhãn", type: "number" },
  ],
  api: [
    { key: "webhooks", label: "Webhooks", type: "number", hint: "-1 = Không giới hạn" },
    { key: "apiAccess", label: "Truy cập API", type: "boolean" },
    { key: "requestsPerMinute", label: "API requests/phút", type: "number", hint: "-1 = Không giới hạn" },
    { key: "inboxesPerDay", label: "Tạo inbox/ngày (API)", type: "number" },
    { key: "messagesPerInbox", label: "Tin nhắn/inbox", type: "number" },
    { key: "maxApiKeys", label: "API Keys", type: "number" },
    { key: "maxAttachmentMB", label: "Đính kèm tối đa (MB)", type: "number" },
  ],
  support: [
    { key: "prioritySupport", label: "Hỗ trợ ưu tiên", type: "boolean" },
  ],
} as const;

// Default limits for each tier
const DEFAULT_LIMITS: Record<string, Record<string, number | boolean>> = {
  FREE: {
    domains: 1, inboxes: 3, storageGB: 0.1, dailyEmails: 50, retentionDays: 7,
    teams: 0, teamMembers: 0, filters: 3, forwardingRules: 2, labels: 5,
    webhooks: 1, apiAccess: false, requestsPerMinute: 60, inboxesPerDay: 100,
    messagesPerInbox: 100, maxApiKeys: 1, maxAttachmentMB: 1, prioritySupport: false,
  },
  STARTER: {
    domains: 3, inboxes: 20, storageGB: 1, dailyEmails: 200, retentionDays: 30,
    teams: 1, teamMembers: 3, filters: 10, forwardingRules: 5, labels: 20,
    webhooks: 3, apiAccess: true, requestsPerMinute: 300, inboxesPerDay: 1000,
    messagesPerInbox: 500, maxApiKeys: 3, maxAttachmentMB: 5, prioritySupport: false,
  },
  PROFESSIONAL: {
    domains: 10, inboxes: 100, storageGB: 5, dailyEmails: 1000, retentionDays: 90,
    teams: 5, teamMembers: 10, filters: 50, forwardingRules: 20, labels: 100,
    webhooks: 10, apiAccess: true, requestsPerMinute: 600, inboxesPerDay: 10000,
    messagesPerInbox: 1000, maxApiKeys: 10, maxAttachmentMB: 10, prioritySupport: true,
  },
  BUSINESS: {
    domains: 25, inboxes: 500, storageGB: 20, dailyEmails: 5000, retentionDays: 180,
    teams: 15, teamMembers: 30, filters: 200, forwardingRules: 50, labels: 500,
    webhooks: 25, apiAccess: true, requestsPerMinute: 1200, inboxesPerDay: 50000,
    messagesPerInbox: 5000, maxApiKeys: 25, maxAttachmentMB: 25, prioritySupport: true,
  },
  ENTERPRISE: {
    domains: -1, inboxes: -1, storageGB: 50, dailyEmails: -1, retentionDays: 365,
    teams: -1, teamMembers: -1, filters: -1, forwardingRules: -1, labels: -1,
    webhooks: -1, apiAccess: true, requestsPerMinute: -1, inboxesPerDay: -1,
    messagesPerInbox: -1, maxApiKeys: -1, maxAttachmentMB: 50, prioritySupport: true,
  },
};

export interface ResourceLimits {
  [key: string]: number | boolean;
}

interface ResourceLimitsSectionProps {
  limits: ResourceLimits;
  targetTier: string;
  onChange: (limits: ResourceLimits) => void;
}

export function ResourceLimitsSection({ limits, targetTier, onChange }: ResourceLimitsSectionProps) {
  // Get default limits for the selected tier
  const tierDefaults = DEFAULT_LIMITS[targetTier] || DEFAULT_LIMITS.FREE;

  // Merge current limits with tier defaults
  const effectiveLimits = { ...tierDefaults, ...limits };

  const handleChange = (key: string, value: number | boolean) => {
    onChange({ ...limits, [key]: value });
  };

  const handleResetToDefaults = () => {
    onChange(tierDefaults);
  };

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">tune</span>
          Giới hạn tài nguyên
        </h4>
        <button
          type="button"
          onClick={handleResetToDefaults}
          className="text-xs text-nebula-violet hover:underline"
        >
          Reset về mặc định ({targetTier})
        </button>
      </div>

      <p className="text-xs text-muted mb-4">
        Cấu hình giới hạn tài nguyên cho gói này. Giá trị -1 = không giới hạn.
      </p>

      {/* App Limits */}
      <LimitCategory
        title="Ứng dụng"
        icon="apps"
        fields={LIMIT_FIELDS.app}
        limits={effectiveLimits}
        onChange={handleChange}
      />

      {/* API/SDK Limits */}
      <LimitCategory
        title="API & SDK"
        icon="api"
        fields={LIMIT_FIELDS.api}
        limits={effectiveLimits}
        onChange={handleChange}
      />

      {/* Support */}
      <LimitCategory
        title="Hỗ trợ"
        icon="support_agent"
        fields={LIMIT_FIELDS.support}
        limits={effectiveLimits}
        onChange={handleChange}
      />
    </div>
  );
}

interface LimitCategoryProps {
  title: string;
  icon: string;
  fields: readonly { key: string; label: string; type: string; hint?: string; step?: string }[];
  limits: Record<string, number | boolean>;
  onChange: (key: string, value: number | boolean) => void;
}

function LimitCategory({ title, icon, fields, limits, onChange }: LimitCategoryProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted">
        <span className="material-symbols-outlined text-sm">{icon}</span>
        {title}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
        {fields.map(field => (
          <div key={field.key}>
            {field.type === "boolean" ? (
              <PremiumToggle
                label={field.label}
                checked={!!limits[field.key]}
                onChange={checked => onChange(field.key, checked)}
              />
            ) : (
              <>
                <label className="block text-[10px] font-medium text-muted mb-1">
                  {field.label}
                </label>
                <input
                  type="number"
                  step={field.step || "1"}
                  className="input-nebula w-full text-sm"
                  value={typeof limits[field.key] === "number" ? (limits[field.key] as number) : 0}
                  onChange={e => onChange(field.key, Number(e.target.value))}
                />
                {field.hint && (
                  <p className="text-[9px] text-muted mt-0.5">{field.hint}</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
