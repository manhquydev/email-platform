/**
 * UI components for AdminDomains
 */
import { TableRow, TableCell, StatusBadge } from "../AdminUIComponents";
import type { Domain } from "./admin-domains-hooks";

/** Single domain row in the table */
interface DomainRowProps {
    domain: Domain;
    isSelected: boolean;
    updating: string | null;
    onToggleSelect: (id: string) => void;
    onReview: (id: string, status: "APPROVED" | "REJECTED") => void;
}

export function DomainRow({ domain, isSelected, updating, onToggleSelect, onReview }: DomainRowProps) {
    return (
        <TableRow>
            <TableCell>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(domain.id)}
                    className="rounded border-nebula-border"
                />
            </TableCell>
            <TableCell>
                <div className="font-medium text-nebula-text">{domain.name}</div>
                <div className="text-xs text-nebula-text-muted">{new Date(domain.createdAt).toLocaleDateString()}</div>
            </TableCell>
            <TableCell className="text-xs">{domain.owner?.email || "—"}</TableCell>
            <TableCell>
                <StatusBadge
                    status={domain.status}
                    variant={domain.status === "VERIFIED" ? "success" : "warning"}
                />
            </TableCell>
            <TableCell>
                <StatusBadge
                    status={domain.contributionStatus}
                    variant={
                        domain.contributionStatus === "APPROVED" ? "success" :
                            domain.contributionStatus === "REJECTED" ? "danger" :
                                domain.contributionStatus === "PENDING" ? "warning" : "default"
                    }
                />
            </TableCell>
            <TableCell>
                <span className={`text-xs px-2 py-1 rounded-lg ${domain.isPublic ? "bg-info/10 text-info" : "bg-nebula-elevated text-nebula-text-muted"}`}>
                    {domain.isPublic ? "Public" : "Private"}
                </span>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                    {domain.contributionStatus === "PENDING" && (
                        <>
                            <button
                                onClick={() => onReview(domain.id, "APPROVED")}
                                disabled={updating === domain.id}
                                className="text-xs text-success hover:text-success font-medium"
                            >
                                Duyệt
                            </button>
                            <button
                                onClick={() => onReview(domain.id, "REJECTED")}
                                disabled={updating === domain.id}
                                className="text-xs text-danger hover:text-danger font-medium"
                            >
                                Từ chối
                            </button>
                        </>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
}

/** Filter dropdown for contribution status */
interface FilterSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export function FilterSelect({ value, onChange }: FilterSelectProps) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-nebula-border bg-nebula-elevated text-nebula-text"
        >
            <option value="ALL">Tất cả</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Bị từ chối</option>
        </select>
    );
}
