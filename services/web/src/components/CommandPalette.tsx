/**
 * CommandPalette - Command palette for quick navigation and actions
 * Modules extracted to command-palette-modules/
 */
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    type CommandPaletteProps,
    filterCommands,
    useCommandPaletteState,
    useKeyboardNavigation,
    buildCommands,
    PaletteInput,
    ResultsList,
    PaletteFooter
} from "./command-palette-modules";

export function CommandPalette({
    isOpen,
    onClose,
    domains: _domains, // eslint-disable-line @typescript-eslint/no-unused-vars
    inboxes,
    onSelectInbox,
    onCreateInbox,
    onSearch,
    currentInboxEmail,
    onCopyEmail
}: CommandPaletteProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const { query, setQuery, selectedIndex, setSelectedIndex, inputRef } = useCommandPaletteState(isOpen);

    const commands = buildCommands({
        navigate, onClose, onCreateInbox, onSelectInbox, inboxes,
        isAdmin, currentInboxEmail, onCopyEmail
    });

    const filteredCommands = filterCommands(commands, query);

    useKeyboardNavigation(
        isOpen, filteredCommands, selectedIndex,
        setSelectedIndex, query, onSearch, onClose
    );

    if (!isOpen) return null;

    return (
        <>
            <div className="command-palette-overlay" onClick={onClose} />
            <div className="command-palette">
                <PaletteInput inputRef={inputRef} query={query} setQuery={setQuery} />
                <ResultsList
                    commands={filteredCommands}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    query={query}
                />
                <PaletteFooter />
            </div>
        </>
    );
}
