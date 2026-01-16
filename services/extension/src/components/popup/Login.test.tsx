/**
 * Unit tests for Login component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';

// Mock the api module
vi.mock('../../shared/api', () => ({
  api: {
    login: vi.fn(),
    verify2FA: vi.fn(),
    createAnonymousInbox: vi.fn(),
  },
}));

// Mock analytics
vi.mock('../../shared/analytics', () => ({
  analytics: {
    track: vi.fn(),
  },
}));

// Mock config
vi.mock('../../shared/config', () => ({
  CONFIG: {
    WEB_URL: 'https://test-app.example.com',
  },
}));

import { api } from '../../shared/api';
import { analytics } from '../../shared/analytics';

describe('Login', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render login form with email and password fields', () => {
      render(<Login onSuccess={mockOnSuccess} />);

      expect(screen.getByPlaceholderText('name@domain.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render anonymous login button', () => {
      render(<Login onSuccess={mockOnSuccess} />);

      expect(screen.getByRole('button', { name: /go anonymous/i })).toBeInTheDocument();
    });

    it('should render create account link', () => {
      render(<Login onSuccess={mockOnSuccess} />);

      const link = screen.getByRole('link', { name: /create account/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://test-app.example.com/register');
    });

    it('should render Ephemera branding', () => {
      render(<Login onSuccess={mockOnSuccess} />);

      expect(screen.getByText('Ephemera')).toBeInTheDocument();
    });
  });

  describe('login flow', () => {
    it('should call api.login with entered credentials', async () => {
      const mockUser = { id: '1', email: 'test@test.com', role: 'USER' };
      (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: 'jwt123',
        user: mockUser,
      });

      render(<Login onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByPlaceholderText('name@domain.com'), 'test@test.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(api.login).toHaveBeenCalledWith('test@test.com', 'password123');
      });
    });

    it('should call onSuccess after successful login', async () => {
      (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: 'jwt123',
        user: { id: '1' },
      });

      render(<Login onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByPlaceholderText('name@domain.com'), 'test@test.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should track login success event', async () => {
      (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: 'jwt123',
        user: { id: '1' },
      });

      render(<Login onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByPlaceholderText('name@domain.com'), 'test@test.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(analytics.track).toHaveBeenCalledWith('login_success', { method: 'password' });
      });
    });

    it('should display error message on login failure', async () => {
      (api.login as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid credentials'));

      render(<Login onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByPlaceholderText('name@domain.com'), 'test@test.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('should show loading state during login', async () => {
      // Make login hang
      (api.login as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );

      render(<Login onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByPlaceholderText('name@domain.com'), 'test@test.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Button should be disabled during loading
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    });
  });

  describe('2FA flow', () => {
    it('should show 2FA form when required', async () => {
      (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        requires2FA: true,
        tempToken: 'temp123',
      });

      render(<Login onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByPlaceholderText('name@domain.com'), 'test@test.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Security Check')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });
    });

    it('should verify 2FA code', async () => {
      (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        requires2FA: true,
        tempToken: 'temp123',
      });
      (api.verify2FA as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: 'jwt-after-2fa',
        user: { id: '1' },
      });

      render(<Login onSuccess={mockOnSuccess} />);

      // First login
      await userEvent.type(screen.getByPlaceholderText('name@domain.com'), 'test@test.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for 2FA form
      await waitFor(() => {
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });

      // Enter 2FA code
      await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
      await userEvent.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(api.verify2FA).toHaveBeenCalledWith('temp123', '123456');
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should allow going back to login from 2FA', async () => {
      (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        requires2FA: true,
        tempToken: 'temp123',
      });

      render(<Login onSuccess={mockOnSuccess} />);

      await userEvent.type(screen.getByPlaceholderText('name@domain.com'), 'test@test.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Security Check')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /back to login/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('name@domain.com')).toBeInTheDocument();
      });
    });
  });

  describe('anonymous login', () => {
    it('should create anonymous inbox on anonymous button click', async () => {
      (api.createAnonymousInbox as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        inbox: { id: 'anon-inbox' },
      });

      render(<Login onSuccess={mockOnSuccess} />);

      await userEvent.click(screen.getByRole('button', { name: /go anonymous/i }));

      await waitFor(() => {
        expect(api.createAnonymousInbox).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should track anonymous inbox creation', async () => {
      (api.createAnonymousInbox as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        inbox: { id: 'anon-inbox' },
      });

      render(<Login onSuccess={mockOnSuccess} />);

      await userEvent.click(screen.getByRole('button', { name: /go anonymous/i }));

      await waitFor(() => {
        expect(analytics.track).toHaveBeenCalledWith('inbox_created_anonymous');
      });
    });

    it('should show error on anonymous login failure', async () => {
      (api.createAnonymousInbox as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to create anonymous inbox')
      );

      render(<Login onSuccess={mockOnSuccess} />);

      await userEvent.click(screen.getByRole('button', { name: /go anonymous/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to create anonymous inbox')).toBeInTheDocument();
      });
    });
  });

  describe('form validation', () => {
    it('should require email field', async () => {
      render(<Login onSuccess={mockOnSuccess} />);

      const emailInput = screen.getByPlaceholderText('name@domain.com');
      expect(emailInput).toBeRequired();
    });

    it('should require password field', async () => {
      render(<Login onSuccess={mockOnSuccess} />);

      const passwordInput = screen.getByPlaceholderText('••••••••');
      expect(passwordInput).toBeRequired();
    });
  });
});
