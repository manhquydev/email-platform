/**
 * EmailBody - Secure HTML/text email content renderer
 * Blocks external images by default, provides plain text toggle
 */

import { useState, useMemo } from 'react';
import { cn } from '../../utils/cn';

interface EmailBodyProps {
    htmlBody?: string | null;
    textBody?: string | null;
    className?: string;
}

export function EmailBody({ htmlBody, textBody, className }: EmailBodyProps) {
    const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
    const [loadImages, setLoadImages] = useState(false);

    // Check if HTML contains external images
    const hasExternalImages = useMemo(() => {
        if (!htmlBody) return false;
        // Match img tags with http/https src (external)
        return /<img[^>]+src=["']https?:\/\//i.test(htmlBody);
    }, [htmlBody]);

    // Sanitize HTML - block external images unless allowed
    const sanitizedHtml = useMemo(() => {
        if (!htmlBody) return '';

        let html = htmlBody;

        if (!loadImages) {
            // Replace external image src with placeholder
            html = html.replace(
                /<img([^>]+)src=["'](https?:\/\/[^"']+)["']/gi,
                '<img$1src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'60\' viewBox=\'0 0 100 60\'%3E%3Crect fill=\'%23374151\' width=\'100\' height=\'60\'/%3E%3Ctext x=\'50\' y=\'35\' text-anchor=\'middle\' fill=\'%239CA3AF\' font-size=\'10\'%3EImage blocked%3C/text%3E%3C/svg%3E" data-original-src="$2"'
            );
        }

        return html;
    }, [htmlBody, loadImages]);

    const hasHtml = !!htmlBody;
    const hasText = !!textBody;
    const showToggle = hasHtml && hasText;

    // Determine what to show
    const showHtml = viewMode === 'html' && hasHtml;

    return (
        <div className={cn('flex flex-col h-full', className)}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-surface/30">
                {/* View mode toggle */}
                {showToggle && (
                    <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-lg">
                        <button
                            onClick={() => setViewMode('html')}
                            className={cn(
                                'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                                viewMode === 'html'
                                    ? 'bg-primary text-white'
                                    : 'text-text-secondary hover:text-text-main'
                            )}
                        >
                            HTML
                        </button>
                        <button
                            onClick={() => setViewMode('text')}
                            className={cn(
                                'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                                viewMode === 'text'
                                    ? 'bg-primary text-white'
                                    : 'text-text-secondary hover:text-text-main'
                            )}
                        >
                            Text
                        </button>
                    </div>
                )}

                {/* Load images button */}
                {showHtml && hasExternalImages && !loadImages && (
                    <button
                        onClick={() => setLoadImages(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Tải hình ảnh
                    </button>
                )}

                {loadImages && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Đã tải hình ảnh
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto min-h-0">
                {showHtml ? (
                    <iframe
                        srcDoc={`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="utf-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1">
                                <style>
                                    body {
                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                        font-size: 14px;
                                        line-height: 1.6;
                                        color: #1f2937;
                                        padding: 16px;
                                        margin: 0;
                                        background: #fff;
                                    }
                                    img { max-width: 100%; height: auto; }
                                    a { color: #2563eb; }
                                    pre, code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
                                    table { border-collapse: collapse; max-width: 100%; }
                                    td, th { padding: 8px; border: 1px solid #e5e7eb; }
                                </style>
                            </head>
                            <body>${sanitizedHtml}</body>
                            </html>
                        `}
                        title="Email content"
                        sandbox="allow-same-origin"
                        className="w-full h-full border-0 bg-white"
                    />
                ) : hasText ? (
                    <div className="p-4 whitespace-pre-wrap font-mono text-sm text-text-main bg-surface/20">
                        {textBody}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-text-secondary">
                        <p className="text-sm">Không có nội dung</p>
                    </div>
                )}
            </div>
        </div>
    );
}
