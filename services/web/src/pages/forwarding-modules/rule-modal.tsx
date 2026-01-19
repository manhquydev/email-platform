/**
 * Rule Modal component for creating/editing forwarding rules
 */
import { DestinationSelector } from '../../components/forwarding/DestinationSelector';
import { ForwardingConditionBuilder } from '../../components/forwarding/ForwardingConditionBuilder';
import type { RuleFormState } from './hooks';
import type { ForwardingRule } from '../../types';

interface RuleModalProps {
    isOpen: boolean;
    editingRule: ForwardingRule | null;
    ruleForm: RuleFormState;
    ruleBusy: boolean;
    verifiedEmails: string[];
    telegramLinked: boolean;
    onFormChange: (form: RuleFormState) => void;
    onSave: () => void;
    onClose: () => void;
}

export function RuleModal({
    isOpen,
    editingRule,
    ruleForm,
    ruleBusy,
    verifiedEmails,
    telegramLinked,
    onFormChange,
    onSave,
    onClose
}: RuleModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-nebula-fade-in overflow-y-auto">
            <div className="glass-card-elevated w-full max-w-2xl animate-nebula-scale-in my-4">
                <div className="glass-card-header">
                    <h3 className="font-semibold" style={{ color: 'var(--nebula-text)' }}>
                        {editingRule ? "Sửa quy tắc" : "Tạo quy tắc mới"}
                    </h3>
                    <button onClick={onClose} className="btn-nebula btn-nebula-ghost btn-nebula-icon">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="glass-card-body space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Rule Name */}
                    <div>
                        <label className="label-nebula">Tên quy tắc *</label>
                        <input
                            type="text"
                            value={ruleForm.name}
                            onChange={(e) => onFormChange({ ...ruleForm, name: e.target.value })}
                            placeholder="VD: Chuyển tiếp OTP từ Google"
                            className="input-nebula"
                        />
                    </div>

                    {/* Destination Selector */}
                    <div className="pt-4" style={{ borderTop: '1px solid var(--nebula-border)' }}>
                        <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--nebula-text)' }}>
                            Đích chuyển tiếp
                        </h4>
                        <DestinationSelector
                            value={{
                                type: ruleForm.destinationType,
                                forwardTo: ruleForm.forwardTo,
                                telegramChatId: ruleForm.telegramChatId,
                                discordWebhookUrl: ruleForm.discordWebhookUrl,
                                webhookUrl: ruleForm.webhookUrl,
                                webhookSecret: ruleForm.webhookSecret,
                            }}
                            onChange={(config) => onFormChange({
                                ...ruleForm,
                                destinationType: config.type,
                                forwardTo: config.forwardTo || "",
                                telegramChatId: config.telegramChatId || "",
                                discordWebhookUrl: config.discordWebhookUrl || "",
                                webhookUrl: config.webhookUrl || "",
                                webhookSecret: config.webhookSecret || "",
                            })}
                            verifiedEmails={verifiedEmails}
                            telegramLinked={telegramLinked}
                        />
                    </div>

                    {/* Conditions Builder */}
                    <div className="pt-4" style={{ borderTop: '1px solid var(--nebula-border)' }}>
                        <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--nebula-text)' }}>
                            Điều kiện lọc (tùy chọn)
                        </h4>
                        <ForwardingConditionBuilder
                            conditions={ruleForm.conditions}
                            matchType={ruleForm.matchType}
                            onChange={(conditions) => onFormChange({ ...ruleForm, conditions })}
                            onMatchTypeChange={(matchType) => onFormChange({ ...ruleForm, matchType })}
                        />
                    </div>

                    {/* Priority */}
                    <div className="pt-4" style={{ borderTop: '1px solid var(--nebula-border)' }}>
                        <div className="flex items-center justify-between">
                            <label className="label-nebula">Độ ưu tiên</label>
                            <span className="text-sm font-mono" style={{ color: 'var(--nebula-violet)' }}>{ruleForm.priority}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={ruleForm.priority}
                            onChange={(e) => onFormChange({ ...ruleForm, priority: parseInt(e.target.value) })}
                            className="w-full"
                            style={{ accentColor: 'var(--nebula-violet)' }}
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--nebula-text-muted)' }}>
                            Quy tắc có độ ưu tiên cao sẽ được kiểm tra trước
                        </p>
                    </div>
                </div>

                <div className="glass-card-footer flex justify-end gap-2">
                    <button onClick={onClose} className="btn-nebula btn-nebula-secondary">
                        Hủy
                    </button>
                    <button onClick={onSave} disabled={ruleBusy} className="btn-nebula btn-nebula-primary">
                        {ruleBusy ? "Đang lưu..." : (editingRule ? "Cập nhật" : "Tạo quy tắc")}
                    </button>
                </div>
            </div>
        </div>
    );
}
