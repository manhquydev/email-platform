/**
 * AI Summary Card - Displays AI-generated email summary
 * Supports tier-gated access, credit-based generation, and caching
 */
import { useState, useCallback } from "react";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

interface AISummaryCardProps {
    messageId: string;
    /** Pre-loaded summary from message data */
    initialSummary?: string | null;
}

interface SummaryResponse {
    summary: string;
    cached: boolean;
    creditCost: number;
    remainingCredits: number;
}


type SummaryState = "idle" | "loading" | "success" | "error" | "upgrade";

/**
 * Check if user tier has AI access (STARTER+)
 */
function hasTierAccess(tier?: string): boolean {
    const paidTiers = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
    return paidTiers.includes(tier?.toUpperCase() || "");
}

export function AISummaryCard({ messageId, initialSummary }: AISummaryCardProps) {
    const { token, user } = useAuth();
    const [state, setState] = useState<SummaryState>(initialSummary ? "success" : "idle");
    const [summary, setSummary] = useState<string | null>(initialSummary || null);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);
    const [creditCost, setCreditCost] = useState<number>(0);

    const userTier = user?.tier || "FREE";
    const hasAccess = hasTierAccess(userTier);

    const generateSummary = useCallback(async (forceRegenerate = false) => {
        if (!token) return;

        setState("loading");
        setError(null);

        try {
            const response = await api<SummaryResponse>(`/messages/${messageId}/summarize`, {
                method: "POST",
                token,
                body: { forceRegenerate },
            });

            setSummary(response.summary);
            setCreditCost(response.creditCost);
            setState("success");
        } catch (err: unknown) {
            const apiError = err as { status?: number; message?: string };

            if (apiError.status === 403) {
                setState("upgrade");
                setError("Nâng cấp lên gói Starter để sử dụng tính năng AI");
            } else if (apiError.status === 402) {
                setState("error");
                setError("Tính năng không khả dụng. Vui lòng nâng cấp gói.");
            } else if (apiError.status === 503) {
                setState("error");
                setError("Tính năng AI chưa được kích hoạt trên server");
            } else {
                setState("error");
                setError(apiError.message || "Không thể tạo tóm tắt");
            }
        }
    }, [messageId, token]);

    // Show upgrade prompt for FREE tier
    if (!hasAccess && state !== "success") {
        return (
            <div className="glass-panel rounded-xl p-4 border border-nebula-border bg-gradient-to-r from-nebula-violet/5 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-nebula-violet/10">
                        <span className="material-symbols-outlined text-nebula-violet">auto_awesome</span>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-nebula-text">Tóm tắt AI</h4>
                        <p className="text-xs text-nebula-text-muted">
                            Nâng cấp lên gói Starter để sử dụng tính năng tóm tắt email bằng AI
                        </p>
                    </div>
                    <a
                        href="/settings?tab=billing"
                        className="px-3 py-1.5 text-xs font-medium bg-nebula-violet text-white rounded-lg hover:bg-nebula-violet/90 transition-colors"
                    >
                        Nâng cấp
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel rounded-xl border border-nebula-border overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-nebula-elevated/30 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-nebula-violet/10">
                        <span className="material-symbols-outlined text-nebula-violet text-xl">auto_awesome</span>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-nebula-text flex items-center gap-2">
                            Tóm tắt AI
                            {state === "success" && summary && (
                                <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded">
                                    {creditCost > 0 ? `−${creditCost} credit` : "Đã lưu"}
                                </span>
                            )}
                        </h4>
                        <p className="text-xs text-nebula-text-muted">
                            {state === "idle" && "Nhấn để tạo tóm tắt nội dung email"}
                            {state === "loading" && "Đang phân tích..."}
                            {state === "success" && "Tóm tắt bằng Gemini AI"}
                            {state === "error" && error}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {state === "success" && summary && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                generateSummary(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-nebula-elevated transition-colors text-nebula-text-muted hover:text-nebula-text"
                            title="Tạo lại tóm tắt"
                        >
                            <span className="material-symbols-outlined text-lg">refresh</span>
                        </button>
                    )}
                    <span className={`material-symbols-outlined text-nebula-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                        expand_more
                    </span>
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="px-4 pb-4">
                    {state === "idle" && (
                        <button
                            onClick={() => generateSummary(false)}
                            className="w-full py-3 rounded-lg border-2 border-dashed border-nebula-border hover:border-nebula-violet/50 hover:bg-nebula-violet/5 transition-all flex items-center justify-center gap-2 text-nebula-text-muted hover:text-nebula-violet"
                        >
                            <span className="material-symbols-outlined">magic_button</span>
                            <span className="text-sm font-medium">Tạo tóm tắt (1 credit)</span>
                        </button>
                    )}

                    {state === "loading" && (
                        <div className="py-6 flex flex-col items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full border-2 border-nebula-violet/30 border-t-nebula-violet animate-spin" />
                                <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-nebula-violet text-lg">
                                    auto_awesome
                                </span>
                            </div>
                            <p className="text-sm text-nebula-text-muted">Đang phân tích nội dung email...</p>
                        </div>
                    )}

                    {state === "success" && summary && (
                        <div className="space-y-3">
                            <div className="p-4 rounded-lg bg-nebula-elevated/50 border border-nebula-border/50">
                                <p className="text-sm text-nebula-text leading-relaxed whitespace-pre-wrap">
                                    {summary}
                                </p>
                            </div>
                            <p className="text-[10px] text-nebula-text-muted text-right">
                                Được tạo bởi Gemini AI • Có thể không chính xác 100%
                            </p>
                        </div>
                    )}

                    {state === "error" && (
                        <div className="py-4 flex flex-col items-center gap-3">
                            <div className="p-3 rounded-full bg-error/10">
                                <span className="material-symbols-outlined text-error">error</span>
                            </div>
                            <p className="text-sm text-error text-center">{error}</p>
                            <button
                                onClick={() => generateSummary(false)}
                                className="px-4 py-2 text-sm font-medium bg-nebula-elevated hover:bg-nebula-border rounded-lg transition-colors"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}

                    {state === "upgrade" && (
                        <div className="py-4 flex flex-col items-center gap-3">
                            <div className="p-3 rounded-full bg-nebula-violet/10">
                                <span className="material-symbols-outlined text-nebula-violet">workspace_premium</span>
                            </div>
                            <p className="text-sm text-nebula-text-muted text-center">
                                Tính năng AI yêu cầu gói Starter trở lên
                            </p>
                            <a
                                href="/settings?tab=billing"
                                className="px-4 py-2 text-sm font-medium bg-nebula-violet text-white rounded-lg hover:bg-nebula-violet/90 transition-colors"
                            >
                                Xem các gói dịch vụ
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
