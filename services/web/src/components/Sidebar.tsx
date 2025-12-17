import { useState } from "react";
import toast from "react-hot-toast";
import type { Domain, Inbox } from "../types";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

// Professional SVG Icons
const icons = {
    copy: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    ),
    warning: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    check: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    ),
    spinner: (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
    ),
    random: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l3 3M19.5 12h-15m0 0l3 3m-3-3l3-3" />
        </svg>
    ),
};

// Generate random string for email
const generateRandomName = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};


interface SidebarProps {
    domains: Domain[];
    inboxes: Inbox[];
    selectedDomainId: string;
    selectedInboxId: string;
    currentUserId?: string;
    onSelectDomain: (id: string) => void;
    onSelectInbox: (id: string) => void;
    onCreateDomain: (name: string) => Promise<void>;
    onCreateInbox: (domainId: string, localPart: string, expiresAt?: number) => Promise<void>;
    onVerifyDomain: (domainId: string, token: string) => Promise<void>;
    onDeleteDomain: (domainId: string) => Promise<void>;
    onLogout: () => void;
    isAdmin: boolean;
    busy: boolean;
}

export function Sidebar({
    domains,
    inboxes,
    selectedDomainId,
    selectedInboxId,
    currentUserId,
    onSelectDomain,
    onSelectInbox,
    onCreateDomain,
    onCreateInbox,
    onVerifyDomain,
    onDeleteDomain,
    onLogout,
    isAdmin,
    busy
}: SidebarProps) {
    const navigate = useNavigate();
    const [isCreatingDomain, setIsCreatingDomain] = useState(false);
    const [newDomainName, setNewDomainName] = useState("");

    const [isCreatingInbox, setIsCreatingInbox] = useState(false);
    const [newInboxName, setNewInboxName] = useState("");
    const [newInboxTTL, setNewInboxTTL] = useState<string>("");

    const activeDomain = domains.find(d => d.id === selectedDomainId);
    const isOwnerOrAdmin = activeDomain && (isAdmin || activeDomain.ownerId === currentUserId);

    const handleCreateDomain = async () => {
        if (!newDomainName.trim()) return;
        await onCreateDomain(newDomainName);
        setNewDomainName("");
        setIsCreatingDomain(false);
    };

    const handleCreateInbox = async () => {
        if (!newInboxName.trim() || !activeDomain) return;
        const ttl = newInboxTTL ? parseInt(newInboxTTL) : undefined;
        await onCreateInbox(activeDomain.id, newInboxName, ttl);
        setNewInboxName("");
        setIsCreatingInbox(false);
    };

    const myDomains = currentUserId ? domains.filter(d => d.ownerId === currentUserId) : [];
    const sharedDomains = currentUserId ? domains.filter(d => d.ownerId !== currentUserId) : domains;

    return (
        <div className="flex flex-col h-full border-r border-border bg-surface">
            {/* 1. Domain Switcher Header */}
            <div className="p-3 border-b border-border">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 block">
                    Tên Miền (Domains)
                </label>
                <select
                    className="w-full text-sm font-medium"
                    value={selectedDomainId}
                    onChange={(e) => onSelectDomain(e.target.value)}
                >
                    <option value="">-- Chọn tên miền --</option>
                    {myDomains.length > 0 && (
                        <optgroup label="Của tôi">
                            {myDomains.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </optgroup>
                    )}
                    {sharedDomains.length > 0 && (
                        <optgroup label="Được chia sẻ / Công khai">
                            {sharedDomains.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </optgroup>
                    )}
                </select>

                {/* Domain Actions/Details */}
                {activeDomain && (
                    <div className="mt-3 p-2 bg-bg rounded border border-border">
                        <div className="flex justify-between items-center mb-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeDomain.status === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {activeDomain.status === 'VERIFIED' ? 'Đã xác thực' : 'Chờ xác thực'}
                            </span>
                            {isOwnerOrAdmin && (
                                <button
                                    onClick={() => onDeleteDomain(activeDomain.id)}
                                    className="text-[10px] text-red-500 hover:underline disabled:opacity-50"
                                    disabled={busy}
                                    title="Xóa domain"
                                >
                                    Xóa
                                </button>
                            )}
                        </div>

                        {activeDomain.status === 'PENDING' && isOwnerOrAdmin && (
                            <div className="mt-2 text-xs space-y-2">
                                {/* Hướng dẫn DNS chi tiết */}
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                    <p className="font-semibold text-yellow-800 mb-1 flex items-center gap-1">{icons.warning} Cấu hình DNS</p>
                                    <p className="text-yellow-700 text-[10px] mb-2">Thêm các bản ghi DNS sau:</p>

                                    {/* Bảng DNS Records */}
                                    <div className="bg-white rounded border border-yellow-300 overflow-hidden mb-2">
                                        <table className="w-full text-[9px]">
                                            <thead className="bg-yellow-100">
                                                <tr>
                                                    <th className="px-1 py-0.5 text-left font-semibold text-yellow-800">Type</th>
                                                    <th className="px-1 py-0.5 text-left font-semibold text-yellow-800">Host</th>
                                                    <th className="px-1 py-0.5 text-left font-semibold text-yellow-800">Value</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-yellow-700">
                                                <tr className="border-t border-yellow-200">
                                                    <td className="px-1 py-0.5 font-mono font-bold text-red-600">MX</td>
                                                    <td className="px-1 py-0.5 font-mono">@</td>
                                                    <td className="px-1 py-0.5 font-mono flex items-center gap-1">
                                                        <span className="truncate">mail.{activeDomain.name}</span>
                                                        <span className="text-muted">(10)</span>
                                                        <button onClick={() => { navigator.clipboard.writeText(`mail.${activeDomain.name}`); toast.success('Đã copy MX!'); }} className="p-0.5 text-muted hover:text-primary hover:bg-gray-100 rounded transition-colors">{icons.copy}</button>
                                                    </td>
                                                </tr>
                                                <tr className="border-t border-yellow-200">
                                                    <td className="px-1 py-0.5 font-mono font-bold text-blue-600">A</td>
                                                    <td className="px-1 py-0.5 font-mono">mail</td>
                                                    <td className="px-1 py-0.5 font-mono flex items-center gap-1">
                                                        <span>165.22.48.193</span>
                                                        <button onClick={() => { navigator.clipboard.writeText('165.22.48.193'); toast.success('Đã copy IP!'); }} className="p-0.5 text-muted hover:text-primary hover:bg-gray-100 rounded transition-colors">{icons.copy}</button>
                                                    </td>
                                                </tr>
                                                <tr className="border-t border-yellow-200">
                                                    <td className="px-1 py-0.5 font-mono font-bold text-green-600">TXT</td>
                                                    <td className="px-1 py-0.5 font-mono">@</td>
                                                    <td className="px-1 py-0.5 font-mono flex items-center gap-1">
                                                        <span className="break-all truncate">{activeDomain.verificationToken}</span>
                                                        <button onClick={() => { navigator.clipboard.writeText(activeDomain.verificationToken); toast.success('Đã copy TXT!'); }} className="p-0.5 text-muted hover:text-primary hover:bg-gray-100 rounded transition-colors flex-shrink-0">{icons.copy}</button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="text-[9px] text-red-600 font-medium mb-1 flex items-center gap-1">
                                        {icons.warning} MX record bắt buộc để nhận email!
                                    </div>

                                    <ol className="text-[10px] text-yellow-700 list-decimal list-inside space-y-0.5">
                                        <li>Đăng nhập quản lý DNS của domain</li>
                                        <li>Thêm 3 bản ghi DNS như bảng trên</li>
                                        <li>Đợi 5-30 phút để DNS cập nhật</li>
                                        <li>Nhấn "Xác thực ngay" bên dưới</li>
                                    </ol>
                                </div>

                                <button
                                    onClick={() => onVerifyDomain(activeDomain.id, activeDomain.verificationToken)}
                                    disabled={busy}
                                    className="w-full btn-primary text-xs py-1.5 h-auto flex items-center justify-center gap-1"
                                >
                                    {busy ? (
                                        <>{icons.spinner} Đang xác thực...</>
                                    ) : (
                                        <>{icons.check} Xác thực ngay</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Add Domain Button */}
                {/* Only show if NOT creating domain already */}
                {!isCreatingDomain && (
                    <button
                        onClick={() => setIsCreatingDomain(true)}
                        className="text-xs text-primary font-medium mt-2 hover:underline flex items-center gap-1"
                    >
                        + Thêm tên miền mới
                    </button>
                )}

                {isCreatingDomain && (
                    <div className="mt-2 space-y-2 p-2 bg-bg rounded border border-border">
                        <input
                            autoFocus
                            className="text-xs"
                            placeholder="Ví dụ: mycompany.com"
                            value={newDomainName}
                            onChange={e => setNewDomainName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateDomain()}
                        />
                        <div className="flex gap-2 justify-end">
                            <button disabled={busy} onClick={() => setIsCreatingDomain(false)} className="btn-ghost text-xs px-2 py-1 h-auto">Hủy</button>
                            <button disabled={busy} onClick={handleCreateDomain} className="btn-primary text-xs px-2 py-1 h-auto">Thêm</button>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Inbox List */}
            <div className="flex-1 overflow-y-auto p-2">
                <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <span className="text-xs font-semibold text-muted uppercase">Hộp Thư Đến</span>
                    {activeDomain && isOwnerOrAdmin && (
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={async () => {
                                    if (!activeDomain) return;
                                    const randomName = generateRandomName();
                                    await onCreateInbox(activeDomain.id, randomName);
                                }}
                                disabled={busy}
                                className="p-1 hover:bg-bg rounded text-muted hover:text-primary transition-colors"
                                title="Tạo email ngẫu nhiên"
                            >
                                {icons.random}
                            </button>
                            <button
                                onClick={() => setIsCreatingInbox(true)}
                                className="p-1 hover:bg-bg rounded text-primary"
                                title="Tạo hộp thư mới"
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </button>
                        </div>
                    )}
                </div>

                {isCreatingInbox && (
                    <div className="mb-3 p-3 bg-bg rounded border border-border shadow-sm">
                        <div className="text-xs font-medium mb-2">Tạo hộp thư mới:</div>
                        <div className="flex items-center gap-1 mb-2">
                            <input
                                autoFocus
                                className="text-sm flex-1 min-w-0"
                                placeholder="tên-hộp-thư"
                                value={newInboxName}
                                onChange={e => setNewInboxName(e.target.value)}
                            />
                            <span className="text-muted text-xs">@{activeDomain?.name}</span>
                        </div>
                        <select
                            className="text-xs mb-2"
                            value={newInboxTTL}
                            onChange={e => setNewInboxTTL(e.target.value)}
                        >
                            <option value="">Vĩnh viễn (Không xóa)</option>
                            <option value={3600000}>1 Giờ</option>
                            <option value={86400000}>1 Ngày</option>
                            <option value={604800000}>1 Tuần</option>
                        </select>
                        <div className="flex gap-2 justify-end">
                            <button disabled={busy} onClick={() => setIsCreatingInbox(false)} className="btn-ghost text-xs px-2 py-1 h-auto">Hủy</button>
                            <button disabled={busy} onClick={handleCreateInbox} className="btn-primary text-xs px-2 py-1 h-auto">Tạo</button>
                        </div>
                    </div>
                )}

                <div className="space-y-0.5">
                    {inboxes.map(inbox => (
                        <button
                            key={inbox.id}
                            onClick={() => onSelectInbox(inbox.id)}
                            className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${selectedInboxId === inbox.id
                                ? 'bg-primary-light text-primary'
                                : 'text-text-main hover:bg-bg'
                                }`}
                        >
                            <svg
                                className={`w-4 h-4 flex-shrink-0 ${selectedInboxId === inbox.id ? 'text-primary' : 'text-muted'}`}
                                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                            >
                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="truncate font-medium text-sm">{inbox.localPart}</div>
                                {inbox.expiresAt && (
                                    <div className="text-[10px] text-muted truncate">
                                        Hết hạn {formatDistanceToNow(new Date(inbox.expiresAt), { addSuffix: true, locale: vi })}
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}

                    {activeDomain && inboxes.length === 0 && !isCreatingInbox && (
                        <div className="text-center py-8 text-muted text-sm px-4">
                            Chưa có hộp thư nào.<br />Hãy tạo một hộp thư để bắt đầu.
                        </div>
                    )}

                    {!activeDomain && (
                        <div className="text-center py-8 text-muted text-sm">
                            Vui lòng chọn tên miền.
                        </div>
                    )}
                </div>
            </div>

            {/* 3. User Info Footer */}
            <div className="p-3 border-t border-border bg-bg">
                <div className="flex items-center gap-2 group relative">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs cursor-default">
                        A
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-xs font-semibold truncate">Admin User</div>
                        <div className="text-[10px] text-muted truncate">Quản trị viên</div>
                    </div>
                    <div className="flex items-center gap-1">
                        {isAdmin && (
                            <button
                                onClick={() => navigate("/admin")}
                                className="text-muted hover:text-primary p-1.5 rounded hover:bg-surface transition-colors"
                                title="Admin Panel"
                            >
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </button>
                        )}
                        <button
                            onClick={onLogout}
                            className="text-muted hover:text-danger p-1.5 rounded hover:bg-surface transition-colors"
                            title="Đăng xuất"
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
