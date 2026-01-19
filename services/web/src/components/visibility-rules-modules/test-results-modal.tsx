/**
 * Test Results Modal component
 * Displays visibility rules test results with summary
 */
import { GlassCard } from '../ui/GlassCard';
import { cn } from '../../utils/cn';
import type { VisibilityTestResult, VisibilityTestSummary } from '../../utils/visibility-rules-api';

interface TestResultsModalProps {
    results: { results: VisibilityTestResult[]; summary: VisibilityTestSummary };
    onClose: () => void;
}

const ACTION_ICONS: Record<string, string> = {
    SHOWN: '✅',
    HIDDEN: '🚫',
    WARNED: '⚠️',
    REDACTED: '🔒',
};

export function TestResultsModal({ results, onClose }: TestResultsModalProps) {
    const { summary, results: items } = results;

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
                            <span className="text-lg">{ACTION_ICONS[item.action]}</span>
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
