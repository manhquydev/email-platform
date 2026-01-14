/**
 * AttachmentGrid - Display email attachments with thumbnails
 * Supports image preview, file type icons, and download
 */

import { useState } from 'react';
import { cn } from '../../utils/cn';

interface Attachment {
    id: string;
    filename: string;
    contentType: string;
    size: number;
    url?: string;
}

interface AttachmentGridProps {
    attachments: Attachment[];
    onDownload?: (attachment: Attachment) => void;
    onPreview?: (attachment: Attachment) => void;
    className?: string;
}

// File type to icon mapping
const FILE_ICONS: Record<string, { icon: string; color: string }> = {
    pdf: { icon: '📄', color: 'text-red-400 bg-red-500/10' },
    doc: { icon: '📝', color: 'text-blue-400 bg-blue-500/10' },
    docx: { icon: '📝', color: 'text-blue-400 bg-blue-500/10' },
    xls: { icon: '📊', color: 'text-green-400 bg-green-500/10' },
    xlsx: { icon: '📊', color: 'text-green-400 bg-green-500/10' },
    ppt: { icon: '📽️', color: 'text-orange-400 bg-orange-500/10' },
    pptx: { icon: '📽️', color: 'text-orange-400 bg-orange-500/10' },
    zip: { icon: '📦', color: 'text-yellow-400 bg-yellow-500/10' },
    rar: { icon: '📦', color: 'text-yellow-400 bg-yellow-500/10' },
    txt: { icon: '📃', color: 'text-gray-400 bg-gray-500/10' },
    csv: { icon: '📋', color: 'text-green-400 bg-green-500/10' },
    default: { icon: '📎', color: 'text-text-secondary bg-white/5' },
};

function getFileIcon(filename: string): { icon: string; color: string } {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return FILE_ICONS[ext] || FILE_ICONS.default;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(contentType: string): boolean {
    return contentType.startsWith('image/');
}

export function AttachmentGrid({
    attachments,
    onDownload,
    onPreview,
    className,
}: AttachmentGridProps) {
    const [previewImage, setPreviewImage] = useState<Attachment | null>(null);

    if (!attachments || attachments.length === 0) return null;

    const handleClick = (attachment: Attachment) => {
        if (isImage(attachment.contentType) && attachment.url) {
            setPreviewImage(attachment);
            onPreview?.(attachment);
        } else {
            onDownload?.(attachment);
        }
    };

    return (
        <>
            <div className={cn('border-t border-white/5 pt-3', className)}>
                <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-xs font-medium text-text-secondary">
                        {attachments.length} tệp đính kèm
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {attachments.map((attachment) => (
                        <AttachmentItem
                            key={attachment.id}
                            attachment={attachment}
                            onClick={() => handleClick(attachment)}
                        />
                    ))}
                </div>
            </div>

            {/* Image Preview Lightbox */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] p-4">
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img
                            src={previewImage.url}
                            alt={previewImage.filename}
                            className="max-w-full max-h-[85vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="text-center mt-3">
                            <p className="text-white font-medium">{previewImage.filename}</p>
                            <p className="text-white/60 text-sm">{formatFileSize(previewImage.size)}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

interface AttachmentItemProps {
    attachment: Attachment;
    onClick: () => void;
}

function AttachmentItem({ attachment, onClick }: AttachmentItemProps) {
    const isImg = isImage(attachment.contentType);
    const { icon, color } = getFileIcon(attachment.filename);

    return (
        <button
            onClick={onClick}
            className={cn(
                'group flex flex-col items-center p-3 rounded-lg border border-white/5',
                'hover:border-primary/30 hover:bg-primary/5 transition-all',
                'text-left w-full'
            )}
        >
            {/* Thumbnail or Icon */}
            <div className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center mb-2',
                isImg ? 'bg-white/5' : color
            )}>
                {isImg && attachment.url ? (
                    <img
                        src={attachment.url}
                        alt={attachment.filename}
                        className="w-full h-full object-cover rounded-lg"
                    />
                ) : (
                    <span className="text-2xl">{icon}</span>
                )}
            </div>

            {/* Filename */}
            <p className="text-xs text-text-main font-medium truncate w-full text-center group-hover:text-primary transition-colors">
                {attachment.filename}
            </p>

            {/* Size */}
            <p className="text-[10px] text-text-secondary">
                {formatFileSize(attachment.size)}
            </p>
        </button>
    );
}

export default AttachmentGrid;
