/**
 * AliasCustomizer - Collapsible panel for custom alias & domain selection
 * Used in hero-inbox-widget for ephemeral inbox customization
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ephemeralService, type EphemeralDomain } from '../../services/ephemeralService';

// Alias validation regex (matches backend)
const ALIAS_REGEX = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;

interface AliasCustomizerProps {
    onAliasChange: (localPart: string | null, domainId: string | null) => void;
    disabled?: boolean;
}

type ValidationStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function AliasCustomizer({ onAliasChange, disabled = false }: AliasCustomizerProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [alias, setAlias] = useState('');
    const [domains, setDomains] = useState<EphemeralDomain[]>([]);
    const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
    const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isLoadingDomains, setIsLoadingDomains] = useState(false);
    const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch domains on mount
    useEffect(() => {
        const fetchDomains = async () => {
            setIsLoadingDomains(true);
            try {
                const domainList = await ephemeralService.getDomains();
                setDomains(domainList);
                if (domainList.length > 0) {
                    setSelectedDomainId(domainList[0].id);
                }
            } catch {
                // Silent fail - will use default domain
            } finally {
                setIsLoadingDomains(false);
            }
        };
        fetchDomains();
    }, []);

    // Client-side alias validation
    const validateAliasFormat = useCallback((value: string): { valid: boolean; error?: string } => {
        if (!value) return { valid: true }; // Empty is valid (will use random)

        const sanitized = value.toLowerCase().trim();
        if (sanitized.length < 3) {
            return { valid: false, error: 'Tối thiểu 3 ký tự' };
        }
        if (sanitized.length > 30) {
            return { valid: false, error: 'Tối đa 30 ký tự' };
        }
        if (!ALIAS_REGEX.test(sanitized)) {
            return { valid: false, error: 'Chỉ dùng chữ, số, dấu chấm, gạch ngang' };
        }
        return { valid: true };
    }, []);

    // Debounced server-side availability check
    const checkAvailability = useCallback(async (localPart: string, domainId: string) => {
        if (!localPart || !domainId) return;

        setValidationStatus('checking');
        try {
            const result = await ephemeralService.checkAliasAvailability(localPart, domainId);
            if (result.available) {
                setValidationStatus('available');
                setValidationError(null);
            } else {
                setValidationStatus('taken');
                setValidationError(result.error || 'Alias đã được sử dụng');
            }
        } catch {
            setValidationStatus('invalid');
            setValidationError('Không thể kiểm tra');
        }
    }, []);

    // Handle alias input change with debounced validation
    const handleAliasChange = useCallback((value: string) => {
        const sanitized = value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
        setAlias(sanitized);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Client-side validation first
        const clientValidation = validateAliasFormat(sanitized);
        if (!clientValidation.valid) {
            setValidationStatus('invalid');
            setValidationError(clientValidation.error || null);
            onAliasChange(null, selectedDomainId);
            return;
        }

        if (!sanitized) {
            setValidationStatus('idle');
            setValidationError(null);
            onAliasChange(null, selectedDomainId);
            return;
        }

        // Debounced server check (300ms)
        debounceRef.current = setTimeout(() => {
            if (selectedDomainId) {
                checkAvailability(sanitized, selectedDomainId);
            }
        }, 300);

        // Optimistically pass the alias
        onAliasChange(sanitized, selectedDomainId);
    }, [validateAliasFormat, checkAvailability, selectedDomainId, onAliasChange]);

    // Handle domain change with premium check
    const handleDomainChange = useCallback((domainId: string) => {
        const domain = domains.find(d => d.id === domainId);

        // Show premium prompt if selecting premium domain
        if (domain?.isPremium) {
            setShowPremiumPrompt(true);
            return; // Don't actually select it
        }

        setSelectedDomainId(domainId);
        onAliasChange(alias || null, domainId);

        // Re-check availability for new domain
        if (alias && domainId) {
            checkAvailability(alias, domainId);
        }
    }, [alias, domains, checkAvailability, onAliasChange]);

    // Get selected domain name
    const selectedDomain = domains.find(d => d.id === selectedDomainId);

    // Validation status icon
    const getStatusIcon = () => {
        switch (validationStatus) {
            case 'checking':
                return <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>;
            case 'available':
                return <span className="material-symbols-outlined text-green-400 text-base">check_circle</span>;
            case 'taken':
            case 'invalid':
                return <span className="material-symbols-outlined text-red-400 text-base">cancel</span>;
            default:
                return null;
        }
    };

    return (
        <div className="w-full">
            {/* Toggle button */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                disabled={disabled}
                className="flex items-center gap-1 text-xs text-white/60 hover:text-white/80 transition-colors disabled:opacity-50"
            >
                <span className="material-symbols-outlined text-sm">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                </span>
                <span>Tùy chỉnh địa chỉ</span>
            </button>

            {/* Expandable panel */}
            {isExpanded && (
                <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    {/* Alias input + Domain selector */}
                    <div className="flex gap-2 items-center">
                        {/* Alias input */}
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={alias}
                                onChange={(e) => handleAliasChange(e.target.value)}
                                placeholder="my-alias"
                                disabled={disabled}
                                className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg
                                         text-white placeholder-white/40 focus:outline-none focus:border-primary-400
                                         disabled:opacity-50"
                                maxLength={30}
                            />
                            {/* Status icon */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                {getStatusIcon()}
                            </div>
                        </div>

                        <span className="text-white/50">@</span>

                        {/* Domain selector */}
                        <select
                            value={selectedDomainId || ''}
                            onChange={(e) => handleDomainChange(e.target.value)}
                            disabled={disabled || isLoadingDomains}
                            className="px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg
                                     text-white focus:outline-none focus:border-primary-400
                                     disabled:opacity-50 min-w-[140px]"
                        >
                            {isLoadingDomains ? (
                                <option>Loading...</option>
                            ) : (
                                domains.map(d => (
                                    <option key={d.id} value={d.id} disabled={d.isPremium}>
                                        {d.name} {d.isPremium ? '🔒' : ''}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Validation feedback */}
                    {validationError && (
                        <p className="text-xs text-red-400">{validationError}</p>
                    )}
                    {validationStatus === 'available' && (
                        <p className="text-xs text-green-400">✓ Alias có sẵn</p>
                    )}

                    {/* Preview */}
                    {alias && selectedDomain && validationStatus === 'available' && (
                        <p className="text-xs text-white/60">
                            Email: <span className="text-white">{alias}@{selectedDomain.name}</span>
                        </p>
                    )}

                    {/* Premium domains info */}
                    {domains.some(d => d.isPremium) && (
                        <p className="text-xs text-white/40 flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[14px]">lock</span>
                            Domain có 🔒 cần tài khoản Premium
                        </p>
                    )}
                </div>
            )}

            {/* Premium Upgrade Prompt Modal */}
            {showPremiumPrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="neo-glass rounded-2xl p-6 max-w-sm mx-4 border border-white/20 shadow-2xl">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-amber-400 !text-[48px] mb-3">
                                workspace_premium
                            </span>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Domain Premium
                            </h3>
                            <p className="text-sm text-white/70 mb-4">
                                Domain này chỉ dành cho tài khoản Premium. Nâng cấp để sử dụng domain riêng biệt và nhiều tính năng khác.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowPremiumPrompt(false)}
                                    className="flex-1 px-4 py-2 text-sm bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-all"
                                >
                                    Để sau
                                </button>
                                <Link
                                    to="/register"
                                    className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-medium transition-all text-center"
                                >
                                    Nâng cấp
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AliasCustomizer;
