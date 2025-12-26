import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { PasskeyManager } from './PasskeyManager';
import { api } from '../../utils/api';

// Simple smoke test
vi.mock('../../utils/api', () => ({
    api: vi.fn(),
}));

vi.mock('@simplewebauthn/browser', () => ({
    startRegistration: vi.fn(),
}));

describe('PasskeyManager', () => {
    it('renders without crashing', () => {
        (api as any).mockResolvedValue([]);
        render(<PasskeyManager />);
        expect(screen.getByText(/Passkeys/)).toBeInTheDocument();
    });
});
