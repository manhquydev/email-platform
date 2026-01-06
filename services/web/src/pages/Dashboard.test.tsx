import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import { Dashboard } from "./Dashboard";
import { vi, describe, it, expect } from "vitest";

// Mock dependencies
vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        token: "fake-token",
        user: { id: "user-1", email: "test@example.com", role: "USER" },
        logout: vi.fn(),
    }),
}));

vi.mock("../utils/api", () => ({
    api: vi.fn().mockImplementation((path) => {
        if (path.includes("/domains")) return Promise.resolve({ data: [] });
        if (path.includes("/inboxes")) return Promise.resolve({ data: [] });
        return Promise.resolve({ data: [] });
    }),
    PAGE_SIZE: { domains: 20, inboxes: 20, messages: 20 },
    getFriendlyErrorMessage: (msg: string) => msg,
}));

// Mock child components to avoid deep rendering
vi.mock("../layouts/AppShell", () => ({
    AppShell: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="app-shell">
            <header data-testid="app-header">Header</header>
            {children}
        </div>
    ),
}));

vi.mock("../components/Sidebar", () => ({
    Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock("../components/QuickGenerateCard", () => ({
    QuickGenerateCard: () => <div data-testid="quick-generate">QuickGenerate</div>,
}));

describe("Dashboard Page", () => {
    it("renders dashboard layout correctly", async () => {
        render(
            <MemoryRouter>
                <ThemeProvider>
                    <Dashboard />
                </ThemeProvider>
            </MemoryRouter>
        );

        // Verify main layout components
        expect(screen.getByTestId("app-shell")).toBeInTheDocument();
        expect(screen.getByTestId("app-header")).toBeInTheDocument();

        // Wait for potential initial data fetch calls and verify Sidebar presence
        await waitFor(() => {
            expect(screen.getByTestId("sidebar")).toBeInTheDocument();
        });
    });
});
