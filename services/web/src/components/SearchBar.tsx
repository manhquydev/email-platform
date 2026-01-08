import { useState, useRef, useEffect, useCallback } from "react";

interface SearchBarProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (query: string) => void;
    recentSearches?: string[];
}

export function SearchBar({ isOpen, onClose, onSearch, recentSearches = [] }: SearchBarProps) {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setQuery("");
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Handle escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === "Escape") {
            e.preventDefault();
            onClose();
        }
    }, [isOpen, onClose]);

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
            onClose();
        }
    };

    const handleQuickSearch = (term: string) => {
        onSearch(term);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="search-bar-overlay" onClick={onClose} />
            <div className="search-bar-container">
                <form onSubmit={handleSubmit} className="search-bar-form">
                    <div className="search-bar-input-wrapper">
                        <svg className="search-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Tìm kiếm email theo tiêu đề, người gửi..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="search-bar-input"
                        />
                        {query && (
                            <button
                                type="button"
                                className="search-bar-clear"
                                onClick={() => setQuery("")}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                        <kbd className="search-bar-kbd">ESC</kbd>
                    </div>
                </form>

                {/* Search Hints */}
                <div className="search-bar-hints">
                    <div className="search-bar-hint-section">
                        <span className="search-bar-hint-label">Gợi ý tìm kiếm:</span>
                        <div className="search-bar-hint-tags">
                            <button
                                className="search-bar-hint-tag"
                                onClick={() => handleQuickSearch("from:noreply")}
                            >
                                from:noreply
                            </button>
                            <button
                                className="search-bar-hint-tag"
                                onClick={() => handleQuickSearch("has:attachment")}
                            >
                                has:attachment
                            </button>
                            <button
                                className="search-bar-hint-tag"
                                onClick={() => handleQuickSearch("is:unread")}
                            >
                                is:unread
                            </button>
                        </div>
                    </div>

                    {recentSearches.length > 0 && (
                        <div className="search-bar-hint-section">
                            <span className="search-bar-hint-label">Tìm kiếm gần đây:</span>
                            <div className="search-bar-hint-tags">
                                {recentSearches.slice(0, 3).map((term, idx) => (
                                    <button
                                        key={idx}
                                        className="search-bar-hint-tag search-bar-hint-tag--recent"
                                        onClick={() => handleQuickSearch(term)}
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="search-bar-footer">
                    <span>↵ Tìm kiếm</span>
                    <span>ESC Đóng</span>
                </div>
            </div>
        </>
    );
}

// Inline search component (for header integration)
interface InlineSearchProps {
    onSearch: (query: string) => void;
    placeholder?: string;
}

export function InlineSearch({ onSearch, placeholder = "Tìm kiếm..." }: InlineSearchProps) {
    const [query, setQuery] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className="inline-search">
            <svg className="inline-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="inline-search-input"
            />
        </form>
    );
}
