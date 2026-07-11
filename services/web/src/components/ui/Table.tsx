/**
 * Table - plain semantic HTML table primitive (Phase 6)
 *
 * Deliberately NOT an interactive-grid pattern (no role="grid",
 * aria-colcount/aria-rowcount) — that ARIA pattern implies arrow-key
 * cell navigation, which is wrong for these read-only display tables
 * (red team finding #12). Semantics come from plain <table>/<caption>/
 * <th scope> markup, which is correct and sufficient for read-only data.
 */
import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
    return (
        <div className="w-full overflow-x-auto rounded-xl border border-semantic-border">
            <table className={cn('w-full min-w-[480px] border-collapse text-sm', className)} {...props}>
                {children}
            </table>
        </div>
    );
}

/** Visually hidden by default — pass className to override (e.g. make a visible title). */
export function TableCaption({ className, children, ...props }: HTMLAttributes<HTMLTableCaptionElement>) {
    return (
        <caption className={cn('sr-only', className)} {...props}>
            {children}
        </caption>
    );
}

export function TableHeader({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <thead className={cn('bg-semantic-bg-secondary', className)} {...props}>
            {children}
        </thead>
    );
}

export function TableBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <tbody className={cn('divide-y divide-semantic-border', className)} {...props}>
            {children}
        </tbody>
    );
}

export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
    return (
        <tr className={cn('transition-colors hover:bg-semantic-bg-hover', className)} {...props}>
            {children}
        </tr>
    );
}

export function TableHead({ className, scope = 'col', children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
    return (
        <th
            scope={scope}
            className={cn(
                'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-semantic-text-secondary whitespace-nowrap',
                className
            )}
            {...props}
        >
            {children}
        </th>
    );
}

export function TableCell({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
    return (
        <td className={cn('px-4 py-3 text-semantic-text-main align-middle', className)} {...props}>
            {children}
        </td>
    );
}
