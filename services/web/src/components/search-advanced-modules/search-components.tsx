/**
 * UI components for SearchAdvanced
 */
import type { SearchFilter, SearchOperator } from "./search-types";
import { SEARCH_OPERATORS } from "./search-types";

/** Search icon SVG */
export function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Clear button for search input */
export function ClearButton({ onClick }: { onClick: () => void }) {
    return (
        <button onClick={onClick} className="p-1 text-muted hover:text-text-main transition-colors" title="Xóa">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    );
}

/** Filter toggle button */
export function FilterToggle({ isActive, hasFilters, onClick }: { isActive: boolean; hasFilters: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`p-1.5 rounded transition-colors ${isActive || hasFilters ? 'bg-primary-light text-primary' : 'text-muted hover:text-text-main hover:bg-bg'}`}
            title="Bộ lọc nâng cao"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {hasFilters && <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />}
        </button>
    );
}

/** Search operators suggestion panel */
interface OperatorsPanelProps {
    value: string;
    onChange: (value: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

export function OperatorsPanel({ value, onChange, inputRef }: OperatorsPanelProps) {
    return (
        <div className="p-2 border-b border-border">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Toán tử tìm kiếm</div>
            <div className="flex flex-wrap gap-1">
                {SEARCH_OPERATORS.map((op: SearchOperator, idx: number) => (
                    <button
                        key={idx}
                        onClick={() => {
                            onChange(value + (value ? ' ' : '') + op.label);
                            inputRef.current?.focus();
                        }}
                        className="text-xs px-2 py-1 rounded bg-bg border border-border hover:border-primary hover:text-primary transition-colors"
                        title={op.description}
                    >
                        {op.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/** Recent searches list */
interface RecentSearchesProps {
    searches: string[];
    onSelect: (search: string) => void;
}

export function RecentSearchesList({ searches, onSelect }: RecentSearchesProps) {
    if (searches.length === 0) return null;
    return (
        <div className="p-2">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Tìm kiếm gần đây</div>
            {searches.map((search, idx) => (
                <button
                    key={idx}
                    onClick={() => onSelect(search)}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-primary-light rounded transition-colors flex items-center gap-2"
                >
                    <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="truncate">{search}</span>
                </button>
            ))}
        </div>
    );
}

/** Advanced filters panel */
interface FiltersPanelProps {
    filters: SearchFilter;
    hasActiveFilters: boolean;
    updateFilter: (key: keyof SearchFilter, value: string | boolean) => void;
    clearFilters: () => void;
    onClose: () => void;
}

export function FiltersPanel({ filters, hasActiveFilters, updateFilter, clearFilters, onClose }: FiltersPanelProps) {
    return (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 animate-fade-in-up p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">Bộ lọc nâng cao</div>
                {hasActiveFilters && (
                    <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                        Xóa bộ lọc
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-muted block mb-1">Từ</label>
                    <input
                        type="text"
                        value={filters.from || ''}
                        onChange={(e) => updateFilter('from', e.target.value)}
                        placeholder="email@example.com"
                        className="text-sm py-1.5"
                    />
                </div>
                <div>
                    <label className="text-xs text-muted block mb-1">Đến</label>
                    <input
                        type="text"
                        value={filters.to || ''}
                        onChange={(e) => updateFilter('to', e.target.value)}
                        placeholder="email@example.com"
                        className="text-sm py-1.5"
                    />
                </div>
                <div className="col-span-2">
                    <label className="text-xs text-muted block mb-1">Tiêu đề chứa</label>
                    <input
                        type="text"
                        value={filters.subject || ''}
                        onChange={(e) => updateFilter('subject', e.target.value)}
                        placeholder="Nhập từ khóa..."
                        className="text-sm py-1.5"
                    />
                </div>
                <div>
                    <label className="text-xs text-muted block mb-1">Từ ngày</label>
                    <input
                        type="date"
                        value={filters.dateFrom || ''}
                        onChange={(e) => updateFilter('dateFrom', e.target.value)}
                        className="text-sm py-1.5"
                    />
                </div>
                <div>
                    <label className="text-xs text-muted block mb-1">Đến ngày</label>
                    <input
                        type="date"
                        value={filters.dateTo || ''}
                        onChange={(e) => updateFilter('dateTo', e.target.value)}
                        className="text-sm py-1.5"
                    />
                </div>
                <div className="col-span-2 flex gap-4 pt-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.hasAttachment || false}
                            onChange={(e) => updateFilter('hasAttachment', e.target.checked)}
                            className="rounded border-border w-4 h-4 text-primary focus:ring-primary"
                        />
                        Có file đính kèm
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.isUnread || false}
                            onChange={(e) => updateFilter('isUnread', e.target.checked)}
                            className="rounded border-border w-4 h-4 text-primary focus:ring-primary"
                        />
                        Chưa đọc
                    </label>
                </div>
            </div>

            <div className="mt-4 flex justify-end">
                <button onClick={onClose} className="btn btn-primary text-sm">
                    Áp dụng bộ lọc
                </button>
            </div>
        </div>
    );
}
