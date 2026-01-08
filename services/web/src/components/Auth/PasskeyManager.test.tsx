import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { PasskeyManager } from './PasskeyManager';
import { api } from '../../utils/api';

// Simple smoke test
vi.mock('../../utils/api', () => ({
    api: vi.fn(),
}));

vi.mock('@simplewebauthn/browser', () => ({
    startRegistration: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: '1', email: 'test@example.com' },
        token: 'test-token',
    }),
}));

describe('PasskeyManager', () => {
    it('renders without crashing', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api as any).mockResolvedValue([]);
        render(<PasskeyManager />);
        expect(screen.getByText('Thêm Passkey mới')).toBeInTheDocument();
    });
});
