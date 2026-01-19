/**
 * UI components for UsersPage
 * UserTableRow, BulkActionsSection
 */
import type { User } from "./types";
import {
    TableRow, TableCell, StatusBadge, PremiumButton
} from "../../../components/admin/AdminUIComponents";

// --- User Table Row ---
export interface UserTableRowProps {
    user: User;
    isSelected: boolean;
    updating: string | null;
    onSelect: (id: string) => void;
    onRoleChange: (userId: string, role: "ADMIN" | "USER") => void;
    onTierChange: (userId: string, tier: string) => void;
    onCancelSubscription: (userId: string) => void;
    onToggleDisable: (user: User) => void;
    onDelete: (user: User) => void;
    onForceVerify: (userId: string) => void;
}

export function UserTableRow({
    user, isSelected, updating,
    onSelect, onRoleChange, onTierChange, onCancelSubscription,
    onToggleDisable, onDelete, onForceVerify
}: UserTableRowProps) {
    return (
        <TableRow className={isSelected ? "!bg-primary/5 dark:!bg-primary/10" : ""}>
            <TableCell>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(user.id)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
            </TableCell>
            <TableCell>
                <div className={`font-medium ${user.isDisabled ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
                    {user?.email || "Unknown"}
                </div>
                {user.isDisabled && <StatusBadge status="Đã khóa" variant="danger" />}
                <div className="flex items-center gap-1 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 ${user.role === "ADMIN" ? "bg-purple-50 text-purple-600" : "text-slate-500"}`}>
                        {user.role}
                    </span>
                    {!user.emailVerified && (
                        <button onClick={() => onForceVerify(user.id)} className="text-[10px] text-amber-500 hover:underline">
                            Chưa xác thực
                        </button>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <select
                    value={user.tier}
                    onChange={(e) => onTierChange(user.id, e.target.value)}
                    disabled={updating === user.id}
                    className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer hover:border-blue-500 transition-colors w-28"
                >
                    <option value="FREE">FREE</option>
                    <option value="STARTER">STARTER</option>
                    <option value="PROFESSIONAL">PROFESSIONAL</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
            </TableCell>
            <TableCell>
                <div className="text-xs font-mono text-slate-500 max-w-[100px] truncate" title={user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt).toLocaleString() : ""}>
                    {user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt).toLocaleDateString("vi-VN") : "—"}
                </div>
            </TableCell>
            <TableCell>
                <StatusBadge
                    status={user.subscriptionStatus}
                    variant={user.subscriptionStatus === "ACTIVE" ? "success" : "default"}
                />
                {user.stripeSubscriptionId && user.subscriptionStatus === "ACTIVE" && (
                    <button
                        onClick={() => onCancelSubscription(user.id)}
                        className="block mt-1 text-[10px] text-red-500 hover:underline"
                    >
                        Hủy đăng ký
                    </button>
                )}
            </TableCell>
            <TableCell>{user._count.domains}</TableCell>
            <TableCell>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                    <select
                        value={user.role}
                        onChange={(e) => onRoleChange(user.id, e.target.value as "ADMIN" | "USER")}
                        disabled={updating === user.id}
                        className="text-[10px] py-1 px-1 rounded border border-slate-200 dark:border-slate-600 bg-transparent"
                        title="Change Role"
                    >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                    <PremiumButton
                        variant={user.isDisabled ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => onToggleDisable(user)}
                        disabled={updating === user.id}
                        className="!px-2 !py-1"
                        title={user.isDisabled ? "Mở khóa" : "Khóa"}
                    >
                        {user.isDisabled ? "Unlock" : "Lock"}
                    </PremiumButton>
                    <PremiumButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(user)}
                        disabled={updating === user.id}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 !px-2 !py-1"
                        title="Xóa người dùng"
                    >
                        X
                    </PremiumButton>
                </div>
            </TableCell>
        </TableRow>
    );
}

// --- Table Header Row ---
export interface UserTableHeaderProps {
    isAllSelected: boolean;
    onSelectAll: () => void;
}

export function UserTableHeader({ isAllSelected, onSelectAll }: UserTableHeaderProps) {
    return (
        <tr>
            <th className="w-10 px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gói cước</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hết hạn</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trạng thái</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Domains</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ngày tạo</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hành động</th>
        </tr>
    );
}
