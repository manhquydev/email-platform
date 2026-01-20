/**
 * Component tests for Settings.tsx
 * Tests user settings panel including theme, notifications, and logout
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from './Settings';

// Mock dependencies
vi.mock('../../shared/api', () => ({
  api: {
    getMe: vi.fn().mockResolvedValue({
      user: { id: '1', email: 'test@example.com', role: 'USER', tier: 'FREE' },
    }),
  },
}));

vi.mock('../../shared/storage', () => ({
  storage: {
    getAuth: vi.fn().mockResolvedValue({
      token: 'test-token',
      user: { id: '1', email: 'test@example.com', role: 'USER', tier: 'PRO' },
      isAuthenticated: true,
    }),
    getSettings: vi.fn().mockResolvedValue({
      autoCopy: true,
      theme: 'system',
    }),
    updateSettings: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../shared/analytics', () => ({
  analytics: {
    track: vi.fn(),
  },
}));

vi.mock('../../shared/push-subscription', () => ({
  subscribeToPush: vi.fn().mockResolvedValue(true),
  unsubscribeFromPush: vi.fn().mockResolvedValue(undefined),
  isPushSubscribed: vi.fn().mockResolvedValue(false),
}));

vi.mock('../../shared/config', () => ({
  CONFIG: {
    WEB_URL: 'https://app.ephemera.test',
    API_URL: 'https://api.ephemera.test',
  },
}));

describe('Settings', () => {
  const mockOnBack = vi.fn();
  const mockOnLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render settings header', async () => {
    render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should display back button', async () => {
    render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

    const backButton = screen.getByRole('button', { name: '' });
    expect(backButton).toBeInTheDocument();
  });

  it('should call onBack when back button is clicked', async () => {
    render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

    const buttons = screen.getAllByRole('button');
    const backButton = buttons[0]; // First button is back
    await userEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('should display user email', async () => {
    render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('should display user tier badge', async () => {
    render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('PRO')).toBeInTheDocument();
    });
  });

  describe('Theme Selection', () => {
    it('should display all theme options', async () => {
      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('should update theme when option is clicked', async () => {
      const { storage } = await import('../../shared/storage');
      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      const darkButton = screen.getByText('Dark');
      await userEvent.click(darkButton);

      expect(storage.updateSettings).toHaveBeenCalledWith({ theme: 'dark' });
    });
  });

  describe('Preferences', () => {
    it('should display Push Notifications toggle', async () => {
      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      expect(screen.getByText('Push Notifications')).toBeInTheDocument();
      expect(screen.getByText('Get alerted for new messages')).toBeInTheDocument();
    });

    it('should display Auto-copy toggle', async () => {
      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      expect(screen.getByText('Auto-copy Address')).toBeInTheDocument();
      expect(screen.getByText('Copy on creation')).toBeInTheDocument();
    });

    it('should toggle auto-copy setting', async () => {
      const { storage } = await import('../../shared/storage');
      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      // Find the auto-copy button by its text content
      const autoCopyButton = screen.getByText('Auto-copy Address').closest('button');
      if (autoCopyButton) {
        await userEvent.click(autoCopyButton);
        expect(storage.updateSettings).toHaveBeenCalledWith({ autoCopy: false });
      }
    });
  });

  describe('Share & Invite', () => {
    it('should display share button', async () => {
      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      expect(screen.getByText('Share Ephemera')).toBeInTheDocument();
      expect(screen.getByText('Invite friends to try Ephemera')).toBeInTheDocument();
    });

    it('should copy referral link when share button is clicked', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      const shareButton = screen.getByText('Share Ephemera').closest('button');
      if (shareButton) {
        await userEvent.click(shareButton);

        await waitFor(() => {
          expect(writeTextMock).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Support & Legal Links', () => {
    it('should display Main Dashboard link', async () => {
      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      expect(screen.getByText('Main Dashboard')).toBeInTheDocument();
    });

    it('should display Privacy & Terms link', async () => {
      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      expect(screen.getByText('Privacy & Terms')).toBeInTheDocument();
    });

    it('should have correct href for dashboard link', async () => {
      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      const dashboardLink = screen.getByText('Main Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', 'https://app.ephemera.test/dashboard');
    });
  });

  describe('Logout', () => {
    it('should display sign out button', async () => {
      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should call onLogout when sign out is clicked', async () => {
      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      const logoutButton = screen.getByText('Sign Out').closest('button');
      if (logoutButton) {
        await userEvent.click(logoutButton);
        expect(mockOnLogout).toHaveBeenCalledTimes(1);
      }
    });

    it('should track logout analytics', async () => {
      const { analytics } = await import('../../shared/analytics');
      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      const logoutButton = screen.getByText('Sign Out').closest('button');
      if (logoutButton) {
        await userEvent.click(logoutButton);
        expect(analytics.track).toHaveBeenCalledWith('logout');
      }
    });
  });

  describe('Version Display', () => {
    it('should display version number', async () => {
      render(<Settings onBack={mockOnBack} onLogout={mockOnLogout} />);

      expect(screen.getByText(/Ephemera Engine v0\.1\.0/i)).toBeInTheDocument();
    });
  });
});
