/**
 * Attachments List component
 * Displays email attachments with download links
 */

interface AttachmentsListProps {
    attachments?: Array<{ storageKey: string; filename?: string }>;
}

export function AttachmentsList({ attachments }: AttachmentsListProps) {
    if (!attachments || attachments.length === 0) return null;

    return (
        <div className="mt-8">
            <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                Tệp đính kèm ({attachments.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {attachments.map((att, idx) => (
                    <a
                        key={idx}
                        href={`/api/attachments/${att.storageKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-nebula-elevated border border-nebula-border hover:border-nebula-violet/50 hover:bg-nebula-surface transition-all group"
                    >
                        <div className="p-2 bg-nebula-surface rounded-lg group-hover:bg-nebula-violet/20 group-hover:text-nebula-violet transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-nebula-text truncate">{att.filename || `Tệp ${idx + 1}`}</div>
                            <div className="text-xs text-nebula-text-muted">Nhấp để tải xuống</div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}
