/**
 * CompactToolbar Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompactToolbar } from './CompactToolbar';

describe('CompactToolbar', () => {
    const defaultProps = {
        selectedCount: 0,
        filterLabel: 'all' as const,
        onMenuOpen: vi.fn(),
        onFilterChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('renders menu button', () => {
            render(<CompactToolbar {...defaultProps} />);
            expect(screen.getByRole('button', { name: /open actions menu/i })).toBeInTheDocument();
        });

        it('renders filter select with correct value', () => {
            render(<CompactToolbar {...defaultProps} filterLabel="active" />);
            const select = screen.getByRole('combobox');
            expect(select).toHaveValue('active');
        });

        it('renders all filter options', () => {
            render(<CompactToolbar {...defaultProps} />);
            expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Expiring' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Expired' })).toBeInTheDocument();
        });
    });

    describe('selection count', () => {
        it('does not show selection count when 0', () => {
            render(<CompactToolbar {...defaultProps} selectedCount={0} />);
            expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
        });

        it('shows selection count when > 0', () => {
            render(<CompactToolbar {...defaultProps} selectedCount={3} />);
            expect(screen.getByText('3 selected')).toBeInTheDocument();
        });

        it('shows singular selection count', () => {
            render(<CompactToolbar {...defaultProps} selectedCount={1} />);
            expect(screen.getByText('1 selected')).toBeInTheDocument();
        });
    });

    describe('interactions', () => {
        it('calls onMenuOpen when menu button clicked', () => {
            const onMenuOpen = vi.fn();
            render(<CompactToolbar {...defaultProps} onMenuOpen={onMenuOpen} />);

            fireEvent.click(screen.getByRole('button', { name: /open actions menu/i }));
            expect(onMenuOpen).toHaveBeenCalledTimes(1);
        });

        it('calls onFilterChange when filter changed', () => {
            const onFilterChange = vi.fn();
            render(<CompactToolbar {...defaultProps} onFilterChange={onFilterChange} />);

            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'expired' } });
            expect(onFilterChange).toHaveBeenCalledWith('expired');
        });
    });

    describe('accessibility', () => {
        it('menu button has accessible label', () => {
            render(<CompactToolbar {...defaultProps} />);
            expect(screen.getByLabelText('Open actions menu')).toBeInTheDocument();
        });

        it('menu button has minimum touch target size', () => {
            render(<CompactToolbar {...defaultProps} />);
            const button = screen.getByRole('button', { name: /open actions menu/i });
            expect(button).toHaveClass('min-h-[48px]', 'min-w-[48px]');
        });
    });
});
