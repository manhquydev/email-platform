/**
 * UI components for AdminEmails
 */
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import DOMPurify from "dompurify";
import type { Email, EmailDetail } from "./admin-emails-hooks";
import {
    GlassCard, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, PremiumButton, PremiumInput,
    EmptyState, LoadingSpinner
} from "../AdminUIComponents";

/** Search and date filter bar */
interface FilterBarProps {
    search: string;
    startDate: string;
    endDate: string;
    onSearchChange: (value: string) => void;
    onStartDateChange: (value: string) => void;
    onEndDateChange: (value: string) => void;
    onPageReset: () => void;
}

export function FilterBar({
    search, startDate, endDate,
    onSearchChange, onStartDateChange, onEndDateChange, onPageReset
}: FilterBarProps) {
    return (
        <GlassCard className="mb-6" padding="p-4" hover={false}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                    <PremiumInput
                        value={search}
                        onChange={(v) => { onSearchChange(v); onPageReset(); }}
                        placeholder="Tìm theo subject hoặc sender..."
                        icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        }
                    />
                </div>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { onStartDateChange(e.target.value); onPageReset(); }}
                    className="px-4 py-2.5 border border-nebula-border rounded-xl bg-nebula-elevated text-nebula-text text-sm"
                    title="Từ ngày"
                />
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { onEndDateChange(e.target.value); onPageReset(); }}
                    className="px-4 py-2.5 border border-nebula-border rounded-xl bg-nebula-elevated text-nebula-text text-sm"
                    title="Đến ngày"
                />
            </div>
        </GlassCard>
    );
}

/** Empty state for no emails */
export function NoEmailsState() {
    return (
        <GlassCard hover={false}>
            <EmptyState
                title="Không tìm thấy email"
                description="Thử thay đổi bộ lọc tìm kiếm"
                icon={
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75" />
                    </svg>
                }
            />
        </GlassCard>
    );
}

/** Emails table */
interface EmailsTableProps {
    emails: Email[];
    onViewEmail: (id: string) => void;
    onDeleteEmail: (id: string) => void;
}

export function EmailsTable({ emails, onViewEmail, onDeleteEmail }: EmailsTableProps) {
    return (
        <GlassCard padding="p-0" hover={false}>
            <PremiumTable>
                <TableHeader>
                    <tr>
                        <TableHeaderCell>Subject</TableHeaderCell>
                        <TableHeaderCell>From</TableHeaderCell>
                        <TableHeaderCell>To</TableHeaderCell>
                        <TableHeaderCell>Received</TableHeaderCell>
                        <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                    </tr>
                </TableHeader>
                <TableBody>
                    {emails.map((email) => (
                        <TableRow key={email.id} onClick={() => onViewEmail(email.id)}>
                            <TableCell className="max-w-xs">
                                <div className={`truncate ${!email.isRead ? "font-semibold text-nebula-text" : ""}`}>
                                    {!email.isRead && <span className="w-2 h-2 bg-primary rounded-full inline-block mr-2" />}
                                    {email.subject || "(Không có tiêu đề)"}
                                </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{email.fromAddress}</TableCell>
                            <TableCell className="max-w-xs truncate">{email.toAddress}</TableCell>
                            <TableCell className="whitespace-nowrap">
                                {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true, locale: vi })}
                            </TableCell>
                            <TableCell className="text-right">
                                <PremiumButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDeleteEmail(email.id); }}
                                    className="text-danger hover:text-danger hover:bg-danger/10"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </PremiumButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </PremiumTable>
        </GlassCard>
    );
}

/** Email detail modal */
interface EmailDetailModalProps {
    email: EmailDetail;
    loadingDetail: boolean;
    onClose: () => void;
    onDelete: (id: string) => void;
}

export function EmailDetailModal({ email, loadingDetail, onClose, onDelete }: EmailDetailModalProps) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <GlassCard className="max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" padding="p-0" hover={false} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                {loadingDetail ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        <div className="p-5 border-b border-nebula-border">
                            <div className="flex items-start justify-between">
                                <h2 className="text-lg font-bold text-nebula-text pr-8">
                                    {email.subject || "(Không có tiêu đề)"}
                                </h2>
                                <button onClick={onClose} className="text-nebula-text-muted hover:text-nebula-text-secondary">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="mt-3 text-sm text-nebula-text-secondary space-y-1">
                                <p><span className="font-medium text-nebula-text">From:</span> {email.fromAddress}</p>
                                <p><span className="font-medium text-nebula-text">To:</span> {email.toAddress}</p>
                                <p><span className="font-medium text-nebula-text">Received:</span> {new Date(email.receivedAt).toLocaleString("vi-VN")}</p>
                            </div>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1 bg-nebula-surface">
                            {email.htmlBody ? (
                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.htmlBody) }} className="prose prose-sm dark:prose-invert max-w-none" />
                            ) : email.textBody ? (
                                <pre className="whitespace-pre-wrap text-sm text-nebula-text-secondary">{email.textBody}</pre>
                            ) : (
                                <p className="text-nebula-text-muted italic">Không có nội dung</p>
                            )}
                        </div>
                        <div className="p-4 border-t border-nebula-border flex justify-end gap-3">
                            <PremiumButton variant="danger" onClick={() => onDelete(email.id)}>
                                Xóa email
                            </PremiumButton>
                            <PremiumButton variant="secondary" onClick={onClose}>
                                Đóng
                            </PremiumButton>
                        </div>
                    </>
                )}
            </GlassCard>
        </div>
    );
}
