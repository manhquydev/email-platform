import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { InboxSelector } from "../InboxSelector";
import { ListeningIndicator } from "../copy-first/ListeningIndicator";
import { cn } from "../../utils/cn";
import type { Domain, Inbox, Team } from "../../types";

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface DashboardToolbarProps {
    domains: Domain[];
    teams: Team[];
    inboxes: Inbox[];
    selectedDomain: string;
    selectedTeam: string;
    selectedInbox: string;
    realtimeStatus: string;
    busy: boolean;
    canSendOutbound: boolean;
    user: { id: string; role: string } | null;
    token: string | null;
    onSelectDomain: (id: string) => void;
    onSelectTeam: (id: string) => void;
    onRefresh: () => void;
    onCompose: () => void;
}

export const DashboardToolbar: React.FC<DashboardToolbarProps> = ({
    domains,
    teams,
    inboxes,
    selectedDomain,
    selectedTeam,
    selectedInbox,
    realtimeStatus,
    busy,
    canSendOutbound,
    user,
    token,
    onSelectDomain,
    onSelectTeam,
    onRefresh,
    onCompose,
}) => {
    const navigate = useNavigate();

    // Map realtimeStatus to ConnectionStatus
    const getConnectionStatus = (): ConnectionStatus => {
        if (realtimeStatus === 'error' || realtimeStatus === 'disconnected') {
            return 'disconnected';
        }
        if (realtimeStatus === 'connecting') {
            return 'connecting';
        }
        return 'connected';
    };

    return (
        <div className="h-16 px-4 border-b border-nebula-border flex items-center justify-between shrink-0 bg-nebula-surface/90 backdrop-blur-md relative z-20">
            <div className="flex items-center gap-3 w-full">
                <div className="w-full max-w-[280px]">
                    <ListeningIndicator
                        status={getConnectionStatus()}
                        size="sm"
                        showLabel={true}
                        className="mr-4"
                    />
                    <InboxSelector
                        domains={domains}
                        teams={teams}
                        inboxes={inboxes}
                        selectedDomainId={selectedDomain}
                        selectedTeamId={selectedTeam}
                        selectedInboxId={selectedInbox}
                        onSelectDomain={onSelectDomain}
                        onSelectTeam={onSelectTeam}
                        onSelectInbox={(id) => navigate(`?inboxId=${id}`)}
                        user={user}
                        token={token}
                    />
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRefresh}
                    disabled={busy}
                    className="text-nebula-text-muted hover:text-nebula-violet"
                    icon={<svg className={cn("w-5 h-5", busy && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                />
                {canSendOutbound && (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onCompose}
                        className="ml-2"
                    >
                        Soạn thư
                    </Button>
                )}

                <div className="group relative ml-1">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate('/app/manager')}
                        className="shadow-lg shadow-primary/20 hover:shadow-primary/30 shrink-0 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90"
                        title="Quản lý inbox và tên miền"
                    >
                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="hidden sm:inline font-semibold">Quản lý</span>
                    </Button>
                    <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-nebula-elevated border border-nebula-border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-xs text-nebula-text-muted">
                        Đi tới trang quản lý hộp thư và tên miền
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardToolbar;
