/**
 * InboxSidebarItem - Single inbox item in sidebar with context menu
 */
import { useState, useRef, useEffect } from 'react';
import { cn } from '../../../utils/cn';
import { CopyButton } from '../../copy-first/CopyButton';
import { TTLProgressBar } from '../../copy-first/TTLProgressBar';
import { InboxContextMenu } from './inbox-context-menu';
import type { InboxSidebarItemProps } from './types';

export function InboxSidebarItem({
    inbox,
    isActive,
    onSelect,
    onCopy,
    onDelete,
    onTransfer,
    onExtend,
    onTogglePermanent,
    onShareModeChange,
    onVisibilityRules,
    compact = false,
}: InboxSidebarItemProps) {
    const email = `${inbox.localPart}@${inbox.domain?.name || 'domain'}`;
    const messageCount = inbox._count?.messages ?? 0;
    const [showMenu, setShowMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const menuRef = useRef<HTMLDivElement>(null);

    // Check if inbox is expiring soon (within 24h)
    const isExpiringSoon = inbox.expiresAt
        // eslint-disable-next-line react-hooks/purity -- Date.now() needed for TTL calculation
        ? new Date(inbox.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000
        : false;

    // Close menu on outside click
    useEffect(() => {
        if (!showMenu) return;
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [showMenu]);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setMenuPos({ x: e.clientX, y: e.clientY });
        setShowMenu(true);
    };

    return (
        <>
            <div
                className={cn(
                    'group relative px-3 py-2.5 cursor-pointer transition-all duration-200',
                    'border-l-2 border-transparent',
                    'hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent',
                    isActive && 'bg-gradient-to-r from-primary/15 to-primary/5 border-l-primary shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]',
                    isExpiringSoon && !isActive && 'bg-gradient-to-r from-amber-500/10 to-transparent border-l-amber-500/50'
                )}
                onClick={onSelect}
                onContextMenu={handleContextMenu}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect();
                    }
                }}
            >
                {/* Email address row */}
                <div className="flex items-center gap-2 mb-1.5">
                    {/* Status indicators */}
                    <div className="flex-shrink-0 flex items-center gap-1">
                        {inbox.shareMode === 'PUBLIC' && (
                            <span className="w-2 h-2 rounded-full bg-green-400" title="Công khai" />
                        )}
                    </div>

                    <span
                        className={cn(
                            'text-sm truncate flex-1',
                            isActive ? 'text-primary font-semibold' : 'text-text-main font-medium'
                        )}
                        title={email}
                    >
                        {compact ? inbox.localPart : email}
                    </span>

                    {/* Message count badge */}
                    {messageCount > 0 && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-white/10 text-text-secondary min-w-[18px] text-center">
                            {messageCount > 99 ? '99+' : messageCount}
                        </span>
                    )}

                    {/* Action buttons - visible on hover */}
                    <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton
                            text={email}
                            size="sm"
                            variant="ghost"
                            showToast
                            successMessage={`Đã copy: ${email}`}
                            onCopy={onCopy}
                            ariaLabel="Copy email"
                        />
                        <button
                            className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-text-main transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenuPos({ x: e.currentTarget.getBoundingClientRect().left, y: e.currentTarget.getBoundingClientRect().bottom });
                                setShowMenu(!showMenu);
                            }}
                            title="Thêm tùy chọn"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Stats row */}
                {!compact && (
                    <div className="flex items-center gap-2">
                        <TTLProgressBar
                            expiresAt={inbox.expiresAt || null}
                            createdAt={inbox.createdAt}
                            size="sm"
                            className="flex-1"
                            showLabel={true}
                        />
                        <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                            <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>{messageCount}</span>
                        </div>
                    </div>
                )}

                {/* Compact mode: Show message count badge */}
                {compact && messageCount > 0 && (
                    <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-white/10 text-text-secondary">
                        {messageCount}
                    </span>
                )}
            </div>

            {/* Context Menu */}
            {showMenu && (
                <InboxContextMenu
                    inbox={inbox}
                    menuPos={menuPos}
                    menuRef={menuRef}
                    onClose={() => setShowMenu(false)}
                    onShareModeChange={onShareModeChange}
                    onVisibilityRules={onVisibilityRules}
                    onTransfer={onTransfer}
                    onTogglePermanent={onTogglePermanent}
                    onExtend={onExtend}
                    onDelete={onDelete}
                />
            )}
        </>
    );
}
