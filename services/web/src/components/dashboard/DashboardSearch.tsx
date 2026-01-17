import React from "react";

interface DashboardSearchProps {
    value: string;
    onChange: (value: string) => void;
    inputRef?: React.RefObject<HTMLInputElement>;
}

export const DashboardSearch: React.FC<DashboardSearchProps> = ({
    value,
    onChange,
    inputRef,
}) => {
    return (
        <div className="p-3 border-b border-nebula-border shrink-0">
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nebula-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    ref={inputRef}
                    type="text"
                    className="w-full bg-nebula-elevated border border-nebula-border rounded-lg pl-10 pr-4 py-2 text-sm text-nebula-text placeholder:text-nebula-text-muted focus:outline-none focus:border-nebula-violet/50 transition-colors"
                    placeholder="Tìm kiếm... (từ:, là:chưa đọc)"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    );
};

export default DashboardSearch;
