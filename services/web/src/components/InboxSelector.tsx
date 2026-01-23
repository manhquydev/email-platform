/**
 * InboxSelector - Dropdown selector for domains, teams, and inboxes
 * Modules extracted to inbox-selector-modules/
 */
import { AnimatePresence } from "framer-motion";
import {
    type InboxSelectorProps,
    useDropdownState,
    splitDomains,
    TriggerButton,
    TeamSelector,
    DomainSelector,
    InboxList,
    DropdownFooter,
    dropdownAnimation,
    motion
} from "./inbox-selector-modules";

export function InboxSelector({
    domains,
    teams = [],
    inboxes,
    selectedDomainId,
    selectedTeamId = "",
    selectedInboxId,
    onSelectDomain,
    onSelectTeam,
    onSelectInbox,
    onCreateInbox: _onCreateInbox, // eslint-disable-line @typescript-eslint/no-unused-vars
    onDeleteInbox: _onDeleteInbox, // eslint-disable-line @typescript-eslint/no-unused-vars
    user,
    token: _token // eslint-disable-line @typescript-eslint/no-unused-vars
}: InboxSelectorProps) {
    const { isOpen, setIsOpen, containerRef } = useDropdownState();
    const activeDomain = domains.find(d => d.id === selectedDomainId);
    const activeInbox = inboxes.find(i => i.id === selectedInboxId);
    const activeTeam = teams.find(t => t.id === selectedTeamId);
    const { myDomains, sharedDomains } = splitDomains(domains, user?.id);

    return (
        <div className="relative" ref={containerRef}>
            <TriggerButton
                isOpen={isOpen}
                onClick={() => setIsOpen(!isOpen)}
                activeDomain={activeDomain}
                activeInbox={activeInbox}
                activeTeam={activeTeam}
                selectedTeamId={selectedTeamId}
            />

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        {...dropdownAnimation}
                        className="absolute top-full left-0 mt-2 w-[340px] bg-surface-elevated border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        <div className="p-3 bg-surface-elevated/50 border-b border-white/5">
                            <TeamSelector teams={teams} selectedTeamId={selectedTeamId} onSelectTeam={onSelectTeam} />
                            {!selectedTeamId && (
                                <DomainSelector
                                    myDomains={myDomains}
                                    sharedDomains={sharedDomains}
                                    selectedDomainId={selectedDomainId}
                                    onSelectDomain={onSelectDomain}
                                />
                            )}
                        </div>

                        <InboxList
                            inboxes={inboxes}
                            selectedInboxId={selectedInboxId}
                            selectedTeamId={selectedTeamId}
                            onSelectInbox={onSelectInbox}
                            onClose={() => setIsOpen(false)}
                        />

                        <DropdownFooter />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
