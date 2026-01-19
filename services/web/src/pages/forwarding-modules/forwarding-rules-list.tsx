/**
 * Forwarding Rules List component
 * Displays list of forwarding rules with actions
 */
import type { ForwardingRule } from '../../types';

interface ForwardingRulesListProps {
    rules: ForwardingRule[];
    verifiedEmails: string[];
    onCreateRule: () => void;
    onEditRule: (rule: ForwardingRule) => void;
    onToggleRule: (rule: ForwardingRule) => void;
    onDeleteRule: (rule: ForwardingRule) => void;
}

export function ForwardingRulesList({
    rules,
    verifiedEmails,
    onCreateRule,
    onEditRule,
    onToggleRule,
    onDeleteRule
}: ForwardingRulesListProps) {
    return (
        <div className="glass-card">
            <div className="glass-card-header">
                <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nebula-text)' }}>
                    <svg className="w-5 h-5" style={{ color: 'var(--nebula-violet)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                    </svg>
                    Quy tắc chuyển tiếp
                </h2>
                <span className="text-sm" style={{ color: 'var(--nebula-text-muted)' }}>{rules.length} quy tắc</span>
            </div>
            <div className="glass-card-body">
                {/* No verified emails state */}
                {verifiedEmails.length === 0 && (
                    <EmptyState
                        icon={<EmailIcon />}
                        description="Vui lòng thêm và xác minh ít nhất một email đích trước khi tạo quy tắc."
                    />
                )}

                {/* No rules state */}
                {rules.length === 0 && verifiedEmails.length > 0 && (
                    <EmptyState
                        icon={<ForwardIcon />}
                        title="Chưa có quy tắc nào"
                        description="Tạo quy tắc để tự động chuyển tiếp email đến địa chỉ của bạn."
                        action={<button onClick={onCreateRule} className="btn-nebula btn-nebula-primary">Thêm quy tắc đầu tiên</button>}
                    />
                )}

                {/* Rules list */}
                {rules.length > 0 && (
                    <div className="space-y-3">
                        {rules.map((rule) => (
                            <RuleCard
                                key={rule.id}
                                rule={rule}
                                onEdit={() => onEditRule(rule)}
                                onToggle={() => onToggleRule(rule)}
                                onDelete={() => onDeleteRule(rule)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Rule Card component
function RuleCard({ rule, onEdit, onToggle, onDelete }: {
    rule: ForwardingRule;
    onEdit: () => void;
    onToggle: () => void;
    onDelete: () => void;
}) {
    return (
        <div
            className="p-4 rounded-xl transition-all animate-nebula-fade-in"
            style={{
                background: rule.isActive ? 'rgba(16, 185, 129, 0.05)' : 'var(--nebula-elevated)',
                border: `1px solid ${rule.isActive ? 'rgba(16, 185, 129, 0.2)' : 'var(--nebula-border)'}`,
                opacity: rule.isActive ? 1 : 0.7
            }}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                    {/* Visual Flow Indicator */}
                    <FlowIndicator isActive={rule.isActive} />

                    {/* Rule Details */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold" style={{ color: 'var(--nebula-text)' }}>{rule.name}</span>
                            {rule.isActive && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--nebula-success)' }}>
                                    ● Hoạt động
                                </span>
                            )}
                        </div>
                        <p className="text-sm mb-2" style={{ color: 'var(--nebula-text-muted)' }}>
                            {rule.destinationType === 'EMAIL' && `📧 → ${rule.forwardTo}`}
                            {rule.destinationType === 'TELEGRAM' && '✈️ → Telegram'}
                            {rule.destinationType === 'DISCORD' && '💬 → Discord'}
                            {rule.destinationType === 'WEBHOOK' && `🔗 → ${rule.webhookUrl?.substring(0, 30)}...`}
                        </p>

                        {/* Conditions */}
                        <ConditionBadges conditions={rule.conditions} matchType={rule.matchType} />

                        {/* Stats */}
                        <RuleStats forwardCount={rule.forwardCount} lastForwardAt={rule.lastForwardAt} />
                    </div>
                </div>

                {/* Actions */}
                <RuleActions
                    isActive={rule.isActive}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            </div>
        </div>
    );
}

// Sub-components
function FlowIndicator({ isActive }: { isActive: boolean }) {
    return (
        <div className="flex flex-col items-center gap-1 pt-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isActive ? 'rgba(139, 92, 246, 0.1)' : 'var(--nebula-border)' }}>
                <svg className="w-4 h-4" style={{ color: isActive ? 'var(--nebula-violet)' : 'var(--nebula-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
            </div>
            <div className="w-px h-4" style={{ background: 'var(--nebula-border)' }}></div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isActive ? 'var(--nebula-glow-cyan)' : 'var(--nebula-border)' }}>
                <svg className="w-4 h-4" style={{ color: isActive ? 'var(--nebula-cyan)' : 'var(--nebula-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
            </div>
        </div>
    );
}

function ConditionBadges({ conditions, matchType }: { conditions?: unknown[]; matchType?: string }) {
    const conditionsArray = Array.isArray(conditions) ? conditions : [];
    return (
        <div className="flex flex-wrap gap-1.5 mb-2">
            {conditionsArray.length > 0 ? (
                <>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--nebula-glow-cyan)', color: 'var(--nebula-cyan)' }}>
                        {conditionsArray.length} điều kiện ({matchType === 'ALL' ? 'AND' : 'OR'})
                    </span>
                    {conditionsArray.some((c) => (c as { operator?: string }).operator === 'CONTAINS_OTP') && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--nebula-glow-violet)', color: 'var(--nebula-violet)' }}>
                            🔢 OTP
                        </span>
                    )}
                </>
            ) : (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--nebula-elevated)', color: 'var(--nebula-text-muted)' }}>
                    Tất cả email
                </span>
            )}
        </div>
    );
}

function RuleStats({ forwardCount, lastForwardAt }: { forwardCount?: number; lastForwardAt?: string | null }) {
    return (
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--nebula-text-muted)' }}>
            <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {forwardCount || 0} lần chuyển tiếp
            </span>
            {lastForwardAt && (
                <span>• Lần cuối: {new Date(lastForwardAt).toLocaleDateString("vi-VN")}</span>
            )}
        </div>
    );
}

function RuleActions({ isActive, onToggle, onEdit, onDelete }: {
    isActive: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={onToggle}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: isActive ? 'var(--nebula-success)' : 'var(--nebula-border)' }}
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : ''}`} />
            </button>
            <button onClick={onEdit} className="btn-nebula btn-nebula-ghost btn-nebula-icon">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
            </button>
            <button onClick={onDelete} className="btn-nebula btn-nebula-ghost btn-nebula-icon" style={{ color: 'var(--nebula-error)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
            </button>
        </div>
    );
}

function EmptyState({ icon, title, description, action }: {
    icon: React.ReactNode;
    title?: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="empty-state-nebula py-8">
            <div className="empty-state-nebula-icon">{icon}</div>
            {title && <h3 className="empty-state-nebula-title">{title}</h3>}
            <p className="empty-state-nebula-description">{description}</p>
            {action}
        </div>
    );
}

function EmailIcon() {
    return (
        <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
    );
}

function ForwardIcon() {
    return (
        <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
    );
}
