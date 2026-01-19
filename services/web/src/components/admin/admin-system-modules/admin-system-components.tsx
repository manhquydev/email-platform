/**
 * UI components for AdminSystem
 */
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { GlassCard, PremiumButton, PremiumInput } from "../AdminUIComponents";
import type { SystemStats, HistoryPoint } from "./types";

// --- Resource Charts ---
interface ResourceChartProps {
    title: string;
    data: HistoryPoint[];
    dataKey: "cpu" | "mem";
    color: string;
    gradientId: string;
}

export function ResourceChart({ title, data, dataKey, color, gradientId }: ResourceChartProps) {
    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-nebula-text">{title}</h3>
            </div>
            <div className="h-64 mt-4" style={{ minHeight: '256px', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                        <XAxis dataKey="time" hide />
                        <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
                        <Area type="monotone" dataKey={dataKey} stroke={color} fillOpacity={1} fill={`url(#${gradientId})`} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </GlassCard>
    );
}

// --- Server Info Card ---
interface ServerInfoCardProps {
    stats: SystemStats | null;
}

export function ServerInfoCard({ stats }: ServerInfoCardProps) {
    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-nebula-text">Thông tin máy chủ</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <StatBox label="Thời gian server" value={new Date(stats?.serverTime || "").toLocaleTimeString()} />
                <StatBox label="Bộ nhớ" value={`${stats?.resources?.memUsed}MB / ${stats?.resources?.memTotal}MB`} />
                <StatBox label="Disk Used" value={`${stats?.resources?.diskUsed}%`} />
                <StatBox label="Disk Trống" value={`${stats?.resources?.diskAvailable}GB`} valueClass="text-success" />
            </div>
        </GlassCard>
    );
}

function StatBox({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
    return (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-xs text-nebula-text-muted mb-1">{label}</div>
            <div className={`text-sm font-medium ${valueClass}`}>{value}</div>
        </div>
    );
}

// --- Retention Policy Card ---
interface RetentionPolicyCardProps {
    retentionDays: string;
    saving: boolean;
    onSave: (key: string, value: string) => void;
}

export function RetentionPolicyCard({ retentionDays, saving, onSave }: RetentionPolicyCardProps) {
    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-nebula-text">Chính sách lưu trữ (Retention Policy)</h3>
            </div>
            <div className="space-y-4 mt-4">
                <div className="flex items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-xs text-nebula-text-muted mb-1.5">Số ngày giữ email (0 là vĩnh viễn)</label>
                        <PremiumInput
                            type="number"
                            value={retentionDays}
                            onChange={() => {}}
                            placeholder="30"
                            id="retention-input"
                        />
                    </div>
                    <PremiumButton
                        onClick={() => {
                            const input = document.getElementById('retention-input') as HTMLInputElement;
                            onSave("RETENTION_DAYS", input.value);
                        }}
                        disabled={saving}
                    >
                        Lưu cấu hình
                    </PremiumButton>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                    <strong>Lưu ý:</strong> Hệ thống sẽ tự động xóa tất cả email (trừ email được ghim) đã nhận quá thời gian trên vào lúc 3:00 AM hàng ngày.
                </div>
            </div>
        </GlassCard>
    );
}

// --- Inbox Limits Card ---
interface InboxLimitsCardProps {
    inboxLimitMode: string;
    inboxMaxEmails: string;
    inboxMaxDays: string;
    saving: boolean;
    onModeChange: (mode: string) => void;
    onSave: () => void;
}

export function InboxLimitsCard({ inboxLimitMode, inboxMaxEmails, inboxMaxDays, saving, onModeChange, onSave }: InboxLimitsCardProps) {
    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-nebula-text">Giới hạn Inbox Công khai</h3>
            </div>
            <div className="space-y-4 mt-4">
                <div>
                    <label className="block text-xs text-nebula-text-muted mb-1.5">Chế độ giới hạn</label>
                    <select
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-nebula-text focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                        value={inboxLimitMode}
                        onChange={(e) => onModeChange(e.target.value)}
                        disabled={saving}
                        id="limit-mode-select"
                    >
                        <option value="none">Không giới hạn</option>
                        <option value="count">Theo số lượng email</option>
                        <option value="days">Theo thời gian (ngày)</option>
                        <option value="both">Cả hai (cái nào đến trước)</option>
                    </select>
                </div>

                {inboxLimitMode !== 'none' && (
                    <div className="grid grid-cols-2 gap-4">
                        {(inboxLimitMode === 'count' || inboxLimitMode === 'both') && (
                            <div>
                                <label className="block text-xs text-nebula-text-muted mb-1.5">Số email tối đa</label>
                                <input
                                    type="number"
                                    defaultValue={inboxMaxEmails}
                                    placeholder="100"
                                    id="max-emails-input"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-nebula-text focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                />
                            </div>
                        )}
                        {(inboxLimitMode === 'days' || inboxLimitMode === 'both') && (
                            <div>
                                <label className="block text-xs text-nebula-text-muted mb-1.5">Số ngày tối đa</label>
                                <input
                                    type="number"
                                    defaultValue={inboxMaxDays}
                                    placeholder="7"
                                    id="max-days-input"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-nebula-text focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                />
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end">
                    <PremiumButton onClick={onSave} disabled={saving || inboxLimitMode === 'none'}>
                        Lưu giới hạn
                    </PremiumButton>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
                    <strong>Thông tin:</strong> Giới hạn này áp dụng cho người xem inbox công khai (không đăng nhập).
                    <ul className="list-disc ml-4 mt-1 space-y-1 text-blue-200/80">
                        <li><strong>Theo số lượng:</strong> Chỉ hiển thị N email mới nhất.</li>
                        <li><strong>Theo thời gian:</strong> Chỉ hiển thị email trong N ngày gần đây.</li>
                    </ul>
                </div>
            </div>
        </GlassCard>
    );
}

// --- Quick Actions Card ---
interface QuickActionsCardProps {
    saving: boolean;
    onCleanup: () => void;
    onCheckDb: () => void;
    onRefresh: () => void;
}

export function QuickActionsCard({ saving, onCleanup, onCheckDb, onRefresh }: QuickActionsCardProps) {
    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-nebula-text">Hành động nhanh</h3>
            </div>
            <div className="space-y-3 mt-4">
                <PremiumButton variant="secondary" className="w-full justify-start" size="sm" disabled={saving} onClick={onCleanup}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Chạy dọn dẹp ngay bây giờ
                </PremiumButton>
                <PremiumButton variant="secondary" className="w-full justify-start" size="sm" disabled={saving} onClick={onCheckDb}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Kiểm tra kết nối DB
                </PremiumButton>
                <PremiumButton variant="secondary" className="w-full justify-start" size="sm" onClick={onRefresh}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tải lại thông số
                </PremiumButton>
            </div>
        </GlassCard>
    );
}
