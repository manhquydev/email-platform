/**
 * InboxActionsSheet - Action sheet for inbox management actions
 * Contains all toolbar actions in a mobile-friendly bottom sheet
 */

import { BottomSheet } from './BottomSheet';
import { cn } from '../../utils/cn';
import type { FilterOption, SortOption } from '../inbox-manager/hooks/use-inbox-filters';

/** Icons */
function CheckSquareIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function CopyIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
    );
}

function SortIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
        </svg>
    );
}

function FilterIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
    );
}

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    );
}

export interface InboxActionsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCount: number;
    filterBy: FilterOption;
    sortBy: SortOption;
    onSelectAll: () => void;
    onCopyAll: () => void;
    onBatchDelete: () => void;
    onFilterChange: (filter: FilterOption) => void;
    onSortChange: (sort: SortOption) => void;
    onCreateInbox: () => void;
}

export function InboxActionsSheet({
    isOpen,
    onClose,
    selectedCount,
    filterBy,
    sortBy,
    onSelectAll,
    onCopyAll,
    onBatchDelete,
    onFilterChange,
    onSortChange,
    onCreateInbox
}: InboxActionsSheetProps) {
    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Actions">
            <div className="flex flex-col pb-4">
                {/* Selection actions */}
                <ActionItem
                    icon={<CheckSquareIcon className="w-5 h-5" />}
                    label="Select All"
                    onClick={() => { onSelectAll(); onClose(); }}
                />

                {selectedCount > 0 && (
                    <>
                        <ActionItem
                            icon={<CopyIcon className="w-5 h-5" />}
                            label={`Copy ${selectedCount} email${selectedCount > 1 ? 's' : ''}`}
                            onClick={() => { onCopyAll(); onClose(); }}
                        />
                        <ActionItem
                            icon={<TrashIcon className="w-5 h-5" />}
                            label={`Delete ${selectedCount} inbox${selectedCount > 1 ? 'es' : ''}`}
                            onClick={() => { onBatchDelete(); onClose(); }}
                            variant="danger"
                        />
                    </>
                )}

                <Divider />

                {/* Sort options */}
                <ActionGroup label="Sort by" icon={<SortIcon className="w-4 h-4" />}>
                    <RadioOption
                        label="Newest"
                        checked={sortBy === 'created'}
                        onChange={() => { onSortChange('created'); onClose(); }}
                    />
                    <RadioOption
                        label="Name A-Z"
                        checked={sortBy === 'name'}
                        onChange={() => { onSortChange('name'); onClose(); }}
                    />
                    <RadioOption
                        label="Time Left"
                        checked={sortBy === 'ttl'}
                        onChange={() => { onSortChange('ttl'); onClose(); }}
                    />
                </ActionGroup>

                <Divider />

                {/* Filter options */}
                <ActionGroup label="Filter" icon={<FilterIcon className="w-4 h-4" />}>
                    <RadioOption
                        label="All"
                        checked={filterBy === 'all'}
                        onChange={() => { onFilterChange('all'); onClose(); }}
                    />
                    <RadioOption
                        label="Active"
                        checked={filterBy === 'active'}
                        onChange={() => { onFilterChange('active'); onClose(); }}
                    />
                    <RadioOption
                        label="Expiring"
                        checked={filterBy === 'expiring'}
                        onChange={() => { onFilterChange('expiring'); onClose(); }}
                    />
                    <RadioOption
                        label="Expired"
                        checked={filterBy === 'expired'}
                        onChange={() => { onFilterChange('expired'); onClose(); }}
                    />
                </ActionGroup>

                <Divider />

                {/* Create action */}
                <ActionItem
                    icon={<PlusIcon className="w-5 h-5" />}
                    label="Create New Inbox"
                    onClick={() => { onCreateInbox(); onClose(); }}
                    variant="primary"
                />
            </div>
        </BottomSheet>
    );
}

/** Action item button */
interface ActionItemProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'primary';
}

function ActionItem({ icon, label, onClick, variant = 'default' }: ActionItemProps) {
    const colors = {
        default: 'text-text-main',
        danger: 'text-red-400',
        primary: 'text-primary',
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-4 py-3 min-h-[48px] w-full",
                "hover:bg-white/5 active:bg-white/10 transition-colors",
                "text-left rounded-lg",
                colors[variant]
            )}
        >
            {icon}
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
}

/** Divider line */
function Divider() {
    return <div className="h-px bg-white/10 my-2" />;
}

/** Action group with label */
interface ActionGroupProps {
    label: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

function ActionGroup({ label, icon, children }: ActionGroupProps) {
    return (
        <div className="py-1">
            <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {icon}
                {label}
            </div>
            <div className="flex flex-col">{children}</div>
        </div>
    );
}

/** Radio option for single selection */
interface RadioOptionProps {
    label: string;
    checked: boolean;
    onChange: () => void;
}

function RadioOption({ label, checked, onChange }: RadioOptionProps) {
    return (
        <button
            onClick={onChange}
            className={cn(
                "flex items-center justify-between px-4 py-3 min-h-[44px] w-full",
                "hover:bg-white/5 active:bg-white/10 transition-colors",
                "text-left",
                checked ? 'text-primary' : 'text-text-main'
            )}
        >
            <span className="text-sm">{label}</span>
            {checked && <CheckIcon className="w-4 h-4 text-primary" />}
        </button>
    );
}
