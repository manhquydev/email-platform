
import { render, screen, waitFor } from "@testing-library/react";
import { Dashboard } from "./Dashboard";
import { vi } from "vitest";

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
vi.mock("../components/Sidebar", () => ({
    Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock("../components/MessageList", () => ({
    MessageList: () => <div data-testid="message-list">MessageList</div>,
}));

vi.mock("../components/MessageDetail", () => ({
    MessageDetail: () => <div data-testid="message-detail">MessageDetail</div>,
}));

vi.mock("../components/AppHeader", () => ({
    AppHeader: () => <div data-testid="app-header">AppHeader</div>,
}));

vi.mock("../components/CategoryTabs", () => ({
    CategoryTabs: () => <div data-testid="category-tabs">CategoryTabs</div>,
    useCategoryFilter: () => ({ activeCategory: "all", setActiveCategory: vi.fn(), filteredMessages: [] }),
}));

vi.mock("../components/ConversationView", () => ({
    useConversationMode: () => ({ isConversationMode: false, toggleMode: vi.fn() }),
}));

vi.mock("../components/MobileNavigation", () => ({
    MobileNavigation: () => <div data-testid="mobile-nav">MobileNavigation</div>,
}));

describe("Dashboard Page", () => {
    it("renders dashboard layout correctly", async () => {
        render(<Dashboard />);

        // Verify main layout components
        expect(screen.getByTestId("app-header")).toBeInTheDocument();
        expect(screen.getByTestId("sidebar")).toBeInTheDocument();
        expect(screen.getByTestId("message-list")).toBeInTheDocument();
        expect(screen.getByTestId("message-detail")).toBeInTheDocument();

        // Wait for potential initial data fetch calls (though mocked)
        await waitFor(() => {
            expect(screen.getByTestId("sidebar")).toBeInTheDocument();
        });
    });
});
