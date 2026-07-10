/**
 * ManagerWorkspacePane Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ManagerWorkspacePane } from './desktop-manager-workspace-pane';
import type { Inbox } from '../../../types';

describe('ManagerWorkspacePane', () => {
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
        activeInbox: mockInbox,
        filteredCount: 1,
        onCreateInbox: vi.fn(),
        onShareModeChange: vi.fn(),
    };

    function renderPane(props = {}) {
        return render(
            <MemoryRouter>
                <ManagerWorkspacePane {...defaultProps} {...props} />
            </MemoryRouter>
        );
    }

    it('renders a clickable share mode toggle for the active inbox, not just static text', () => {
        renderPane();
        const toggle = screen.getByTitle(/chuyển sang public/i);
        expect(toggle).toBeInTheDocument();
    });

    it('calls onShareModeChange with the inbox id and flipped mode when clicked', () => {
        const onShareModeChange = vi.fn();
        renderPane({ onShareModeChange });
        fireEvent.click(screen.getByTitle(/chuyển sang public/i));
        expect(onShareModeChange).toHaveBeenCalledWith('inbox-1', 'PUBLIC');
    });
});
