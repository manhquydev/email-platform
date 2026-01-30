/**
 * Unit tests for MessagePreviewTooltip component
 * Simplified tests focusing on rendering and basic interactions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessagePreviewTooltip from './MessagePreviewTooltip';

// Mock API
vi.mock('../../shared/api', () => ({
  api: {
    getMessages: vi.fn(),
  },
}));

// Mock i18n
vi.mock('../../shared/i18n', () => ({
  t: vi.fn((key: string) => {
    const translations: Record<string, string> = {
      loadingPreview: 'Loading preview',
      noMessages: 'No messages',
    };
    return translations[key] || key;
  }),
}));

import { api } from '../../shared/api';

describe('MessagePreviewTooltip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render children', () => {
      render(
        <MessagePreviewTooltip inboxId="inbox-1">
          <div data-testid="child">Inbox Item</div>
        </MessagePreviewTooltip>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Inbox Item')).toBeInTheDocument();
    });

    it('should not show tooltip initially', () => {
      render(
        <MessagePreviewTooltip inboxId="inbox-1">
          <div>Inbox Item</div>
        </MessagePreviewTooltip>
      );

      expect(screen.queryByText('Loading preview...')).not.toBeInTheDocument();
      expect(screen.queryByText('No messages')).not.toBeInTheDocument();
    });

    it('should have relative positioning wrapper', () => {
      const { container } = render(
        <MessagePreviewTooltip inboxId="inbox-1">
          <div>Inbox Item</div>
        </MessagePreviewTooltip>
      );

      expect(container.querySelector('.relative')).toBeInTheDocument();
    });
  });

  describe('mouse interactions', () => {
    it('should not call API immediately on hover', () => {
      render(
        <MessagePreviewTooltip inboxId="inbox-1">
          <div data-testid="child">Inbox Item</div>
        </MessagePreviewTooltip>
      );

      const wrapper = screen.getByTestId('child').parentElement!;
      fireEvent.mouseEnter(wrapper);

      // API should not be called immediately (waits 500ms)
      expect(api.getMessages).not.toHaveBeenCalled();
    });

    it('should handle mouse leave without errors', () => {
      render(
        <MessagePreviewTooltip inboxId="inbox-1">
          <div data-testid="child">Inbox Item</div>
        </MessagePreviewTooltip>
      );

      const wrapper = screen.getByTestId('child').parentElement!;

      // Hover and immediately leave
      fireEvent.mouseEnter(wrapper);
      fireEvent.mouseLeave(wrapper);

      // Should not throw and API not called
      expect(api.getMessages).not.toHaveBeenCalled();
    });
  });

  describe('props handling', () => {
    it('should accept inboxId prop', () => {
      const { container } = render(
        <MessagePreviewTooltip inboxId="test-inbox-123">
          <span>Test Content</span>
        </MessagePreviewTooltip>
      );

      expect(container).toBeTruthy();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render complex children', () => {
      render(
        <MessagePreviewTooltip inboxId="inbox-1">
          <div className="complex">
            <span data-testid="nested">Nested Content</span>
            <button>Click Me</button>
          </div>
        </MessagePreviewTooltip>
      );

      expect(screen.getByTestId('nested')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
    });
  });
});
