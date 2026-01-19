/**
 * Packages Table component
 * Displays list of service packages with actions
 */
import {
    GlassCard, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, PremiumButton, PremiumToggle
} from "../../../components/admin/AdminUIComponents";
import type { ServicePackage, PlanFeature } from "./types";

export interface PackagesTableProps {
    packages: ServicePackage[];
    loading: boolean;
    onEdit: (pkg: ServicePackage) => void;
    onDelete: (pkg: ServicePackage) => void;
    onToggleStatus: (pkg: ServicePackage, newStatus: boolean) => void;
}

export function PackagesTable({
    packages,
    loading,
    onEdit,
    onDelete,
    onToggleStatus
}: PackagesTableProps) {
    if (loading) {
        return <div className="text-center py-8">Đang tải...</div>;
    }

    return (
        <GlassCard padding="p-0">
            <PremiumTable>
                <TableHeader>
                    <tr>
                        <TableHeaderCell>Thứ tự</TableHeaderCell>
                        <TableHeaderCell>Tên gói</TableHeaderCell>
                        <TableHeaderCell>Loại</TableHeaderCell>
                        <TableHeaderCell>Chi tiết</TableHeaderCell>
                        <TableHeaderCell>Giá</TableHeaderCell>
                        <TableHeaderCell>Hiển thị</TableHeaderCell>
                        <TableHeaderCell>Trạng thái</TableHeaderCell>
                        <TableHeaderCell className="text-right">Hành động</TableHeaderCell>
                    </tr>
                </TableHeader>
                <TableBody>
                    {packages.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="text-center py-8 text-muted">Chưa có gói dịch vụ nào</td>
                        </tr>
                    ) : packages.map(pkg => (
                        <PackageRow
                            key={pkg.id}
                            pkg={pkg}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onToggleStatus={onToggleStatus}
                        />
                    ))}
                </TableBody>
            </PremiumTable>
        </GlassCard>
    );
}

// Package Row sub-component
interface PackageRowProps {
    pkg: ServicePackage;
    onEdit: (pkg: ServicePackage) => void;
    onDelete: (pkg: ServicePackage) => void;
    onToggleStatus: (pkg: ServicePackage, newStatus: boolean) => void;
}

function PackageRow({ pkg, onEdit, onDelete, onToggleStatus }: PackageRowProps) {
    return (
        <TableRow className={!pkg.isActive ? "opacity-60 grayscale-[0.5]" : ""}>
            <TableCell>
                <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    {pkg.displayOrder || 0}
                </span>
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className={`font-medium ${!pkg.isActive ? "text-slate-500 line-through decoration-1" : ""}`}>{pkg.name}</span>
                        {pkg.recommended && (
                            <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-bold">★</span>
                        )}
                        {pkg.badge && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">{pkg.badge}</span>
                        )}
                        {!pkg.isActive && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Lưu trữ</span>
                        )}
                    </div>
                    <div className="text-xs text-muted truncate max-w-[200px]">{pkg.description}</div>
                </div>
            </TableCell>
            <TableCell>
                <span className={`text-xs px-2 py-1 rounded font-medium ${pkg.type === 'TIME_BASED' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                    {pkg.type === 'TIME_BASED' ? 'Theo thời gian' : 'Theo lượt dùng'}
                </span>
            </TableCell>
            <TableCell>
                <div className="text-xs">
                    {pkg.type === 'TIME_BASED' ? (
                        <span>{pkg.durationDays} ngày / {pkg.targetTier}</span>
                    ) : (
                        <span>+{pkg.creditAmount} credits</span>
                    )}
                </div>
            </TableCell>
            <TableCell>
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: pkg.currency }).format(pkg.price)}
            </TableCell>
            <TableCell>
                <div className="text-xs">
                    {(pkg.features as PlanFeature[])?.length || 0} tính năng
                </div>
            </TableCell>
            <TableCell>
                <PremiumToggle
                    checked={pkg.isActive}
                    onChange={(checked) => onToggleStatus(pkg, checked)}
                />
            </TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <PremiumButton variant="ghost" size="sm" onClick={() => onEdit(pkg)} className="text-blue-500">
                        Edit
                    </PremiumButton>
                    <PremiumButton variant="ghost" size="sm" onClick={() => onDelete(pkg)} className="text-red-500">
                        Delete
                    </PremiumButton>
                </div>
            </TableCell>
        </TableRow>
    );
}
