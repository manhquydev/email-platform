import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import {
    GlassCard, SectionHeader, PremiumButton, PremiumInput,
    LoadingSpinner
} from "./AdminUIComponents";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface SystemStats {
    userCount: number;
    domainCount: number;
    messageCount: number;
    recentLogins24h: number;
    serverTime: string;
    resources?: {
        cpuLoad: number;
        memUsed: number;
        memTotal: number;
        diskUsed: number;
        diskAvailable: number;
    };
}

interface Setting {
    key: string;
    value: string;
}

export function AdminSystem({ token }: { token: string }) {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [settings, setSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [history, setHistory] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    // Local state for limit mode to allow UI toggling before save
    const [localLimitMode, setLocalLimitMode] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [statsRes, settingsRes] = await Promise.all([
                api<{ system: SystemStats }>("/admin/system-info", { token }),
                api<{ settings: Setting[] }>("/admin/system/settings", { token })
            ]);
            setStats(statsRes.system);
            setSettings(settingsRes.settings);

            // Add to history for charts
            if (statsRes.system.resources) {
                setHistory(prev => {
                    const newHistory = [...prev, {
                        time: new Date().toLocaleTimeString(),
                        cpu: statsRes.system.resources?.cpuLoad,
                        mem: Math.round((statsRes.system.resources?.memUsed || 0) / (statsRes.system.resources?.memTotal || 1) * 100)
                    }];
                    return newHistory.slice(-20); // Keep last 20 points
                });
            }
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [loadData]);

    const handleUpdateSetting = async (key: string, value: string) => {
        setSaving(true);
        try {
            await api("/admin/system/settings", {
                method: "POST",
                token,
                body: { key, value }
            });
            toast.success("Đã cập nhật cài đặt");
            await loadData();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setSaving(false);
        }
    };

    if (loading && !stats) return <LoadingSpinner />;

    const retentionDays = settings.find(s => s.key === "RETENTION_DAYS")?.value || "30";

    // New variables
    const inboxLimitModeSetting = settings.find(s => s.key === "PUBLIC_INBOX_LIMIT_MODE")?.value || "none";
    const inboxLimitMode = localLimitMode !== null ? localLimitMode : inboxLimitModeSetting;
    const inboxMaxEmails = settings.find(s => s.key === "PUBLIC_INBOX_MAX_EMAILS")?.value || "100";
    const inboxMaxDays = settings.find(s => s.key === "PUBLIC_INBOX_MAX_DAYS")?.value || "7";

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <SectionHeader
                title="Hệ thống"
                subtitle="Theo dõi tài nguyên và cấu hình chính sách"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resource Monitoring Charts */}
                <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-nebula-text">Tải CPU (%)</h3>
                    </div>
                    <div className="h-64 mt-4" style={{ minHeight: '256px', minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="cpu" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCpu)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-nebula-text">Sử dụng Memory (%)</h3>
                    </div>
                    <div className="h-64 mt-4" style={{ minHeight: '256px', minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="mem" stroke="#ec4899" fillOpacity={1} fill="url(#colorMem)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Server Status */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-nebula-text">Thông tin máy chủ</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <div className="text-xs text-nebula-text-muted mb-1">Thời gian server</div>
                                <div className="text-sm font-medium">{new Date(stats?.serverTime || "").toLocaleTimeString()}</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <div className="text-xs text-nebula-text-muted mb-1">Bộ nhớ</div>
                                <div className="text-sm font-medium">{stats?.resources?.memUsed}MB / {stats?.resources?.memTotal}MB</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <div className="text-xs text-nebula-text-muted mb-1">Disk Used</div>
                                <div className="text-sm font-medium">{stats?.resources?.diskUsed}%</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <div className="text-xs text-nebula-text-muted mb-1">Disk Trống</div>
                                <div className="text-sm font-medium text-success">{stats?.resources?.diskAvailable}GB</div>
                            </div>
                        </div>
                    </GlassCard>

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
                                        onChange={() => { }} // Controlled manually via button
                                        placeholder="30"
                                        id="retention-input"
                                    />
                                </div>
                                <PremiumButton
                                    onClick={() => {
                                        const input = document.getElementById('retention-input') as HTMLInputElement;
                                        handleUpdateSetting("RETENTION_DAYS", input.value);
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

                    {/* Public Inbox Limits */}
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
                                    onChange={(e) => setLocalLimitMode(e.target.value)}
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
                                <PremiumButton
                                    onClick={async () => {
                                        setSaving(true);
                                        try {
                                            const limitMode = (document.getElementById('limit-mode-select') as HTMLSelectElement).value;
                                            const maxEmails = (document.getElementById('max-emails-input') as HTMLInputElement)?.value || "100";
                                            const maxDays = (document.getElementById('max-days-input') as HTMLInputElement)?.value || "7";

                                            await Promise.all([
                                                api("/admin/system/settings", { method: "POST", token, body: { key: "PUBLIC_INBOX_LIMIT_MODE", value: limitMode } }),
                                                api("/admin/system/settings", { method: "POST", token, body: { key: "PUBLIC_INBOX_MAX_EMAILS", value: maxEmails } }),
                                                api("/admin/system/settings", { method: "POST", token, body: { key: "PUBLIC_INBOX_MAX_DAYS", value: maxDays } })
                                            ]);

                                            toast.success("Đã cập nhật giới hạn inbox");
                                            setLocalLimitMode(null); // Reset local state to fallback to API
                                            await loadData();
                                        } catch (e) {
                                            toast.error("Lỗi: " + (e as Error).message);
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                    disabled={saving || inboxLimitMode === 'none'}
                                >
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
                </div>

                {/* Quick Actions */}
                <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-nebula-text">Hành động nhanh</h3>
                    </div>
                    <div className="space-y-3 mt-4">
                        <PremiumButton
                            variant="secondary"
                            className="w-full justify-start"
                            size="sm"
                            disabled={saving}
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    await api("/admin/system/cleanup", { method: "POST", token });
                                    toast.success("Đã kích hoạt dọn dẹp hệ thống");
                                } catch (e) {
                                    toast.error("Lỗi: " + (e as Error).message);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Chạy dọn dẹp ngay bây giờ
                        </PremiumButton>
                        <PremiumButton
                            variant="secondary"
                            className="w-full justify-start"
                            size="sm"
                            disabled={saving}
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    await api("/admin/system/check-db", { method: "POST", token });
                                    toast.success("Kết nối Database: Ổn định");
                                } catch (e) {
                                    toast.error("Lỗi kết nối DB: " + (e as Error).message);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Kiểm tra kết nối DB
                        </PremiumButton>
                        <PremiumButton variant="secondary" className="w-full justify-start" size="sm" onClick={() => loadData()}>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Tải lại thông số
                        </PremiumButton>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
