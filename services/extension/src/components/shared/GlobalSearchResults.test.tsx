/**
 * Unit tests for GlobalSearchResults component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GlobalSearchResults from './GlobalSearchResults';
import { Message } from '../../shared/types';

// Mock i18n
vi.mock('../../shared/i18n', () => ({
  t: vi.fn((key: string) => {
    const translations: Record<string, string> = {
      loading: 'Loading',
      noSearchResults: 'No results found',
      searchResultsCount: 'results',
    };
    return translations[key] || key;
  }),
}));

describe('GlobalSearchResults', () => {
  const mockOnSelectMessage = vi.fn();

  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      from: 'sender1@example.com',
      to: 'inbox@ephemera.com',
      subject: 'Test Subject 1',
      textBody: 'Test body content 1',
      htmlBody: '<p>Test body content 1</p>',
      receivedAt: '2026-01-30T10:00:00Z',
      createdAt: '2026-01-30T10:00:00Z',
      isRead: false,
      inboxId: 'inbox-1',
    },
    {
      id: 'msg-2',
      from: 'sender2@example.com',
      to: 'inbox@ephemera.com',
      subject: 'Test Subject 2',
      textBody: 'Test body content 2',
      htmlBody: '<p>Test body content 2</p>',
      receivedAt: '2026-01-29T15:30:00Z',
      createdAt: '2026-01-29T15:30:00Z',
      isRead: true,
      inboxId: 'inbox-2',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should display loading spinner when loading', () => {
      render(
        <GlobalSearchResults
          results={[]}
          loading={true}
          onSelectMessage={mockOnSelectMessage}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should display no results message when empty', () => {
      render(
        <GlobalSearchResults
          results={[]}
          loading={false}
          onSelectMessage={mockOnSelectMessage}
        />
      );

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  describe('results display', () => {
    it('should display result count', () => {
      render(
        <GlobalSearchResults
          results={mockMessages}
          loading={false}
          onSelectMessage={mockOnSelectMessage}
        />
      );

      expect(screen.getByText('2 results')).toBeInTheDocument();
    });

    it('should display message sender', () => {
      render(
        <GlobalSearchResults
          results={mockMessages}
          loading={false}
          onSelectMessage={mockOnSelectMessage}
        />
      );

      expect(screen.getByText('sender1@example.com')).toBeInTheDocument();
      expect(screen.getByText('sender2@example.com')).toBeInTheDocument();
    });

    it('should display message subject', () => {
      render(
        <GlobalSearchResults
          results={mockMessages}
          loading={false}
          onSelectMessage={mockOnSelectMessage}
        />
      );

      expect(screen.getByText('Test Subject 1')).toBeInTheDocument();
      expect(screen.getByText('Test Subject 2')).toBeInTheDocument();
    });

    it('should display (No Subject) for empty subjects', () => {
      const messagesWithNoSubject: Message[] = [
        {
          ...mockMessages[0],
          subject: '',
        },
      ];

      render(
        <GlobalSearchResults
          results={messagesWithNoSubject}
          loading={false}
          onSelectMessage={mockOnSelectMessage}
        />
      );

      expect(screen.getByText('(No Subject)')).toBeInTheDocument();
    });

    it('should display sender initial avatar', () => {
      render(
        <GlobalSearchResults
          results={mockMessages}
          loading={false}
          onSelectMessage={mockOnSelectMessage}
        />
      );

      // First letter of sender email - use getAllByText since there are multiple
      const avatars = screen.getAllByText('S');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('unread styling', () => {
    it('should apply different styling for unread messages', () => {
      render(
        <GlobalSearchResults
          results={mockMessages}
          loading={false}
          onSelectMessage={mockOnSelectMessage}
        />
      );

      // Unread message (first one) should have bold styling
      const unreadSender = screen.getByText('sender1@example.com');
      expect(unreadSender).toHaveClass('font-bold');

      // Read message (second one) should have normal styling
      const readSender = screen.getByText('sender2@example.com');
      expect(readSender).toHaveClass('font-medium');
    });
  });

  describe('click handling', () => {
    it('should call onSelectMessage when result clicked', () => {
      render(
        <GlobalSearchResults
          results={mockMessages}
          loading={false}
          onSelectMessage={mockOnSelectMessage}
        />
      );

      const firstResult = screen.getByText('Test Subject 1').closest('div[class*="cursor-pointer"]');
      if (firstResult) {
        fireEvent.click(firstResult);
        expect(mockOnSelectMessage).toHaveBeenCalledWith(mockMessages[0]);
      }
    });
  });
});
