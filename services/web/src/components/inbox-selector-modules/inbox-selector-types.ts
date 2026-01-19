/**
 * Types and hooks for InboxSelector
 */
import { useState, useRef, useEffect } from "react";
import type { Domain, Inbox, Team } from "../../types";

export interface InboxSelectorProps {
    domains: Domain[];
    teams?: Team[];
    inboxes: Inbox[];
    selectedDomainId: string;
    selectedTeamId?: string;
    selectedInboxId: string;
    onSelectDomain: (id: string) => void;
    onSelectTeam?: (id: string) => void;
    onSelectInbox: (id: string) => void;
    onCreateInbox?: (domainId: string, localPart: string, expiresAt?: number) => Promise<void>;
    onDeleteInbox?: (inbox: Inbox) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: any;
    token: string | null;
}

/** Hook for dropdown state and click outside detection */
export function useDropdownState() {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return { isOpen, setIsOpen, containerRef };
}

/** Split domains into owned and shared */
export function splitDomains(domains: Domain[], userId?: string) {
    const myDomains = userId ? domains.filter(d => d.ownerId === userId) : [];
    const sharedDomains = userId ? domains.filter(d => d.ownerId !== userId) : domains;
    return { myDomains, sharedDomains };
}
