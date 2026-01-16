/**
 * DestinationSelector - Multi-destination type selector for forwarding rules
 * Supports: Email, Telegram, Discord, Webhook destinations
 */

import { useState } from "react";
import type { ForwardDestinationType } from "../../types";

interface DestinationConfig {
    type: ForwardDestinationType;
    forwardTo?: string;
    telegramChatId?: string;
    discordWebhookUrl?: string;
    webhookUrl?: string;
    webhookSecret?: string;
}

interface DestinationSelectorProps {
    value: DestinationConfig;
    onChange: (config: DestinationConfig) => void;
    verifiedEmails: string[];
    telegramLinked?: boolean;
}

const DESTINATION_TYPES: { type: ForwardDestinationType; label: string; icon: string; description: string }[] = [
    { type: 'EMAIL', label: 'Email', icon: '📧', description: 'Chuyển tiếp đến email đã xác minh' },
    { type: 'TELEGRAM', label: 'Telegram', icon: '✈️', description: 'Gửi thông báo qua Telegram Bot' },
    { type: 'DISCORD', label: 'Discord', icon: '💬', description: 'Gửi đến Discord Webhook' },
    { type: 'WEBHOOK', label: 'Webhook', icon: '🔗', description: 'Gửi HTTP POST đến URL tùy chỉnh' },
];

export function DestinationSelector({ value, onChange, verifiedEmails, telegramLinked }: DestinationSelectorProps) {
    const [showSecretInput, setShowSecretInput] = useState(false);

    const updateField = (field: keyof DestinationConfig, fieldValue: string) => {
        onChange({ ...value, [field]: fieldValue });
    };

    const selectType = (type: ForwardDestinationType) => {
        const newConfig: DestinationConfig = { type };
        // Set default values based on type
        if (type === 'EMAIL' && verifiedEmails.length > 0) {
            newConfig.forwardTo = verifiedEmails[0];
        }
        onChange(newConfig);
    };

    return (
        <div className="space-y-4">
            {/* Destination Type Selector */}
            <div>
                <label className="label-nebula mb-2 block">Loại đích chuyển tiếp</label>
                <div className="grid grid-cols-2 gap-2">
                    {DESTINATION_TYPES.map((dest) => {
                        const isDisabled = dest.type === 'TELEGRAM' && !telegramLinked;
                        const isSelected = value.type === dest.type;

                        return (
                            <button
                                key={dest.type}
                                type="button"
                                onClick={() => !isDisabled && selectType(dest.type)}
                                disabled={isDisabled}
                                className={`p-3 rounded-xl text-left transition-all ${
                                    isSelected
                                        ? 'ring-2 ring-[var(--nebula-violet)]'
                                        : 'hover:bg-[var(--nebula-elevated)]'
                                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                style={{
                                    background: isSelected ? 'var(--nebula-glow-violet)' : 'var(--nebula-surface)',
                                    border: `1px solid ${isSelected ? 'var(--nebula-violet)' : 'var(--nebula-border)'}`,
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{dest.icon}</span>
                                    <span className="font-medium" style={{ color: 'var(--nebula-text)' }}>
                                        {dest.label}
                                    </span>
                                </div>
                                <p className="text-xs mt-1" style={{ color: 'var(--nebula-text-muted)' }}>
                                    {dest.description}
                                </p>
                                {isDisabled && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--nebula-warning)' }}>
                                        Chưa liên kết Telegram
                                    </p>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Email Configuration */}
            {value.type === 'EMAIL' && (
                <div>
                    <label className="label-nebula">Email đích *</label>
                    {verifiedEmails.length > 0 ? (
                        <select
                            value={value.forwardTo || ''}
                            onChange={(e) => updateField('forwardTo', e.target.value)}
                            className="input-nebula"
                        >
                            <option value="">-- Chọn email --</option>
                            {verifiedEmails.map((email) => (
                                <option key={email} value={email}>{email}</option>
                            ))}
                        </select>
                    ) : (
                        <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--nebula-glow-pink)', color: 'var(--nebula-pink)' }}>
                            Chưa có email đích được xác minh. Vui lòng thêm email ở phần trên.
                        </div>
                    )}
                </div>
            )}

            {/* Telegram Configuration */}
            {value.type === 'TELEGRAM' && (
                <div>
                    <label className="label-nebula">Chat ID (tự động)</label>
                    <input
                        type="text"
                        value={value.telegramChatId || 'Sử dụng chat đã liên kết'}
                        disabled
                        className="input-nebula opacity-70"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--nebula-text-muted)' }}>
                        Tin nhắn sẽ được gửi đến Telegram đã liên kết với tài khoản
                    </p>
                </div>
            )}

            {/* Discord Configuration */}
            {value.type === 'DISCORD' && (
                <div>
                    <label className="label-nebula">Discord Webhook URL *</label>
                    <input
                        type="url"
                        value={value.discordWebhookUrl || ''}
                        onChange={(e) => updateField('discordWebhookUrl', e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="input-nebula"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--nebula-text-muted)' }}>
                        Tạo webhook trong Discord Server Settings → Integrations → Webhooks
                    </p>
                </div>
            )}

            {/* Webhook Configuration */}
            {value.type === 'WEBHOOK' && (
                <div className="space-y-3">
                    <div>
                        <label className="label-nebula">Webhook URL *</label>
                        <input
                            type="url"
                            value={value.webhookUrl || ''}
                            onChange={(e) => updateField('webhookUrl', e.target.value)}
                            placeholder="https://api.yoursite.com/webhooks/email"
                            className="input-nebula"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="label-nebula">Secret Key (tùy chọn)</label>
                            <button
                                type="button"
                                onClick={() => setShowSecretInput(!showSecretInput)}
                                className="text-xs"
                                style={{ color: 'var(--nebula-violet)' }}
                            >
                                {showSecretInput ? 'Ẩn' : 'Thêm secret'}
                            </button>
                        </div>
                        {showSecretInput && (
                            <input
                                type="password"
                                value={value.webhookSecret || ''}
                                onChange={(e) => updateField('webhookSecret', e.target.value)}
                                placeholder="Để xác thực webhook signature"
                                className="input-nebula"
                            />
                        )}
                        <p className="text-xs mt-1" style={{ color: 'var(--nebula-text-muted)' }}>
                            Payload sẽ được gửi với header X-Signature để xác thực
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
