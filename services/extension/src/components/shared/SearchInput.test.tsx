/**
 * Component tests for SearchInput.tsx
 * Tests debounced search input with clear functionality
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchInput from './SearchInput';

// Mock constants
vi.mock('../../shared/constants', () => ({
  DEBOUNCE_DELAY_MS: 100, // Short delay for testing
}));

describe('SearchInput', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render with default placeholder', () => {
      render(<SearchInput value="" onChange={mockOnChange} />);

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<SearchInput value="" onChange={mockOnChange} placeholder="Find emails..." />);

      expect(screen.getByPlaceholderText('Find emails...')).toBeInTheDocument();
    });

    it('should display initial value', () => {
      render(<SearchInput value="initial query" onChange={mockOnChange} />);

      expect(screen.getByDisplayValue('initial query')).toBeInTheDocument();
    });

    it('should have search icon', () => {
      render(<SearchInput value="" onChange={mockOnChange} />);

      // Search icon should be present (lucide-react Search component)
      const searchIcon = document.querySelector('.lucide-search');
      expect(searchIcon).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<SearchInput value="" onChange={mockOnChange} className="custom-class" />);

      const container = screen.getByPlaceholderText('Search...').parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('should have aria-label for accessibility', () => {
      render(<SearchInput value="" onChange={mockOnChange} placeholder="Search messages..." />);

      expect(screen.getByLabelText('Search messages...')).toBeInTheDocument();
    });
  });

  describe('Clear Button', () => {
    it('should not show clear button when value is empty', () => {
      render(<SearchInput value="" onChange={mockOnChange} />);

      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });

    it('should show clear button when value is present', async () => {
      vi.useRealTimers();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');
      await userEvent.type(input, 'test');

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('should clear input when clear button is clicked', async () => {
      vi.useRealTimers();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');
      await userEvent.type(input, 'test query');

      const clearButton = screen.getByLabelText('Clear search');
      await userEvent.click(clearButton);

      expect(input).toHaveValue('');
      expect(mockOnChange).toHaveBeenCalledWith('');
    });
  });

  describe('Debounced onChange', () => {
    it('should not call onChange immediately on typing', async () => {
      vi.useRealTimers();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');
      // Fire a single change event
      fireEvent.change(input, { target: { value: 'a' } });

      // onChange should not be called immediately (debounce pending)
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should call onChange after debounce delay', async () => {
      vi.useRealTimers();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');
      fireEvent.change(input, { target: { value: 'test' } });

      // Wait for debounce to complete
      await waitFor(
        () => {
          expect(mockOnChange).toHaveBeenCalledWith('test');
        },
        { timeout: 500 }
      );
    });

    it('should only call onChange once for rapid typing', async () => {
      vi.useRealTimers();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');

      // Simulate rapid typing with multiple change events
      fireEvent.change(input, { target: { value: 'h' } });
      fireEvent.change(input, { target: { value: 'he' } });
      fireEvent.change(input, { target: { value: 'hel' } });
      fireEvent.change(input, { target: { value: 'hell' } });
      fireEvent.change(input, { target: { value: 'hello' } });

      // Wait for debounce to complete
      await waitFor(
        () => {
          expect(mockOnChange).toHaveBeenCalledTimes(1);
          expect(mockOnChange).toHaveBeenCalledWith('hello');
        },
        { timeout: 500 }
      );
    });
  });

  describe('External Value Sync', () => {
    it('should sync when external value changes', () => {
      const { rerender } = render(<SearchInput value="initial" onChange={mockOnChange} />);

      expect(screen.getByDisplayValue('initial')).toBeInTheDocument();

      // Update external value
      rerender(<SearchInput value="updated" onChange={mockOnChange} />);

      expect(screen.getByDisplayValue('updated')).toBeInTheDocument();
    });

    it('should handle empty string sync', () => {
      const { rerender } = render(<SearchInput value="some text" onChange={mockOnChange} />);

      rerender(<SearchInput value="" onChange={mockOnChange} />);

      expect(screen.getByPlaceholderText('Search...')).toHaveValue('');
    });
  });

  describe('User Interactions', () => {
    it('should update local value on input change', async () => {
      vi.useRealTimers();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');
      await userEvent.type(input, 'typing test');

      expect(input).toHaveValue('typing test');
    });

    it('should allow selecting and replacing text', async () => {
      vi.useRealTimers();
      render(<SearchInput value="old value" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');
      await userEvent.clear(input);
      await userEvent.type(input, 'new value');

      expect(input).toHaveValue('new value');
    });
  });

  describe('Styling', () => {
    it('should have focus styles applied', () => {
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');

      // Check for focus-related classes
      expect(input.className).toContain('focus:outline-none');
      expect(input.className).toContain('focus:ring-2');
    });

    it('should have rounded corners', () => {
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');
      expect(input.className).toContain('rounded-xl');
    });
  });
});
