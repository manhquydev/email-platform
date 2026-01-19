/**
 * Types and hooks for Sidebar component
 */
import { useState } from "react";
import type { Domain, Inbox } from "../../types";
import { generateRandomName } from "../../utils/random";

export interface SidebarProps {
    domains: Domain[];
    inboxes: Inbox[];
    selectedDomainId: string;
    selectedInboxId: string;
    currentUserId?: string;
    onSelectDomain: (id: string) => void;
    onSelectInbox: (id: string) => void;
    onCreateDomain: (name: string) => Promise<void>;
    onCreateInbox: (domainId: string, localPart: string, expiresAt?: number) => Promise<void>;
    onVerifyDomain: (domainId: string, token: string) => Promise<void>;
    onDeleteDomain: (domain: Domain) => void;
    onDeleteInbox: (inbox: Inbox) => void;
    onExtendInbox: (inboxId: string) => Promise<void>;
    isAdmin: boolean;
    busy: boolean;
}

/** Hook to manage sidebar state and actions */
export function useSidebar(props: SidebarProps) {
    const {
        domains,
        inboxes,
        selectedDomainId,
        selectedInboxId,
        currentUserId,
        onSelectDomain,
        onSelectInbox,
        onCreateInbox,
        onDeleteInbox,
        onExtendInbox,
        isAdmin,
        busy
    } = props;

    const [isCreatingInbox, setIsCreatingInbox] = useState(false);
    const [newInboxName, setNewInboxName] = useState("");

    const activeDomain = domains.find(d => d.id === selectedDomainId);
    const isOwnerOrAdmin = activeDomain && (isAdmin || activeDomain.ownerId === currentUserId);
    const canCreateInbox = activeDomain && activeDomain.status === 'VERIFIED' && (
        isAdmin ||
        activeDomain.ownerId === currentUserId ||
        activeDomain.isPublic
    );

    const myDomains = currentUserId ? domains.filter(d => d.ownerId === currentUserId) : [];
    const sharedDomains = currentUserId ? domains.filter(d => d.ownerId !== currentUserId) : domains;

    const handleCreateInbox = async () => {
        if (!newInboxName.trim() || !activeDomain) return;
        await onCreateInbox(activeDomain.id, newInboxName);
        setNewInboxName("");
        setIsCreatingInbox(false);
    };

    const handleQuickCreate = async () => {
        if (!activeDomain) return;
        const randomName = generateRandomName();
        await onCreateInbox(activeDomain.id, randomName);
    };

    return {
        inboxes,
        selectedInboxId,
        currentUserId,
        onSelectDomain,
        onSelectInbox,
        onDeleteInbox,
        onExtendInbox,
        busy,
        isCreatingInbox,
        setIsCreatingInbox,
        newInboxName,
        setNewInboxName,
        activeDomain,
        isOwnerOrAdmin,
        canCreateInbox,
        myDomains,
        sharedDomains,
        selectedDomainId,
        handleCreateInbox,
        handleQuickCreate
    };
}
