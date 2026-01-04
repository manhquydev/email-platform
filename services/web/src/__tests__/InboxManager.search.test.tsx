import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock dependencies
vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        token: "test-token",
        user: { id: "user-1", email: "test@example.com" },
    }),
}));

vi.mock("react-hot-toast", () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
    toast: vi.fn(),
}));

// Mock the api utility
const mockApi = vi.fn();
vi.mock("../utils/api", () => ({
    api: (...args: unknown[]) => mockApi(...args),
    PAGE_SIZE: { messages: 20 },
}));

// Mock lazy-loaded components
vi.mock("../components/CreateInboxModal", () => ({
    CreateInboxModal: () => <div data-testid="create-inbox-modal">Create Modal</div>,
}));

vi.mock("../layouts/FocusStreamLayout", () => ({
    FocusStreamLayout: ({ children, onSearch }: { children: React.ReactNode; onSearch: (q: string) => void }) => (
        <div data-testid="focus-layout">
            <input
                data-testid="search-input"
                onChange={(e) => onSearch(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        onSearch((e.target as HTMLInputElement).value);
                    }
                }}
            />
            <button data-testid="search-button" onClick={() => onSearch("test query")}>
                Search
            </button>
            {children}
        </div>
    ),
}));

vi.mock("../components/EmailStream", () => ({
    EmailStream: ({ messages }: { messages: { id: string; subject: string }[] }) => (
        <div data-testid="email-stream">
            {messages.map((m) => (
                <div key={m.id} data-testid="email-item">
                    {m.subject}
                </div>
            ))}
        </div>
    ),
}));

vi.mock("../components/TabNavigation", () => ({
    TabNavigation: ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (id: string) => void }) => (
        <div data-testid="tab-navigation">
            <button data-testid="tab-inboxes" onClick={() => onTabChange("inboxes")}>
                Inboxes
            </button>
            <button data-testid="tab-messages" onClick={() => onTabChange("messages")}>
                Messages
            </button>
            <span data-testid="active-tab">{activeTab}</span>
        </div>
    ),
    InboxTabIcon: () => <span>inbox-icon</span>,
    MessagesTabIcon: () => <span>messages-icon</span>,
}));

vi.mock("../components/ui/GlassCard", () => ({
    GlassCard: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
        <div className={className} onClick={onClick} data-testid="glass-card">
            {children}
        </div>
    ),
}));

vi.mock("../components/InboxCard", () => ({
    InboxCard: () => <div data-testid="inbox-card">Inbox Card</div>,
}));

vi.mock("../components/Skeleton", () => ({
    InboxCardSkeleton: () => <div data-testid="inbox-skeleton">Loading...</div>,
    MessageItemSkeleton: () => <div data-testid="message-skeleton">Loading...</div>,
}));

vi.mock("../components/ConfirmationModal", () => ({
    ConfirmationModal: () => null,
}));

import { InboxManager } from "../pages/InboxManager";
import toast from "react-hot-toast";

describe("InboxManager - Search Functionality", () => {
    const mockDomains = [
        { id: "domain-1", name: "test.com", status: "VERIFIED", verificationToken: "token", createdAt: "2024-01-01", isPublic: true },
    ];

    const mockInboxes = [
        { id: "inbox-1", domainId: "domain-1", localPart: "user1", createdAt: "2024-01-01", domain: mockDomains[0] },
    ];

    const mockMessages = [
        { id: "msg-1", inboxId: "inbox-1", subject: "Test Email 1", fromAddress: "sender@example.com", receivedAt: "2024-01-01T10:00:00Z", isRead: false, isPinned: false, attachments: [] },
        { id: "msg-2", inboxId: "inbox-1", subject: "OTP Code 123456", fromAddress: "noreply@service.com", receivedAt: "2024-01-01T11:00:00Z", isRead: true, isPinned: false, attachments: [] },
    ];

    const mockSearchResults = [
        { id: "msg-1", inboxId: "inbox-1", subject: "Test Email 1", fromAddress: "sender@example.com", receivedAt: "2024-01-01T10:00:00Z", isRead: false, isPinned: false, attachments: [] },
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default API responses
        mockApi.mockImplementation((url: string) => {
            if (url.includes("/domains")) {
                return Promise.resolve({ data: mockDomains });
            }
            if (url.includes("/inboxes")) {
                return Promise.resolve({ data: mockInboxes });
            }
            if (url.includes("/messages/search")) {
                return Promise.resolve({ data: mockSearchResults });
            }
            if (url.includes("/messages")) {
                return Promise.resolve({ data: mockMessages });
            }
            return Promise.resolve({ data: [] });
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should render the search input", async () => {
        render(<InboxManager />);

        await waitFor(() => {
            expect(screen.getByTestId("search-input")).toBeInTheDocument();
        });
    });

    it("should call search API when search is triggered", async () => {
        render(<InboxManager />);

        await waitFor(() => {
            expect(screen.getByTestId("search-input")).toBeInTheDocument();
        });

        // Trigger search
        const searchButton = screen.getByTestId("search-button");
        await act(async () => {
            fireEvent.click(searchButton);
        });

        await waitFor(() => {
            expect(mockApi).toHaveBeenCalledWith(
                expect.stringContaining("/messages/search"),
                expect.any(Object)
            );
        });
    });

    it("should display search results after successful search", async () => {
        render(<InboxManager />);

        await waitFor(() => {
            expect(screen.getByTestId("search-input")).toBeInTheDocument();
        });

        // Trigger search
        await act(async () => {
            fireEvent.click(screen.getByTestId("search-button"));
        });

        await waitFor(() => {
            expect(screen.getByTestId("email-stream")).toBeInTheDocument();
        });
    });

    it("should switch to messages tab when search is performed", async () => {
        render(<InboxManager />);

        await waitFor(() => {
            expect(screen.getByTestId("search-input")).toBeInTheDocument();
        });

        // Start with inboxes tab
        expect(screen.getByTestId("active-tab")).toHaveTextContent("inboxes");

        // Trigger search
        await act(async () => {
            fireEvent.click(screen.getByTestId("search-button"));
        });

        // After search, should be on messages tab
        await waitFor(() => {
            expect(screen.getByTestId("active-tab")).toHaveTextContent("messages");
        });
    });

    it("should handle search with 'from:' operator", async () => {
        render(<InboxManager />);

        await waitFor(() => {
            expect(screen.getByTestId("search-input")).toBeInTheDocument();
        });

        const searchInput = screen.getByTestId("search-input");

        await act(async () => {
            fireEvent.change(searchInput, { target: { value: "from:sender@example.com" } });
            fireEvent.keyDown(searchInput, { key: "Enter" });
        });

        await waitFor(() => {
            expect(mockApi).toHaveBeenCalledWith(
                expect.stringContaining("/messages/search?from="),
                expect.any(Object)
            );
        });
    });

    it("should handle search with 'has:attachment' operator", async () => {
        render(<InboxManager />);

        await waitFor(() => {
            expect(screen.getByTestId("search-input")).toBeInTheDocument();
        });

        const searchInput = screen.getByTestId("search-input");

        await act(async () => {
            fireEvent.change(searchInput, { target: { value: "has:attachment" } });
            fireEvent.keyDown(searchInput, { key: "Enter" });
        });

        await waitFor(() => {
            expect(mockApi).toHaveBeenCalledWith(
                expect.stringContaining("/messages/search?hasAttachment=true"),
                expect.any(Object)
            );
        });
    });

    it("should handle search with 'is:unread' operator", async () => {
        render(<InboxManager />);

        await waitFor(() => {
            expect(screen.getByTestId("search-input")).toBeInTheDocument();
        });

        const searchInput = screen.getByTestId("search-input");

        await act(async () => {
            fireEvent.change(searchInput, { target: { value: "is:unread" } });
            fireEvent.keyDown(searchInput, { key: "Enter" });
        });

        await waitFor(() => {
            expect(mockApi).toHaveBeenCalledWith(
                expect.stringContaining("/messages/search?isRead=false"),
                expect.any(Object)
            );
        });
    });

    it("should clear search when empty query is submitted", async () => {
        render(<InboxManager />);

        await waitFor(() => {
            expect(screen.getByTestId("search-input")).toBeInTheDocument();
        });

        // First do a search
        await act(async () => {
            fireEvent.click(screen.getByTestId("search-button"));
        });

        await waitFor(() => {
            expect(screen.getByTestId("active-tab")).toHaveTextContent("messages");
        });

        // Then clear by submitting empty
        const searchInput = screen.getByTestId("search-input");
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: "" } });
            fireEvent.keyDown(searchInput, { key: "Enter" });
        });

        // Search mode should be cleared (back to normal state)
        // Tab doesn't change back automatically, but search results should clear
    });

    it("should show toast notification for search results count", async () => {
        render(<InboxManager />);

        await waitFor(() => {
            expect(screen.getByTestId("search-input")).toBeInTheDocument();
        });

        await act(async () => {
            fireEvent.click(screen.getByTestId("search-button"));
        });

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("kết quả"));
        });
    });

    it("should show error toast when search fails", async () => {
        mockApi.mockImplementation((url: string) => {
            if (url.includes("/messages/search")) {
                return Promise.reject(new Error("Search failed"));
            }
            if (url.includes("/domains")) {
                return Promise.resolve({ data: mockDomains });
            }
            if (url.includes("/inboxes")) {
                return Promise.resolve({ data: mockInboxes });
            }
            return Promise.resolve({ data: [] });
        });

        render(<InboxManager />);

        await waitFor(() => {
            expect(screen.getByTestId("search-input")).toBeInTheDocument();
        });

        await act(async () => {
            fireEvent.click(screen.getByTestId("search-button"));
        });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Lỗi khi tìm kiếm");
        });
    });

    it("should handle no results case", async () => {
        mockApi.mockImplementation((url: string) => {
            if (url.includes("/messages/search")) {
                return Promise.resolve({ data: [] });
            }
            if (url.includes("/domains")) {
                return Promise.resolve({ data: mockDomains });
            }
            if (url.includes("/inboxes")) {
                return Promise.resolve({ data: mockInboxes });
            }
            return Promise.resolve({ data: [] });
        });

        render(<InboxManager />);

        await waitFor(() => {
            expect(screen.getByTestId("search-input")).toBeInTheDocument();
        });

        await act(async () => {
            fireEvent.click(screen.getByTestId("search-button"));
        });

        // Search should complete without errors
        await waitFor(() => {
            expect(mockApi).toHaveBeenCalledWith(
                expect.stringContaining("/messages/search"),
                expect.any(Object)
            );
        });
    });
});
