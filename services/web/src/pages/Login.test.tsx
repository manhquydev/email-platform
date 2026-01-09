import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Login } from "./Login";
import { vi, describe, it, expect } from "vitest";

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
    };
});

// Mock AuthContext
vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        login: vi.fn(),
        verify2FA: vi.fn(),
        token: null,
        busy: false,
    }),
}));

// Mock API
vi.mock("../utils/api", () => ({
    api: vi.fn(),
}));

// Mock PasskeyLogin
vi.mock("../components/Auth/PasskeyLogin", () => ({
    PasskeyLogin: () => <div data-testid="passkey-login">Passkey Login</div>,
}));

// Mock UI components
vi.mock("../components/ui/GlassCard", () => ({
    GlassCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div className={className} data-testid="glass-card">
            {children}
        </div>
    ),
}));

vi.mock("../components/ui/Button", () => ({
    Button: ({ children, type, className, isLoading, disabled, onClick }: {
        children: React.ReactNode;
        type?: string;
        className?: string;
        isLoading?: boolean;
        disabled?: boolean;
        onClick?: () => void;
    }) => (
        <button
            type={type as "button" | "submit" | "reset" | undefined}
            className={className}
            disabled={disabled || isLoading}
            onClick={onClick}
        >
            {isLoading ? "Loading..." : children}
        </button>
    ),
}));

vi.mock("../components/ui/Input", () => ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Input: ({ label, type, value, onChange, placeholder, disabled, required, autoFocus, className: _className, icon: _icon }: {
        label?: string;
        type?: string;
        value?: string;
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        disabled?: boolean;
        required?: boolean;
        autoFocus?: boolean;
        className?: string;
        icon?: React.ReactNode;
    }) => (
        <div>
            {label && <label>{label}</label>}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                autoFocus={autoFocus}
            />
        </div>
    ),
}));

describe("Login Page", () => {
    it("renders login form correctly", () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        // Check for main title
        expect(screen.getByText("Chào mừng trở lại")).toBeInTheDocument();

        // Check for password label - use getAllByText since "Mật khẩu" appears in multiple places
        const matKhauElements = screen.getAllByText("Mật khẩu");
        expect(matKhauElements.length).toBeGreaterThanOrEqual(1);

        // Check for inputs in password mode
        expect(screen.getByText("Email")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();

        // Check for button
        expect(screen.getByText("Đăng nhập")).toBeInTheDocument();
    });
});
