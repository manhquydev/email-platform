import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

// Mock Realtime Context
vi.mock("../hooks/useRealtimeContext", () => ({
    useRealtimeContext: () => ({
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        isConnected: true,
        status: "connected",
    }),
    useRealtimeSubscription: vi.fn(),
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

vi.mock("../components/InboxSelector", () => ({
    InboxSelector: () => <div data-testid="inbox-selector">InboxSelector</div>,
}));

vi.mock("../components/EmailStream", () => ({
    EmailStream: () => <div data-testid="email-stream">EmailStream</div>,
}));

describe("Dashboard Page", () => {
    it("redirects legacy /app/inbox route to /app/manager", () => {
        render(
            <MemoryRouter initialEntries={["/app/inbox"]}>
                <ThemeProvider>
                    <Routes>
                        <Route path="/app/inbox" element={<Dashboard />} />
                        <Route path="/app/manager" element={<div data-testid="manager-page">Manager</div>} />
                    </Routes>
                </ThemeProvider>
            </MemoryRouter>
        );

        expect(screen.getByTestId("manager-page")).toBeInTheDocument();
    });
});
