/**
 * Unit tests for InboxList component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InboxList from './InboxList';

// Mock dependencies
vi.mock('../../shared/api', () => ({
  api: {
    getDashboard: vi.fn(),
    createQuickInbox: vi.fn(),
    createCustomInbox: vi.fn(),
    updateInbox: vi.fn(),
    deleteInbox: vi.fn(),
  },
}));

vi.mock('../../shared/storage', () => ({
  storage: {
    setInboxes: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ autoCopy: true }),
  },
}));

vi.mock('../../shared/analytics', () => ({
  analytics: {
    track: vi.fn(),
  },
}));

vi.mock('../../shared/config', () => ({
  CONFIG: {
    WEB_URL: 'https://test-app.example.com',
  },
}));

vi.mock('../shared/CreateInboxModal', () => ({
  default: ({ isOpen, onClose, onCreateRandom }: any) =>
    isOpen ? (
      <div data-testid="create-inbox-modal">
        <button onClick={onCreateRandom}>Create Random</button>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

vi.mock('../shared/QRCodeModal', () => ({
  default: ({ isOpen, email }: any) =>
    isOpen ? <div data-testid="qr-modal">QR for {email}</div> : null,
}));

import { api } from '../../shared/api';
import { storage } from '../../shared/storage';
import { analytics } from '../../shared/analytics';

const mockDashboardData = {
  user: { id: '1', tier: 'FREE' },
  stats: { totalInboxes: 2, totalUnread: 5 },
  inboxes: [
    {
      id: 'inbox-1',
      address: 'test1@example.com',
      localPart: 'test1',
      domain: 'example.com',
      unreadCount: 3,
      createdAt: '2026-01-15T00:00:00Z',
      expiresAt: null,
    },
    {
      id: 'inbox-2',
      address: 'test2@example.com',
      localPart: 'test2',
      domain: 'example.com',
      unreadCount: 2,
      createdAt: '2026-01-15T00:00:00Z',
      expiresAt: '2026-01-20T00:00:00Z',
    },
  ],
};

describe('InboxList', () => {
  const mockOnSelectInbox = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (api.getDashboard as ReturnType<typeof vi.fn>).mockResolvedValue(mockDashboardData);
  });

  describe('rendering', () => {
    it('should show loading spinner initially', () => {
      // Make getDashboard hang
      (api.getDashboard as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );

      render(<InboxList onSelectInbox={mockOnSelectInbox} />);

      // Should show loader
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should render inbox list after loading', async () => {
      render(<InboxList onSelectInbox={mockOnSelectInbox} />);

      await waitFor(() => {
        expect(screen.getByText('Active Inboxes')).toBeInTheDocument();
      });

      expect(screen.getByText('test1')).toBeInTheDocument();
      expect(screen.getByText('test2')).toBeInTheDocument();
    });

    it('should display usage stats', async () => {
      render(<InboxList onSelectInbox={mockOnSelectInbox} />);

      await waitFor(() => {
        expect(screen.getByText(/2\/5/)).toBeInTheDocument();
      });
    });

    it('should show create new inbox button', async () => {
      render(<InboxList onSelectInbox={mockOnSelectInbox} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create new inbox/i })).toBeInTheDocument();
      });
    });

    it('should show empty state when no inboxes', async () => {
      (api.getDashboard as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockDashboardData,
        inboxes: [],
        stats: { totalInboxes: 0, totalUnread: 0 },
      });

      render(<InboxList onSelectInbox={mockOnSelectInbox} />);

      await waitFor(() => {
        expect(screen.getByText('No inboxes yet')).toBeInTheDocument();
      });
    });
  });

  describe('inbox creation', () => {
    it('should open create modal on button click', async () => {
      render(<InboxList onSelectInbox={mockOnSelectInbox} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create new inbox/i })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /create new inbox/i }));

      expect(screen.getByTestId('create-inbox-modal')).toBeInTheDocument();
    });

    it('should create inbox when confirmed in modal', async () => {
      const newInbox = {
        id: 'inbox-3',
        localPart: 'newinbox',
        domain: { name: 'example.com' },
        createdAt: '2026-01-16T00:00:00Z',
        expiresAt: null,
      };
      (api.createQuickInbox as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        inbox: newInbox,
      });

      render(<InboxList onSelectInbox={mockOnSelectInbox} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create new inbox/i })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /create new inbox/i }));
      await userEvent.click(screen.getByText('Create Random'));

      await waitFor(() => {
        expect(api.createQuickInbox).toHaveBeenCalled();
        expect(analytics.track).toHaveBeenCalledWith('inbox_created_manual');
      });
    });
  });

  describe('inbox selection', () => {
    it('should call onSelectInbox when View Messages clicked', async () => {
      render(<InboxList onSelectInbox={mockOnSelectInbox} />);

      await waitFor(() => {
        expect(screen.getByText('test1')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByText('View Messages');
      await userEvent.click(viewButtons[0]);

      expect(mockOnSelectInbox).toHaveBeenCalledWith('inbox-1', 'test1@example.com');
    });

    it('should track message viewed event', async () => {
      render(<InboxList onSelectInbox={mockOnSelectInbox} />);

      await waitFor(() => {
        expect(screen.getByText('test1')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByText('View Messages');
      await userEvent.click(viewButtons[0]);

      expect(analytics.track).toHaveBeenCalledWith('message_viewed', { context: 'inbox_list_item' });
    });
  });

  describe('refresh', () => {
    it('should refetch inboxes on refresh button click', async () => {
      render(<InboxList onSelectInbox={mockOnSelectInbox} />);

      await waitFor(() => {
        expect(screen.getByText('test1')).toBeInTheDocument();
      });

      // Clear and setup new mock data
      vi.clearAllMocks();
      (api.getDashboard as ReturnType<typeof vi.fn>).mockResolvedValue(mockDashboardData);

      const refreshButton = screen.getByTitle('Refresh');
      await userEvent.click(refreshButton);

      await waitFor(() => {
        expect(api.getDashboard).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should display error message on fetch failure', async () => {
      (api.getDashboard as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      render(<InboxList onSelectInbox={mockOnSelectInbox} />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('inbox actions', () => {
    it('should open dashboard link in new tab', async () => {
      render(<InboxList onSelectInbox={mockOnSelectInbox} />);

      await waitFor(() => {
        expect(screen.getByText('test1')).toBeInTheDocument();
      });

      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks[0].closest('a')).toHaveAttribute(
        'href',
        'https://test-app.example.com/inbox/inbox-1'
      );
      expect(dashboardLinks[0].closest('a')).toHaveAttribute('target', '_blank');
    });
  });

  describe('storage sync', () => {
    it('should sync inboxes to storage after fetch', async () => {
      render(<InboxList onSelectInbox={mockOnSelectInbox} />);

      await waitFor(() => {
        expect(storage.setInboxes).toHaveBeenCalledWith(mockDashboardData.inboxes);
      });
    });
  });
});
