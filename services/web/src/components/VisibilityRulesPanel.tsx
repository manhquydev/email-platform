import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from './ui/GlassCard';
import { cn } from '../utils/cn';
import {
  getVisibilityRules,
  createVisibilityRule,
  updateVisibilityRule,
  deleteVisibilityRule,
  getVisibilityTemplates,
  applyVisibilityTemplate,
  testVisibilityRules,
  FIELD_LABELS,
  OPERATOR_LABELS,
  RULE_TYPE_INFO,
  getOperatorsForField,
  type VisibilityRule,
  type VisibilityRuleTemplate,
  type VisibilityCondition,
  type VisibilityRuleType,
  type VisibilityMatchType,
  type VisibilityTestResult,
  type VisibilityTestSummary,
} from '../utils/visibility-rules-api';

interface VisibilityRulesPanelProps {
  inboxId: string;
  inboxEmail: string;
  onClose: () => void;
}

export function VisibilityRulesPanel({ inboxId, inboxEmail, onClose }: VisibilityRulesPanelProps) {
  const { token } = useAuth();
  const [rules, setRules] = useState<VisibilityRule[]>([]);
  const [templates, setTemplates] = useState<VisibilityRuleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<VisibilityRule | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResults, setTestResults] = useState<{ results: VisibilityTestResult[]; summary: VisibilityTestSummary } | null>(null);
  const [testing, setTesting] = useState(false);

  const loadRules = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [rulesData, templatesData] = await Promise.all([
        getVisibilityRules(inboxId, token),
        getVisibilityTemplates(token),
      ]);
      setRules(rulesData);
      setTemplates(templatesData);
    } catch {
      toast.error('Không thể tải quy tắc hiển thị');
    } finally {
      setLoading(false);
    }
  }, [inboxId, token]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleToggleEnabled = async (rule: VisibilityRule) => {
    if (!token) return;
    try {
      await updateVisibilityRule(rule.id, { isEnabled: !rule.isEnabled }, token);
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isEnabled: !r.isEnabled } : r));
      toast.success(rule.isEnabled ? 'Đã tắt quy tắc' : 'Đã bật quy tắc');
    } catch {
      toast.error('Không thể cập nhật quy tắc');
    }
  };

  const handleDelete = async (rule: VisibilityRule) => {
    if (!token) return;
    if (!confirm(`Xóa quy tắc "${rule.name}"?`)) return;
    try {
      await deleteVisibilityRule(rule.id, token);
      setRules(prev => prev.filter(r => r.id !== rule.id));
      toast.success('Đã xóa quy tắc');
    } catch {
      toast.error('Không thể xóa quy tắc');
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!token) return;
    try {
      const newRule = await applyVisibilityTemplate(inboxId, templateId, undefined, token);
      setRules(prev => [...prev, newRule]);
      toast.success('Đã áp dụng mẫu');
    } catch {
      toast.error('Không thể áp dụng mẫu');
    }
  };

  const handleTest = async () => {
    if (!token) return;
    setTesting(true);
    try {
      const results = await testVisibilityRules(inboxId, { limit: 20 }, token);
      setTestResults(results);
      setShowTestModal(true);
    } catch {
      toast.error('Không thể kiểm tra quy tắc');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveRule = async (data: {
    name: string;
    description?: string;
    ruleType: VisibilityRuleType;
    matchType: VisibilityMatchType;
    conditions: VisibilityCondition[];
    priority: number;
    isEnabled: boolean;
  }) => {
    if (!token) return;
    try {
      if (editingRule) {
        const updated = await updateVisibilityRule(editingRule.id, data, token);
        setRules(prev => prev.map(r => r.id === editingRule.id ? updated : r));
        toast.success('Đã cập nhật quy tắc');
      } else {
        const created = await createVisibilityRule(inboxId, data, token);
        setRules(prev => [...prev, created]);
        toast.success('Đã tạo quy tắc');
      }
      setShowEditor(false);
      setEditingRule(null);
    } catch {
      toast.error('Không thể lưu quy tắc');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <GlassCard className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-text-main">Quy tắc hiển thị</h2>
            <p className="text-xs text-text-secondary">{inboxEmail}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTest}
              disabled={testing || rules.length === 0}
              className="px-3 py-1.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
            >
              {testing ? 'Đang kiểm tra...' : 'Kiểm tra quy tắc'}
            </button>
            <button
              onClick={() => { setEditingRule(null); setShowEditor(true); }}
              className="px-3 py-1.5 text-xs font-medium bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
            >
              + Thêm quy tắc
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg text-text-secondary"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Templates Quick Apply */}
        {templates.length > 0 && (
          <div className="p-4 border-b border-white/5 bg-surface/30">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-secondary">Mẫu nhanh:</span>
              {templates.slice(0, 5).map(t => (
                <button
                  key={t.id}
                  onClick={() => handleApplyTemplate(t.id)}
                  className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded border border-white/10 text-text-main transition-colors"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rules List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <p className="mb-4">Chưa có quy tắc hiển thị nào</p>
              <p className="text-xs">Thêm quy tắc để kiểm soát email nào được hiển thị công khai</p>
            </div>
          ) : (
            rules.map(rule => (
              <div
                key={rule.id}
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  rule.isEnabled
                    ? "bg-surface/50 border-white/10"
                    : "bg-surface/20 border-white/5 opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{RULE_TYPE_INFO[rule.ruleType].icon}</span>
                      <h3 className="font-semibold text-text-main truncate">{rule.name}</h3>
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] rounded-full font-medium",
                        rule.ruleType === 'HIDE' && "bg-red-500/20 text-red-400",
                        rule.ruleType === 'SHOW_ONLY' && "bg-green-500/20 text-green-400",
                        rule.ruleType === 'WARN' && "bg-yellow-500/20 text-yellow-400",
                        rule.ruleType === 'REDACT' && "bg-purple-500/20 text-purple-400",
                      )}>
                        {RULE_TYPE_INFO[rule.ruleType].label}
                      </span>
                    </div>
                    {rule.description && (
                      <p className="text-xs text-text-secondary mb-2">{rule.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {rule.conditions.slice(0, 3).map((c, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] bg-white/5 rounded text-text-secondary">
                          {FIELD_LABELS[c.field]} {OPERATOR_LABELS[c.operator].toLowerCase()} "{c.value.slice(0, 20)}"
                        </span>
                      ))}
                      {rule.conditions.length > 3 && (
                        <span className="px-2 py-0.5 text-[10px] bg-white/5 rounded text-text-secondary">
                          +{rule.conditions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleEnabled(rule)}
                      className={cn(
                        "w-10 h-5 rounded-full transition-colors relative",
                        rule.isEnabled ? "bg-green-500" : "bg-gray-600"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
                        rule.isEnabled ? "left-5" : "left-0.5"
                      )} />
                    </button>
                    <button
                      onClick={() => { setEditingRule(rule); setShowEditor(true); }}
                      className="p-1.5 hover:bg-white/10 rounded text-text-secondary"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(rule)}
                      className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rule Editor Modal */}
        {showEditor && (
          <RuleEditorModal
            rule={editingRule}
            onSave={handleSaveRule}
            onClose={() => { setShowEditor(false); setEditingRule(null); }}
          />
        )}

        {/* Test Results Modal */}
        {showTestModal && testResults && (
          <TestResultsModal
            results={testResults}
            onClose={() => setShowTestModal(false)}
          />
        )}
      </GlassCard>
    </div>
  );
}

// Rule Editor Modal Component
function RuleEditorModal({
  rule,
  onSave,
  onClose,
}: {
  rule: VisibilityRule | null;
  onSave: (data: {
    name: string;
    description?: string;
    ruleType: VisibilityRuleType;
    matchType: VisibilityMatchType;
    conditions: VisibilityCondition[];
    priority: number;
    isEnabled: boolean;
  }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [ruleType, setRuleType] = useState<VisibilityRuleType>(rule?.ruleType || 'HIDE');
  const [matchType, setMatchType] = useState<VisibilityMatchType>(rule?.matchType || 'ALL');
  const [conditions, setConditions] = useState<VisibilityCondition[]>(
    rule?.conditions || [{ field: 'FROM', operator: 'CONTAINS', value: '' }]
  );
  const [priority, setPriority] = useState(rule?.priority ?? 50);
  const [isEnabled, setIsEnabled] = useState(rule?.isEnabled ?? true);
  const [saving, setSaving] = useState(false);

  const addCondition = () => {
    setConditions([...conditions, { field: 'FROM', operator: 'CONTAINS', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<VisibilityCondition>) => {
    setConditions(conditions.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || conditions.length === 0) {
      toast.error('Cần có tên và ít nhất một điều kiện');
      return;
    }
    if (conditions.some(c => !c.value.trim())) {
      toast.error('Tất cả điều kiện phải có giá trị');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name, description, ruleType, matchType, conditions, priority, isEnabled });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
      <GlassCard className="w-full max-w-2xl my-4 flex flex-col rounded-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          <div className="p-4 border-b border-white/10 shrink-0">
            <h3 className="font-bold text-text-main">{rule ? 'Sửa quy tắc' : 'Quy tắc mới'}</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Tên quy tắc</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-text-main placeholder-text-secondary focus:outline-none focus:border-primary"
                placeholder="VD: Ẩn email xác minh"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Mô tả (tùy chọn)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-text-main placeholder-text-secondary focus:outline-none focus:border-primary"
                placeholder="Quy tắc này dùng để làm gì?"
              />
            </div>

            {/* Rule Type & Match Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Hành động</label>
                <select
                  value={ruleType}
                  onChange={e => setRuleType(e.target.value as VisibilityRuleType)}
                  className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary"
                >
                  <option value="HIDE">🚫 Ẩn - Không hiển thị email khớp</option>
                  <option value="SHOW_ONLY">✅ Chỉ hiển thị - Chỉ hiển thị email khớp</option>
                  <option value="WARN">⚠️ Cảnh báo - Hiển thị kèm cảnh báo</option>
                  <option value="REDACT">🔒 Che giấu - Ẩn nội dung</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Điều kiện</label>
                <select
                  value={matchType}
                  onChange={e => setMatchType(e.target.value as VisibilityMatchType)}
                  className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary"
                >
                  <option value="ALL">TẤT CẢ điều kiện phải khớp</option>
                  <option value="ANY">BẤT KỲ điều kiện nào khớp</option>
                </select>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Điều kiện</label>
              <div className="space-y-3">
                {conditions.map((condition, index) => (
                  <div key={index} className="p-3 bg-surface/30 rounded-lg space-y-2">
                    {/* Row 1: Field & Operator selects */}
                    <div className="flex items-center gap-2">
                      <select
                        value={condition.field}
                        onChange={e => {
                          const newField = e.target.value as VisibilityCondition['field'];
                          const validOps = getOperatorsForField(newField);
                          updateCondition(index, {
                            field: newField,
                            operator: validOps.includes(condition.operator) ? condition.operator : validOps[0] as VisibilityCondition['operator'],
                          });
                        }}
                        className="flex-1 px-2 py-1.5 bg-surface/50 border border-white/10 rounded text-sm text-text-main"
                      >
                        {Object.entries(FIELD_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      <select
                        value={condition.operator}
                        onChange={e => updateCondition(index, { operator: e.target.value as VisibilityCondition['operator'] })}
                        className="flex-1 px-2 py-1.5 bg-surface/50 border border-white/10 rounded text-sm text-text-main"
                      >
                        {getOperatorsForField(condition.field).map(op => (
                          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                        ))}
                      </select>
                    </div>
                    {/* Row 2: Value input & controls */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={condition.value}
                        onChange={e => updateCondition(index, { value: e.target.value })}
                        placeholder={condition.field === 'HAS_ATTACHMENT' ? 'true hoặc false' : 'Nhập giá trị để so khớp...'}
                        className="flex-1 px-3 py-2 bg-surface/50 border border-white/10 rounded text-sm text-text-main min-w-0"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-text-secondary whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={condition.negate || false}
                          onChange={e => updateCondition(index, { negate: e.target.checked })}
                          className="w-4 h-4"
                        />
                        Phủ định
                      </label>
                      {conditions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCondition(index)}
                          className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
                          title="Xóa điều kiện"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addCondition}
                className="mt-2 text-xs text-primary hover:underline"
              >
                + Thêm điều kiện
              </button>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Độ ưu tiên: {priority} (cao hơn = chạy trước)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Enabled */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={e => setIsEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-text-main">Bật quy tắc này</span>
            </label>
          </div>

          <div className="p-4 border-t border-white/10 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-main"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu quy tắc'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

// Test Results Modal Component
function TestResultsModal({
  results,
  onClose,
}: {
  results: { results: VisibilityTestResult[]; summary: VisibilityTestSummary };
  onClose: () => void;
}) {
  const { summary, results: items } = results;

  const actionIcons: Record<string, string> = {
    SHOWN: '✅',
    HIDDEN: '🚫',
    WARNED: '⚠️',
    REDACTED: '🔒',
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
      <GlassCard className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-text-main">Kết quả kiểm tra</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-text-secondary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary */}
        <div className="p-4 border-b border-white/5 bg-surface/30 grid grid-cols-5 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-text-main">{summary.total}</div>
            <div className="text-[10px] text-text-secondary">Tổng</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-400">{summary.shown}</div>
            <div className="text-[10px] text-text-secondary">Hiển thị</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-400">{summary.hidden}</div>
            <div className="text-[10px] text-text-secondary">Đã ẩn</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-400">{summary.warned}</div>
            <div className="text-[10px] text-text-secondary">Cảnh báo</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-400">{summary.redacted}</div>
            <div className="text-[10px] text-text-secondary">Che giấu</div>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.map(item => (
            <div key={item.messageId} className="flex items-center gap-3 p-2 bg-surface/30 rounded-lg">
              <span className="text-lg">{actionIcons[item.action]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-main truncate">{item.subject || '(Không có tiêu đề)'}</div>
                <div className="text-[10px] text-text-secondary">
                  Từ: {item.fromAddress || 'Không rõ'}
                  {item.matchedRule && ` • Khớp: ${item.matchedRule.name}`}
                </div>
              </div>
              <span className={cn(
                "px-2 py-0.5 text-[10px] rounded font-medium",
                item.action === 'SHOWN' && "bg-green-500/20 text-green-400",
                item.action === 'HIDDEN' && "bg-red-500/20 text-red-400",
                item.action === 'WARNED' && "bg-yellow-500/20 text-yellow-400",
                item.action === 'REDACTED' && "bg-purple-500/20 text-purple-400",
              )}>
                {item.action}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
