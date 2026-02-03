/**
 * CompactToolbar - Merged toolbar with InboxSelector, Search, and Actions
 * Replaces separate search row to save vertical space
 */
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { InboxSelector } from './InboxSelector';
import { ListeningIndicator } from './copy-first/ListeningIndicator';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import type { Domain, Team, Inbox, User } from '../types';

interface CompactToolbarProps {
  // Inbox selector props (optional - for pages that need it)
  domains?: Domain[];
  teams?: Team[];
  inboxes?: Inbox[];
  selectedDomainId?: string;
  selectedTeamId?: string;
  selectedInboxId?: string;
  onSelectDomain?: (id: string) => void;
  onSelectTeam?: (id: string) => void;
  onSelectInbox?: (id: string) => void;
  user?: User | null;
  token?: string | null;

  // Search props
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchInputRef?: React.RefObject<HTMLInputElement>;

  // Action props
  onRefresh?: () => void;
  onCompose?: () => void;
  onManage?: () => void;
  busy?: boolean;
  canSendOutbound?: boolean;

  // Realtime status
  realtimeStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';

  // Layout
  showInboxSelector?: boolean;
  showSearch?: boolean;
  className?: string;
}

export function CompactToolbar({
  domains = [],
  teams = [],
  inboxes = [],
  selectedDomainId = '',
  selectedTeamId = '',
  selectedInboxId = '',
  onSelectDomain,
  onSelectTeam,
  onSelectInbox,
  user,
  token,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  searchInputRef,
  onRefresh,
  onCompose,
  onManage,
  busy = false,
  canSendOutbound = false,
  realtimeStatus,
  showInboxSelector = true,
  showSearch = true,
  className,
}: CompactToolbarProps) {
  const navigate = useNavigate();
  const internalSearchRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef || internalSearchRef;

  return (
    <div className={cn(
      "h-14 px-3 border-b border-nebula-border flex items-center gap-2 shrink-0 bg-nebula-surface/90 backdrop-blur-md relative z-20",
      className
    )}>
      {/* Left: Inbox Selector */}
      {showInboxSelector && (
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          {realtimeStatus && (
            <ListeningIndicator
              status={realtimeStatus === 'error' ? 'disconnected' : realtimeStatus}
              size="sm"
              showLabel={false}
            />
          )}
          <div className="max-w-[180px] lg:max-w-[220px]">
            <InboxSelector
              domains={domains}
              teams={teams}
              inboxes={inboxes}
              selectedDomainId={selectedDomainId}
              selectedTeamId={selectedTeamId}
              selectedInboxId={selectedInboxId}
              onSelectDomain={onSelectDomain || (() => {})}
              onSelectTeam={onSelectTeam || (() => {})}
              onSelectInbox={onSelectInbox || (() => {})}
              user={user}
              token={token ?? null}
            />
          </div>
        </div>
      )}

      {/* Center: Search (inline, flexible width) */}
      {showSearch && (
        <div className="flex-1 min-w-0 max-w-[240px] hidden sm:block">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nebula-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-nebula-elevated border border-nebula-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-nebula-text placeholder:text-nebula-text-muted focus:outline-none focus:border-nebula-violet/50 transition-colors"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={busy}
            className="text-nebula-text-muted hover:text-nebula-violet"
            icon={
              <svg className={cn("w-4 h-4", busy && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          />
        )}

        {canSendOutbound && onCompose && (
          <Button variant="primary" size="sm" onClick={onCompose} className="hidden sm:flex">
            Soạn
          </Button>
        )}

        {onManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/manager')}
            className="shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-violet-600"
            title="Quản lý inbox"
          >
            <svg className="w-4 h-4 sm:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Quản lý</span>
          </Button>
        )}
      </div>
    </div>
  );
}
