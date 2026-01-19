/**
 * UI components for CommandPalette
 */
import type { Command } from "./command-palette-types";
import { CATEGORY_LABELS, groupCommandsByCategory } from "./command-palette-types";
import { SearchIcon } from "./command-palette-icons";

/** Input wrapper component */
interface InputWrapperProps {
    inputRef: React.RefObject<HTMLInputElement | null>;
    query: string;
    setQuery: (value: string) => void;
}

export function PaletteInput({ inputRef, query, setQuery }: InputWrapperProps) {
    return (
        <div className="command-palette-input-wrapper">
            <SearchIcon />
            <input
                ref={inputRef}
                type="text"
                placeholder="Nhập lệnh hoặc tìm kiếm..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="command-palette-input"
            />
            <kbd className="command-palette-kbd">ESC</kbd>
        </div>
    );
}

/** Results list component */
interface ResultsListProps {
    commands: Command[];
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
    query: string;
}

export function ResultsList({ commands, selectedIndex, setSelectedIndex, query }: ResultsListProps) {
    const groupedCommands = groupCommandsByCategory(commands);
    let globalIndex = 0;

    return (
        <div className="command-palette-results">
            {Object.entries(groupedCommands).map(([category, cmds]) => (
                <div key={category} className="command-palette-group">
                    <div className="command-palette-group-label">
                        {CATEGORY_LABELS[category] || category}
                    </div>
                    {cmds.map((cmd) => {
                        const index = globalIndex++;
                        return (
                            <button
                                key={cmd.id}
                                className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={cmd.action}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <span className="command-palette-item-icon">{cmd.icon}</span>
                                <span className="command-palette-item-label">{cmd.label}</span>
                                {cmd.shortcut && (
                                    <kbd className="command-palette-item-shortcut">{cmd.shortcut}</kbd>
                                )}
                            </button>
                        );
                    })}
                </div>
            ))}

            {commands.length === 0 && query.length > 0 && (
                <div className="command-palette-empty">
                    <p>Không tìm thấy lệnh "{query}"</p>
                    <p className="text-muted">Nhấn Enter để tìm email</p>
                </div>
            )}
        </div>
    );
}

/** Footer component */
export function PaletteFooter() {
    return (
        <div className="command-palette-footer">
            <span>↑↓ Di chuyển</span>
            <span>↵ Chọn</span>
            <span>ESC Đóng</span>
        </div>
    );
}
