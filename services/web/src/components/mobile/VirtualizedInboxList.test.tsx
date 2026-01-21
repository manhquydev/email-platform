/**
 * VirtualizedInboxList Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualizedInboxList } from './VirtualizedInboxList';
import type { Inbox } from '../../types';

// Mock @tanstack/react-virtual
vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: vi.fn(() => ({
        getVirtualItems: () => [
            { index: 0, key: 'item-0', start: 0, size: 140 },
            { index: 1, key: 'item-1', start: 140, size: 140 },
        ],
        getTotalSize: () => 280,
        measureElement: vi.fn(),
    })),
}));

// Mock child components
vi.mock('./SwipeableInboxCard', () => ({
    SwipeableInboxCard: ({ children, email }: { children: React.ReactNode; email: string }) => (
        <div data-testid={`swipeable-${email}`}>{children}</div>
    ),
}));

vi.mock('../InboxCard', () => ({
    InboxCard: ({ inbox, isActive, onSelect }: { inbox: Inbox; isActive: boolean; onSelect: () => void }) => (
        <div
            data-testid={`inbox-card-${inbox.id}`}
            data-active={isActive}
            onClick={onSelect}
        >
            {inbox.localPart}
        </div>
    ),
}));

describe('VirtualizedInboxList', () => {
    const mockInboxes: Inbox[] = [
        {
            id: 'inbox-1',
            localPart: 'test1',
            domain: { id: 'd1', name: 'example.com', createdAt: '', updatedAt: '' },
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
            expiresAt: '2024-12-31',
            isPermanent: false,
            shareMode: 'private',
        } as Inbox,
        {
            id: 'inbox-2',
            localPart: 'test2',
            domain: { id: 'd1', name: 'example.com', createdAt: '', updatedAt: '' },
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
            expiresAt: '2024-12-31',
            isPermanent: false,
            shareMode: 'private',
        } as Inbox,
    ];

    const defaultProps = {
        inboxes: mockInboxes,
        selectedInboxIds: new Set<string>(),
        focusedIndex: 0,
        onViewMessages: vi.fn(),
        onDeleteInbox: vi.fn(),
        onTransferInbox: vi.fn(),
        onExtendInbox: vi.fn(),
        onTogglePermanent: vi.fn(),
        onShareModeChange: vi.fn(),
        onVisibilityRules: vi.fn(),
        onToggleSelect: vi.fn(),
        onLongPress: vi.fn(),
        onSetFocusedIndex: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('renders virtualized container', () => {
            const { container } = render(<VirtualizedInboxList {...defaultProps} />);
            expect(container.querySelector('.h-full.overflow-auto')).toBeInTheDocument();
        });

        it('renders inbox cards for visible items', () => {
            render(<VirtualizedInboxList {...defaultProps} />);
            expect(screen.getByTestId('inbox-card-inbox-1')).toBeInTheDocument();
            expect(screen.getByTestId('inbox-card-inbox-2')).toBeInTheDocument();
        });

        it('returns null when inboxes array is empty', () => {
            const { container } = render(<VirtualizedInboxList {...defaultProps} inboxes={[]} />);
            expect(container.firstChild).toBeNull();
        });

        it('wraps inbox cards in swipeable container', () => {
            render(<VirtualizedInboxList {...defaultProps} />);
            expect(screen.getByTestId('swipeable-test1@example.com')).toBeInTheDocument();
        });
    });

    describe('positioning', () => {
        it('applies absolute positioning to virtual rows', () => {
            const { container } = render(<VirtualizedInboxList {...defaultProps} />);
            const rows = container.querySelectorAll('[data-index]');
            expect(rows[0]).toHaveStyle({ position: 'absolute' });
        });

        it('applies translateY based on virtual start', () => {
            const { container } = render(<VirtualizedInboxList {...defaultProps} />);
            const rows = container.querySelectorAll('[data-index]');
            expect(rows[0]).toHaveStyle({ transform: 'translateY(0px)' });
            expect(rows[1]).toHaveStyle({ transform: 'translateY(140px)' });
        });
    });

    describe('focus state', () => {
        it('marks focused item as active', () => {
            render(<VirtualizedInboxList {...defaultProps} focusedIndex={0} />);
            expect(screen.getByTestId('inbox-card-inbox-1')).toHaveAttribute('data-active', 'true');
        });

        it('calls onSetFocusedIndex when item selected', () => {
            const onSetFocusedIndex = vi.fn();
            render(<VirtualizedInboxList {...defaultProps} onSetFocusedIndex={onSetFocusedIndex} />);

            fireEvent.click(screen.getByTestId('inbox-card-inbox-2'));
            expect(onSetFocusedIndex).toHaveBeenCalledWith(1);
        });
    });

    describe('context menu', () => {
        it('calls onLongPress on context menu', () => {
            const onLongPress = vi.fn();
            render(<VirtualizedInboxList {...defaultProps} onLongPress={onLongPress} />);

            const card = screen.getByTestId('inbox-card-inbox-1');
            fireEvent.contextMenu(card.parentElement!);
            expect(onLongPress).toHaveBeenCalledWith(mockInboxes[0]);
        });

        it('prevents default context menu', () => {
            render(<VirtualizedInboxList {...defaultProps} />);

            const card = screen.getByTestId('inbox-card-inbox-1');
            const event = fireEvent.contextMenu(card.parentElement!);
            expect(event).toBe(false); // preventDefault was called
        });
    });

    describe('email construction', () => {
        it('constructs email from localPart and domain', () => {
            render(<VirtualizedInboxList {...defaultProps} />);
            expect(screen.getByTestId('swipeable-test1@example.com')).toBeInTheDocument();
        });

        it('handles missing domain gracefully', async () => {
            // Mock virtualizer to return only 1 item for single inbox test
            const { useVirtualizer } = await import('@tanstack/react-virtual');
            vi.mocked(useVirtualizer).mockReturnValueOnce({
                getVirtualItems: () => [{ index: 0, key: 'item-0', start: 0, size: 140 }],
                getTotalSize: () => 140,
                measureElement: vi.fn(),
            } as any);

            const inboxWithoutDomain = [{
                ...mockInboxes[0],
                domain: undefined,
            }] as unknown as Inbox[];

            render(<VirtualizedInboxList {...defaultProps} inboxes={inboxWithoutDomain} />);
            expect(screen.getByTestId('swipeable-test1@unknown')).toBeInTheDocument();
        });
    });
});
