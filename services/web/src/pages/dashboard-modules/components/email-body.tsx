/**
 * Email Body component
 * Renders HTML or plain text email content
 */
import { GlassCard } from "../../../components/ui/GlassCard";
import type { Message } from "../../../types";

interface EmailBodyProps {
    message: Message;
}

export function EmailBody({ message }: EmailBodyProps) {
    return (
        <GlassCard className="p-6 md:p-8 rounded-2xl dark:bg-[var(--nebula-surface)] border-2 border-nebula-border overflow-hidden shadow-sm">
            {message.htmlBody ? (
                <div className="prose dark:prose-invert max-w-none">
                    <iframe
                        srcDoc={`
                            <style>
                                @media (prefers-color-scheme: dark) { html, body { background: #1A2340 !important; color: #E2E8F0 !important; } }
                                html.dark, body.dark { background: #1A2340 !important; color: #E2E8F0 !important; }
                            </style>
                            <script>
                                if (window.matchMedia('(prefers-color-scheme: dark)').matches || document.documentElement.getAttribute('data-theme') === 'dark') {
                                    document.documentElement.classList.add('dark');
                                    document.body?.classList.add('dark');
                                }
                            </script>
                            ${message.htmlBody}
                        `}
                        sandbox="allow-same-origin allow-scripts"
                        title="Email content"
                        className="w-full min-h-[400px] border-none bg-white dark:bg-[#1A2340] rounded-lg"
                    />
                </div>
            ) : (
                <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-nebula-text-secondary">
                    {message.textBody || "Không có nội dung"}
                </pre>
            )}
        </GlassCard>
    );
}
