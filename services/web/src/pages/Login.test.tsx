import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import { Login } from "./Login";
import { vi } from "vitest";

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

// Mock Navigation component since it might use Router hooks
vi.mock("../components/Navigation", () => ({
    Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

describe("Login Page", () => {
    it("renders login form correctly", () => {
        render(
            <MemoryRouter>
                <ThemeProvider>
                    <Login />
                </ThemeProvider>
            </MemoryRouter>
        );

        // Check for main title
        expect(screen.getByText("Chào mừng trở lại")).toBeInTheDocument();

        // Check for inputs
        expect(screen.getByText("Email")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();

        expect(screen.getByText("Mật khẩu")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();

        // Check for button
        expect(screen.getByRole("button", { name: /Đăng nhập/i })).toBeInTheDocument();
    });
});
