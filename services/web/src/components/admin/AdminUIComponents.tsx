/**
 * Shared Admin UI Components - Premium Glassmorphism Design
 * Re-exports all components from modular structure
 */

// Re-export all components from modules
export {
    // Card and layout
    GlassCard,
    SectionHeader,
    // Table
    PremiumTable,
    TableHeader,
    TableHeaderCell,
    TableBody,
    TableRow,
    TableCell,
    // Form and input
    PremiumButton,
    PremiumInput,
    PremiumSelect,
    PremiumToggle,
    // Feedback and utility
    StatusBadge,
    EmptyState,
    LoadingSpinner,
    Pagination,
    BulkActionsBar,
    ConfirmModal
} from "./admin-ui-modules";

// Re-export types
export type {
    GlassCardProps,
    SectionHeaderProps,
    PremiumTableProps,
    TableHeaderCellProps,
    TableRowProps,
    TableCellProps,
    PremiumButtonProps,
    PremiumInputProps,
    PremiumSelectProps,
    PremiumToggleProps,
    StatusBadgeProps,
    EmptyStateProps,
    LoadingSpinnerProps,
    PaginationProps,
    BulkActionsBarProps,
    ConfirmModalProps
} from "./admin-ui-modules";
