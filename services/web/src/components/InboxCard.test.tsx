/**
 * InboxCard Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InboxCard } from './InboxCard';
import type { Inbox } from '../types';

describe('InboxCard', () => {
    const mockInbox: Inbox = {
        id: 'inbox-1',
        localPart: 'test1',
        domain: { id: 'd1', name: 'example.com', createdAt: '', updatedAt: '' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        expiresAt: '2024-12-31',
        isPermanent: false,
        shareMode: 'PRIVATE',
    } as Inbox;

    const defaultProps = {
        inbox: mockInbox,
        isSelected: false,
        isActive: false,
        onSelect: vi.fn(),
        onToggleSelect: vi.fn(),
        onCopy: vi.fn(),
        onDelete: vi.fn(),
        onViewMessages: vi.fn(),
        onShareModeChange: vi.fn(),
    };

    describe('share mode toggle visibility', () => {
        it('renders the share toggle without a CSS class that hides it on narrow viewports', () => {
            render(<InboxCard {...defaultProps} />);
            const toggle = screen.getByTitle(/chuyển sang public/i);
            expect(toggle).toBeInTheDocument();
            // The toggle must not be wrapped in an element carrying `hidden`,
            // otherwise it never becomes visible at the width the mobile
            // inbox tab (VirtualizedInboxList) actually renders at (<640px).
            expect(toggle.closest('.hidden')).toBeNull();
        });

        it('does not render the toggle when onShareModeChange is not provided', () => {
            render(<InboxCard {...defaultProps} onShareModeChange={undefined} />);
            expect(screen.queryByTitle(/chuyển sang public/i)).not.toBeInTheDocument();
        });
    });
});
