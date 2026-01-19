/**
 * Table components for Admin UI
 * PremiumTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell
 */
import React from "react";

// --- Premium Table Component ---
export interface PremiumTableProps {
    children: React.ReactNode;
    className?: string;
}

export function PremiumTable({ children, className = "" }: PremiumTableProps) {
    return (
        <div className="overflow-x-auto rounded-xl border border-nebula-border">
            <table className={`w-full border-collapse ${className}`}>
                {children}
            </table>
        </div>
    );
}

// --- Table Header ---
export function TableHeader({ children }: { children: React.ReactNode }) {
    return (
        <thead className="bg-nebula-elevated">
            {children}
        </thead>
    );
}

// --- Table Header Cell ---
export interface TableHeaderCellProps {
    children: React.ReactNode;
    className?: string;
}

export function TableHeaderCell({ children, className = "" }: TableHeaderCellProps) {
    return (
        <th className={`text-left text-xs font-semibold text-nebula-text-muted uppercase tracking-wider px-4 py-3 ${className}`}>
            {children}
        </th>
    );
}

// --- Table Body ---
export function TableBody({ children }: { children: React.ReactNode }) {
    return <tbody className="divide-y divide-nebula-border">{children}</tbody>;
}

// --- Table Row ---
export interface TableRowProps {
    children: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}

export function TableRow({ children, className = "", onClick }: TableRowProps) {
    return (
        <tr
            className={`bg-nebula-surface hover:bg-nebula-elevated transition-colors ${onClick ? "cursor-pointer" : ""} ${className}`}
            onClick={onClick}
        >
            {children}
        </tr>
    );
}

// --- Table Cell ---
export interface TableCellProps {
    children: React.ReactNode;
    className?: string;
}

export function TableCell({ children, className = "" }: TableCellProps) {
    return (
        <td className={`px-4 py-3 text-sm text-nebula-text-secondary ${className}`}>
            {children}
        </td>
    );
}
