/**
 * Detail Header component for message detail pane
 * Shows sender info and action buttons
 */
import { Button } from "../../../components/ui/Button";
import type { Message } from "../../../types";

interface DetailHeaderProps {
    message: Message;
    onBack: () => void;
    onReply: () => void;
    onMarkUnread: () => void;
    onTogglePin: () => void;
    onDelete: () => void;
    onCopyContent: () => void;
}

export function DetailHeader({
    message,
    onBack,
    onReply,
    onMarkUnread,
    onTogglePin,
    onDelete,
    onCopyContent
}: DetailHeaderProps) {
    return (
        <div className="h-16 px-6 border-b border-nebula-border flex items-center justify-between shrink-0 bg-nebula-surface/90 backdrop-blur-md">
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden text-nebula-text"
                    onClick={onBack}
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>}
                />
                <div className="flex flex-col">
                    <h3 className="text-base font-semibold text-nebula-text max-w-[200px] md:max-w-md truncate">
                        {message.fromAddress}
                    </h3>
                    <span className="text-xs text-nebula-text-muted">
                        {new Date(message.receivedAt).toLocaleString("vi-VN")}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-1 bg-nebula-elevated rounded-lg p-1 border border-nebula-border shadow-lg backdrop-blur-md">
                <Button variant="ghost" size="icon" onClick={onReply} title="Trả lời" className="text-nebula-text-muted hover:text-nebula-text"
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>} />
                <Button variant="ghost" size="icon" onClick={onMarkUnread} title="Đánh dấu chưa đọc" className="text-nebula-text-muted hover:text-nebula-text"
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />
                <Button variant="ghost" size="icon" onClick={onTogglePin} className={message.isPinned ? "text-warning" : "text-nebula-text-muted hover:text-nebula-text"} title={message.isPinned ? "Bỏ ghim" : "Ghim"}
                    icon={<svg className="w-5 h-5" fill={message.isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>} />
                <div className="w-px h-5 bg-nebula-border mx-1"></div>
                <Button variant="ghost" size="icon" onClick={onDelete} className="text-nebula-text-muted hover:text-danger hover:bg-danger/10" title="Xóa"
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>} />
                <Button variant="ghost" size="icon" onClick={onCopyContent} className="text-nebula-text-muted hover:text-nebula-text" title="Sao chép nội dung"
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>} />
            </div>
        </div>
    );
}
