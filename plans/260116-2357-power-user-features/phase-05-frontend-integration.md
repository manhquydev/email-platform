# Phase 05: Frontend Integration

**Duration:** Week 5-6
**Priority:** High
**Dependencies:** Phase 01-04

## 1. Objective

Tích hợp tất cả Power User Features vào frontend:
- Visual Rule Builder cho forwarding rules
- Enhanced Forwarding page với logs
- OTP prominent display
- Webhook management UI
- DKIM setup wizard
- Reply functionality

## 2. Tasks Overview

| Component | Priority | Complexity |
|-----------|----------|------------|
| RuleBuilder | High | High |
| ForwardingPage update | High | Medium |
| OtpBadge integration | High | Low |
| WebhookManager | Medium | Medium |
| DkimSetup integration | Medium | Low |
| ReplyModal | Medium | Medium |
| ForwardingLogs viewer | Low | Low |

## 3. Implementation

### 3.1 Visual Rule Builder

**File:** `services/web/src/components/forwarding/RuleBuilder.tsx`

```tsx
import { useState } from 'react';
import { Plus, Trash2, Save, X, Mail, MessageSquare, Webhook, Send } from 'lucide-react';

// Types
interface Condition {
  id: string;
  field: 'FROM' | 'TO' | 'SUBJECT' | 'BODY' | 'HAS_ATTACHMENT';
  operator: 'CONTAINS' | 'NOT_CONTAINS' | 'EQUALS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX' | 'CONTAINS_OTP' | 'EXISTS';
  value: string;
}

interface RuleFormData {
  name: string;
  inboxId: string | null;
  destinationType: 'EMAIL' | 'TELEGRAM' | 'DISCORD' | 'WEBHOOK';
  forwardTo: string;
  telegramChatId: string;
  discordWebhookUrl: string;
  webhookUrl: string;
  matchType: 'ALL' | 'ANY';
  conditions: Condition[];
  priority: number;
  isActive: boolean;
}

interface RuleBuilderProps {
  initialData?: Partial<RuleFormData>;
  inboxes: Array<{ id: string; email: string }>;
  verifiedEmails: string[];
  onSave: (data: RuleFormData) => Promise<void>;
  onCancel: () => void;
}

const FIELD_OPTIONS = [
  { value: 'FROM', label: 'From (Sender)' },
  { value: 'TO', label: 'To (Recipient)' },
  { value: 'SUBJECT', label: 'Subject' },
  { value: 'BODY', label: 'Body Content' },
  { value: 'HAS_ATTACHMENT', label: 'Has Attachment' },
];

const OPERATOR_OPTIONS = [
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'NOT_CONTAINS', label: 'Does not contain' },
  { value: 'EQUALS', label: 'Equals' },
  { value: 'STARTS_WITH', label: 'Starts with' },
  { value: 'ENDS_WITH', label: 'Ends with' },
  { value: 'REGEX', label: 'Matches regex' },
  { value: 'CONTAINS_OTP', label: 'Contains OTP code' },
  { value: 'EXISTS', label: 'Exists' },
];

const DESTINATION_TYPES = [
  { value: 'EMAIL', label: 'Email', icon: Mail, color: 'text-blue-400' },
  { value: 'TELEGRAM', label: 'Telegram', icon: Send, color: 'text-sky-400' },
  { value: 'DISCORD', label: 'Discord', icon: MessageSquare, color: 'text-indigo-400' },
  { value: 'WEBHOOK', label: 'Webhook', icon: Webhook, color: 'text-purple-400' },
];

export function RuleBuilder({ initialData, inboxes, verifiedEmails, onSave, onCancel }: RuleBuilderProps) {
  const [formData, setFormData] = useState<RuleFormData>({
    name: initialData?.name || '',
    inboxId: initialData?.inboxId || null,
    destinationType: initialData?.destinationType || 'EMAIL',
    forwardTo: initialData?.forwardTo || '',
    telegramChatId: initialData?.telegramChatId || '',
    discordWebhookUrl: initialData?.discordWebhookUrl || '',
    webhookUrl: initialData?.webhookUrl || '',
    matchType: initialData?.matchType || 'ALL',
    conditions: initialData?.conditions || [],
    priority: initialData?.priority || 50,
    isActive: initialData?.isActive ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { id: crypto.randomUUID(), field: 'FROM', operator: 'CONTAINS', value: '' },
      ],
    }));
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  };

  const removeCondition = (id: string) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== id),
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      setError('Rule name is required');
      return;
    }

    if (formData.destinationType === 'EMAIL' && !formData.forwardTo) {
      setError('Forward email is required');
      return;
    }

    if (formData.destinationType === 'TELEGRAM' && !formData.telegramChatId) {
      setError('Telegram Chat ID is required');
      return;
    }

    if (formData.destinationType === 'DISCORD' && !formData.discordWebhookUrl) {
      setError('Discord Webhook URL is required');
      return;
    }

    if (formData.destinationType === 'WEBHOOK' && !formData.webhookUrl) {
      setError('Webhook URL is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save rule');
    }

    setSaving(false);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h3 className="text-lg font-medium text-white">
          {initialData ? 'Edit Rule' : 'Create Forwarding Rule'}
        </h3>
        <button onClick={onCancel} className="p-1 hover:bg-slate-700 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Rule Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Forward OTPs to Telegram"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Apply to Inbox</label>
            <select
              value={formData.inboxId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, inboxId: e.target.value || null }))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Inboxes</option>
              {inboxes.map(inbox => (
                <option key={inbox.id} value={inbox.id}>{inbox.email}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Destination Type */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Forward To</label>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {DESTINATION_TYPES.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => setFormData(prev => ({ ...prev, destinationType: value as any }))}
                className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-2 ${
                  formData.destinationType === value
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-sm text-white">{label}</span>
              </button>
            ))}
          </div>

          {/* Destination Input */}
          {formData.destinationType === 'EMAIL' && (
            <select
              value={formData.forwardTo}
              onChange={(e) => setFormData(prev => ({ ...prev, forwardTo: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="">Select verified email...</option>
              {verifiedEmails.map(email => (
                <option key={email} value={email}>{email}</option>
              ))}
            </select>
          )}

          {formData.destinationType === 'TELEGRAM' && (
            <input
              type="text"
              value={formData.telegramChatId}
              onChange={(e) => setFormData(prev => ({ ...prev, telegramChatId: e.target.value }))}
              placeholder="Telegram Chat ID (e.g., 123456789)"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          )}

          {formData.destinationType === 'DISCORD' && (
            <input
              type="url"
              value={formData.discordWebhookUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, discordWebhookUrl: e.target.value }))}
              placeholder="Discord Webhook URL"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          )}

          {formData.destinationType === 'WEBHOOK' && (
            <input
              type="url"
              value={formData.webhookUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
              placeholder="Webhook URL (https://...)"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          )}
        </div>

        {/* Conditions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-400">Conditions</label>
            <div className="flex items-center gap-4">
              <select
                value={formData.matchType}
                onChange={(e) => setFormData(prev => ({ ...prev, matchType: e.target.value as any }))}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
              >
                <option value="ALL">Match ALL conditions</option>
                <option value="ANY">Match ANY condition</option>
              </select>
              <button
                onClick={addCondition}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Condition
              </button>
            </div>
          </div>

          {formData.conditions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-lg">
              No conditions - rule will match all emails
            </div>
          ) : (
            <div className="space-y-2">
              {formData.conditions.map((condition, index) => (
                <div key={condition.id} className="flex items-center gap-2 bg-slate-900 rounded-lg p-2">
                  {index > 0 && (
                    <span className="text-xs text-slate-500 w-10">
                      {formData.matchType === 'ALL' ? 'AND' : 'OR'}
                    </span>
                  )}
                  {index === 0 && <span className="w-10" />}

                  <select
                    value={condition.field}
                    onChange={(e) => updateCondition(condition.id, { field: e.target.value as any })}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                  >
                    {FIELD_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(condition.id, { operator: e.target.value as any })}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                  >
                    {OPERATOR_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  {!['CONTAINS_OTP', 'EXISTS'].includes(condition.operator) && (
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                      placeholder="Value..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                    />
                  )}

                  <button
                    onClick={() => removeCondition(condition.id)}
                    className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Priority & Active */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Priority:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 50 }))}
              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-center"
            />
            <span className="text-xs text-slate-500">(higher = runs first)</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600"
            />
            <span className="text-sm text-slate-300">Active</span>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 p-4 border-t border-slate-700">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Rule'}
        </button>
      </div>
    </div>
  );
}
```

### 3.2 Forwarding Logs Viewer

**File:** `services/web/src/components/forwarding/ForwardingLogs.tsx`

```tsx
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';

interface Log {
  id: string;
  status: 'SUCCESS' | 'FAILED';
  destination: string;
  destinationType: string;
  duration: number;
  error: string | null;
  createdAt: string;
}

interface ForwardingLogsProps {
  ruleId: string;
}

export function ForwardingLogs({ ruleId }: ForwardingLogsProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [ruleId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/forwarding/rules/${ruleId}/logs`);
      setLogs(data.logs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="animate-pulse bg-slate-800 h-32 rounded-lg" />;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No forwarding logs yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end mb-2">
        <button
          onClick={loadLogs}
          className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {logs.map(log => (
        <div
          key={log.id}
          className="flex items-center gap-3 bg-slate-900 rounded-lg p-3"
        >
          {log.status === 'SUCCESS' ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400" />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{log.destination}</p>
            <p className="text-xs text-slate-500">
              {log.destinationType} • {new Date(log.createdAt).toLocaleString()}
            </p>
            {log.error && (
              <p className="text-xs text-red-400 mt-1">{log.error}</p>
            )}
          </div>

          <div className="flex items-center gap-1 text-slate-500">
            <Clock className="w-4 h-4" />
            <span className="text-xs">{log.duration}ms</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 3.3 Enhanced Forwarding Page

**File:** `services/web/src/pages/Forwarding.tsx` (update key sections)

```tsx
import { useState, useEffect } from 'react';
import { Plus, Settings, Trash2, Play, Pause, ChevronDown, ChevronUp } from 'lucide-react';
import { RuleBuilder } from '../components/forwarding/RuleBuilder';
import { ForwardingLogs } from '../components/forwarding/ForwardingLogs';
import { api } from '../utils/api';

export function ForwardingPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [verifiedEmails, setVerifiedEmails] = useState<string[]>([]);
  const [inboxes, setInboxes] = useState<any[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesData, emailsData, inboxesData] = await Promise.all([
        api.get('/forwarding/rules'),
        api.get('/forwarding/emails'),
        api.get('/inboxes'),
      ]);
      setRules(rulesData.rules);
      setVerifiedEmails(emailsData.emails);
      setInboxes(inboxesData.data?.map((i: any) => ({
        id: i.id,
        email: `${i.localPart}@${i.domain.name}`,
      })) || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const handleSaveRule = async (data: any) => {
    if (editingRule) {
      await api.patch(`/forwarding/rules/${editingRule.id}`, data);
    } else {
      await api.post('/forwarding/rules', data);
    }
    setShowBuilder(false);
    setEditingRule(null);
    loadData();
  };

  const toggleRuleActive = async (ruleId: string, isActive: boolean) => {
    await api.patch(`/forwarding/rules/${ruleId}`, { isActive: !isActive });
    loadData();
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Delete this rule?')) return;
    await api.delete(`/forwarding/rules/${ruleId}`);
    loadData();
  };

  const getDestinationIcon = (type: string) => {
    const icons: Record<string, string> = {
      EMAIL: '📧',
      TELEGRAM: '📱',
      DISCORD: '💬',
      WEBHOOK: '🔗',
    };
    return icons[type] || '📨';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Forwarding Rules</h1>
          <p className="text-slate-400">Automatically forward emails to other destinations</p>
        </div>
        <button
          onClick={() => { setShowBuilder(true); setEditingRule(null); }}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {/* Rule Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8">
            <RuleBuilder
              initialData={editingRule}
              inboxes={inboxes}
              verifiedEmails={verifiedEmails}
              onSave={handleSaveRule}
              onCancel={() => { setShowBuilder(false); setEditingRule(null); }}
            />
          </div>
        </div>
      )}

      {/* Rules List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-slate-800 h-24 rounded-xl" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg mb-2">No forwarding rules yet</p>
          <p className="text-sm">Create a rule to automatically forward emails</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map(rule => (
            <div
              key={rule.id}
              className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
            >
              {/* Rule Header */}
              <div className="p-4 flex items-center gap-4">
                <span className="text-2xl">{getDestinationIcon(rule.destinationType)}</span>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white">{rule.name}</h3>
                  <p className="text-sm text-slate-400 truncate">
                    {rule.forwardTo || rule.telegramChatId || rule.discordWebhookUrl || rule.webhookUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>{rule.forwardCount} forwards</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleRuleActive(rule.id, rule.isActive)}
                    className={`p-2 rounded-lg ${rule.isActive ? 'text-green-400 hover:bg-green-400/10' : 'text-slate-500 hover:bg-slate-700'}`}
                    title={rule.isActive ? 'Pause rule' : 'Activate rule'}
                  >
                    {rule.isActive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { setEditingRule(rule); setShowBuilder(true); }}
                    className="p-2 hover:bg-slate-700 rounded-lg"
                    title="Edit rule"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg"
                    title="Delete rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                    className="p-2 hover:bg-slate-700 rounded-lg"
                  >
                    {expandedRule === rule.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Logs */}
              {expandedRule === rule.id && (
                <div className="border-t border-slate-700 p-4 bg-slate-900/50">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Recent Activity</h4>
                  <ForwardingLogs ruleId={rule.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3.4 Message List with OTP Badge

**File:** `services/web/src/components/message/MessageListItem.tsx` (update)

```tsx
import { OtpBadge } from './OtpBadge';

// In the component, add OTP badge next to subject:
<div className="flex items-center gap-2">
  <span className="font-medium text-white truncate">{message.subject || '(no subject)'}</span>
  {message.extractedOtp && (
    <OtpBadge
      code={message.extractedOtp}
      confidence={message.otpConfidence || 'medium'}
      size="sm"
      showCopyButton={false}
    />
  )}
</div>
```

### 3.5 Message Detail with OTP + Reply

**File:** `services/web/src/pages/InboxViewer.tsx` (update message detail section)

```tsx
import { OtpBadge } from '../components/message/OtpBadge';
import { ReplyButton } from '../components/message/ReplyButton';

// In message detail view:
{selectedMessage && (
  <div className="flex-1 overflow-y-auto">
    {/* OTP Banner */}
    {selectedMessage.extractedOtp && (
      <div className="m-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Key className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-green-300/70">Verification Code Detected</p>
              <p className="text-2xl font-mono font-bold text-green-400 tracking-widest">
                {selectedMessage.extractedOtp}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(selectedMessage.extractedOtp);
              toast.success('OTP copied!');
            }}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
        </div>
      </div>
    )}

    {/* Message Header with Reply Button */}
    <div className="p-4 border-b border-slate-700">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-white">{selectedMessage.subject}</h2>
        <div className="flex items-center gap-2">
          <ReplyButton
            messageId={selectedMessage.id}
            originalFrom={selectedMessage.fromAddress}
            originalSubject={selectedMessage.subject}
            onSuccess={() => toast.success('Reply sent!')}
          />
          {/* Other action buttons */}
        </div>
      </div>
      {/* Rest of header */}
    </div>

    {/* Message body */}
  </div>
)}
```

### 3.6 Settings Page - DKIM Section

**File:** `services/web/src/pages/MyDomains.tsx` (add DKIM section)

```tsx
import { DkimSetup } from '../components/domain/DkimSetup';

// In domain detail/settings section:
{selectedDomain && (
  <div className="space-y-6">
    {/* Existing domain info */}

    {/* DKIM Setup */}
    <DkimSetup
      domainId={selectedDomain.id}
      domainName={selectedDomain.name}
    />
  </div>
)}
```

## 4. Navigation Updates

Add new routes/links:

```tsx
// In navigation/sidebar
<NavLink to="/forwarding" icon={Forward} label="Forwarding Rules" />
<NavLink to="/webhooks" icon={Webhook} label="Webhooks" />
```

## 5. Testing Checklist

### UI Tests
- [ ] RuleBuilder renders correctly
- [ ] Condition add/remove works
- [ ] Destination type switching works
- [ ] Form validation works
- [ ] Save rule creates/updates correctly

### Integration Tests
- [ ] OTP badge displays in message list
- [ ] OTP copy works
- [ ] Reply modal opens and closes
- [ ] Reply sends successfully
- [ ] Forwarding logs load
- [ ] DKIM setup displays DNS record

## 6. Acceptance Criteria

- [ ] Visual Rule Builder works end-to-end
- [ ] All destination types configurable
- [ ] Conditions can be added/removed
- [ ] Match type (ALL/ANY) works
- [ ] Rules list shows with status
- [ ] Rules can be activated/deactivated
- [ ] Forwarding logs viewable
- [ ] OTP badge prominent in message list
- [ ] OTP copy-to-clipboard works
- [ ] Reply button opens modal
- [ ] Reply sends successfully
- [ ] DKIM setup wizard works
- [ ] DNS record copyable
- [ ] Webhook management accessible
