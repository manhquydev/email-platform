/**
 * InboxActionsSheet Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InboxActionsSheet } from './InboxActionsSheet';

describe('InboxActionsSheet', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        selectedCount: 0,
        filterBy: 'all' as const,
        sortBy: 'created' as const,
        onSelectAll: vi.fn(),
        onCopyAll: vi.fn(),
        onBatchDelete: vi.fn(),
        onFilterChange: vi.fn(),
        onSortChange: vi.fn(),
        onCreateInbox: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('renders when open', () => {
            render(<InboxActionsSheet {...defaultProps} />);
            expect(screen.getByText('Actions')).toBeInTheDocument();
        });

        it('renders Select All action', () => {
            render(<InboxActionsSheet {...defaultProps} />);
            expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
        });

        it('renders Create New Inbox action', () => {
            render(<InboxActionsSheet {...defaultProps} />);
            expect(screen.getByRole('button', { name: /create new inbox/i })).toBeInTheDocument();
        });

        it('renders sort options', () => {
            render(<InboxActionsSheet {...defaultProps} />);
            expect(screen.getByText('Newest')).toBeInTheDocument();
            expect(screen.getByText('Name A-Z')).toBeInTheDocument();
            expect(screen.getByText('Time Left')).toBeInTheDocument();
        });

        it('renders filter options', () => {
            render(<InboxActionsSheet {...defaultProps} />);
            expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Expiring' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Expired' })).toBeInTheDocument();
        });
    });

    describe('batch actions', () => {
        it('does not show Copy/Delete when no selection', () => {
            render(<InboxActionsSheet {...defaultProps} selectedCount={0} />);
            expect(screen.queryByText(/copy.*email/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/delete.*inbox/i)).not.toBeInTheDocument();
        });

        it('shows Copy action with count when items selected', () => {
            render(<InboxActionsSheet {...defaultProps} selectedCount={3} />);
            expect(screen.getByText('Copy 3 emails')).toBeInTheDocument();
        });

        it('shows singular Copy when 1 item selected', () => {
            render(<InboxActionsSheet {...defaultProps} selectedCount={1} />);
            expect(screen.getByText('Copy 1 email')).toBeInTheDocument();
        });

        it('shows Delete action with count when items selected', () => {
            render(<InboxActionsSheet {...defaultProps} selectedCount={2} />);
            expect(screen.getByText('Delete 2 inboxes')).toBeInTheDocument();
        });

        it('shows singular Delete when 1 item selected', () => {
            render(<InboxActionsSheet {...defaultProps} selectedCount={1} />);
            expect(screen.getByText('Delete 1 inbox')).toBeInTheDocument();
        });
    });

    describe('interactions', () => {
        it('calls onSelectAll and onClose when Select All clicked', () => {
            const onSelectAll = vi.fn();
            const onClose = vi.fn();
            render(<InboxActionsSheet {...defaultProps} onSelectAll={onSelectAll} onClose={onClose} />);

            fireEvent.click(screen.getByRole('button', { name: /select all/i }));
            expect(onSelectAll).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('calls onCopyAll and onClose when Copy clicked', () => {
            const onCopyAll = vi.fn();
            const onClose = vi.fn();
            render(<InboxActionsSheet {...defaultProps} selectedCount={2} onCopyAll={onCopyAll} onClose={onClose} />);

            fireEvent.click(screen.getByText('Copy 2 emails'));
            expect(onCopyAll).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('calls onBatchDelete and onClose when Delete clicked', () => {
            const onBatchDelete = vi.fn();
            const onClose = vi.fn();
            render(<InboxActionsSheet {...defaultProps} selectedCount={2} onBatchDelete={onBatchDelete} onClose={onClose} />);

            fireEvent.click(screen.getByText('Delete 2 inboxes'));
            expect(onBatchDelete).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('calls onSortChange when sort option clicked', () => {
            const onSortChange = vi.fn();
            const onClose = vi.fn();
            render(<InboxActionsSheet {...defaultProps} onSortChange={onSortChange} onClose={onClose} />);

            fireEvent.click(screen.getByText('Name A-Z'));
            expect(onSortChange).toHaveBeenCalledWith('name');
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('calls onFilterChange when filter option clicked', () => {
            const onFilterChange = vi.fn();
            const onClose = vi.fn();
            render(<InboxActionsSheet {...defaultProps} onFilterChange={onFilterChange} onClose={onClose} />);

            fireEvent.click(screen.getByRole('button', { name: 'Expiring' }));
            expect(onFilterChange).toHaveBeenCalledWith('expiring');
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('calls onCreateInbox and onClose when Create clicked', () => {
            const onCreateInbox = vi.fn();
            const onClose = vi.fn();
            render(<InboxActionsSheet {...defaultProps} onCreateInbox={onCreateInbox} onClose={onClose} />);

            fireEvent.click(screen.getByRole('button', { name: /create new inbox/i }));
            expect(onCreateInbox).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('active states', () => {
        it('highlights active sort option', () => {
            render(<InboxActionsSheet {...defaultProps} sortBy="name" />);
            const nameOption = screen.getByText('Name A-Z').closest('button');
            expect(nameOption).toHaveClass('text-primary');
        });

        it('highlights active filter option', () => {
            render(<InboxActionsSheet {...defaultProps} filterBy="expired" />);
            const expiredOption = screen.getByRole('button', { name: 'Expired' });
            expect(expiredOption).toHaveClass('text-primary');
        });
    });
});
