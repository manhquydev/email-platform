import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { InboxManager } from "../pages/InboxManager";
import toast from "react-hot-toast";

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

// Mock child components
vi.mock("../components/CreateInboxModal", () => ({
    CreateInboxModal: () => <div data-testid="create-inbox-modal">Create Modal</div>,
}));

vi.mock("../components/TransferInboxModal", () => ({
    TransferInboxModal: ({ onTransferComplete, onClose }: { onTransferComplete: () => void; onClose: () => void }) => (
        <div data-testid="transfer-inbox-modal">
            <button data-testid="confirm-transfer-btn" onClick={onTransferComplete}>Confirm Transfer</button>
            <button data-testid="cancel-transfer-btn" onClick={onClose}>Cancel Transfer</button>
        </div>
    ),
}));

vi.mock("../layouts/FocusStreamLayout", () => ({
    FocusStreamLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="focus-layout">{children}</div>,
}));

vi.mock("../components/EmailStream", () => ({
    EmailStream: () => <div data-testid="email-stream">Email Stream</div>,
}));

vi.mock("../components/TabNavigation", () => ({
    TabNavigation: ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (id: string) => void }) => (
        <div data-testid="tab-navigation">
            <button data-testid="tab-inboxes" onClick={() => onTabChange("inboxes")}>Inboxes</button>
            <button data-testid="tab-messages" onClick={() => onTabChange("messages")}>Messages</button>
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
    // Mocking render behavior to expose internal actions for testing
    InboxCard: ({ inbox, isSelected, onSelect, onToggleSelect, onDelete, onTransfer, onViewMessages }: any) => (
        <div data-testid={`inbox-card-${inbox.id}`} className={isSelected ? "selected" : ""}>
            <span data-testid={`inbox-email-${inbox.id}`}>{inbox.localPart}@{inbox.domain.name}</span>
            <button data-testid={`select-btn-${inbox.id}`} onClick={onSelect}>Select</button>
            <button data-testid={`view-msg-btn-${inbox.id}`} onClick={onViewMessages}>View Messages</button>
            <button data-testid={`toggle-select-btn-${inbox.id}`} onClick={onToggleSelect}>Toggle Select</button>
            <button data-testid={`delete-btn-${inbox.id}`} onClick={onDelete}>Delete</button>
            <button data-testid={`transfer-btn-${inbox.id}`} onClick={onTransfer}>Transfer</button>
        </div>
    ),
}));

vi.mock("../components/Skeleton", () => ({
    InboxCardSkeleton: () => <div data-testid="inbox-skeleton">Loading...</div>,
    MessageItemSkeleton: () => <div data-testid="message-skeleton">Loading...</div>,
}));

vi.mock("../components/ConfirmationModal", () => ({
    ConfirmationModal: ({ isOpen, onConfirm, onCancel, title }: { isOpen: boolean; onConfirm: () => void; onCancel: () => void; title: string }) => {
        if (!isOpen) return null;
        return (
            <div data-testid="confirmation-modal">
                <h2>{title}</h2>
                <button data-testid="confirm-delete-btn" onClick={onConfirm}>Confirm Delete</button>
                <button data-testid="cancel-delete-btn" onClick={onCancel}>Cancel Delete</button>
            </div>
        );
    },
}));

describe("InboxManager - Management Functionality", () => {
    const mockDomains = [
        { id: "domain-1", name: "test.com", status: "VERIFIED" },
    ];

    const mockInboxes = [
        { id: "inbox-1", domainId: "domain-1", localPart: "user1", createdAt: "2024-01-01", domain: mockDomains[0] },
        { id: "inbox-2", domainId: "domain-1", localPart: "user2", createdAt: "2024-01-02", domain: mockDomains[0] },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Strict mock for initial load
        mockApi.mockImplementation((url: string, options: any) => {
            if (url.includes("/domains")) return Promise.resolve({ data: mockDomains });
            if (url.includes("/inboxes") && (!options || !options.method || options.method === "GET")) return Promise.resolve({ data: [...mockInboxes] });
            if (url.includes("/messages")) return Promise.resolve({ data: [] });
            return Promise.resolve({ data: [] });
        });
    });

    it("should display the list of inboxes", async () => {
        render(<InboxManager />);
        await waitFor(() => {
            expect(screen.getByTestId("inbox-card-inbox-1")).toBeInTheDocument();
            expect(screen.getByTestId("inbox-card-inbox-2")).toBeInTheDocument();
        });
    });

    it("should switch to messages tab when view button is clicked", async () => {
        render(<InboxManager />);
        await waitFor(() => expect(screen.getByTestId("inbox-card-inbox-1")).toBeInTheDocument());

        await act(async () => {
            fireEvent.click(screen.getByTestId("view-msg-btn-inbox-1"));
        });

        await waitFor(() => {
            expect(screen.getByTestId("active-tab")).toHaveTextContent("messages");
        });
    });

    it("should handle single inbox deletion", async () => {
        mockApi.mockImplementation((url: string, options: any) => {
            if (url.includes("/domains")) return Promise.resolve({ data: mockDomains });
            if (url.includes("/inboxes") && (!options || !options.method || options.method === "GET")) return Promise.resolve({ data: [...mockInboxes] });
            if (url.includes("/inboxes/inbox-1") && options?.method === "DELETE") {
                return Promise.resolve({ success: true });
            }
            return Promise.resolve({ data: [] });
        });

        render(<InboxManager />);
        await waitFor(() => expect(screen.getByTestId("inbox-card-inbox-1")).toBeInTheDocument());

        // Click delete on inbox-1
        await act(async () => {
            fireEvent.click(screen.getByTestId("delete-btn-inbox-1"));
        });

        // Verification modal should appear
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();

        // Confirm deletion
        await act(async () => {
            fireEvent.click(screen.getByTestId("confirm-delete-btn"));
        });

        // Verify API call and UI update
        await waitFor(() => {
            expect(mockApi).toHaveBeenCalledWith(expect.stringContaining("/inboxes/inbox-1"), expect.objectContaining({ method: "DELETE" }));
        });

        expect(toast.success).toHaveBeenCalledWith("Đã xóa hộp thư");
        // We can't easily verify optimistic update because mocking API GET to return filtered list is hard without state in mock.
        // But we can check if toast was called.
    });

    it("should handle batch inbox deletion", async () => {
        mockApi.mockImplementation((url: string, options: any) => {
            if (url.includes("/domains")) return Promise.resolve({ data: mockDomains });
            if (url.includes("/inboxes") && (!options || !options.method || options.method === "GET")) return Promise.resolve({ data: [...mockInboxes] });
            if (url.includes("/inboxes") && options?.method === "DELETE") {
                return Promise.resolve({ success: true, count: 2 });
            }
            return Promise.resolve({ data: [] });
        });

        render(<InboxManager />);
        await waitFor(() => expect(screen.getByTestId("inbox-card-inbox-1")).toBeInTheDocument());

        // Select both inboxes using toggle
        await act(async () => {
            fireEvent.click(screen.getByTestId("toggle-select-btn-inbox-1"));
            fireEvent.click(screen.getByTestId("toggle-select-btn-inbox-2"));
        });

        // Find and click batch delete button (text contents "Delete (2)")
        await waitFor(() => expect(screen.getByText("Delete (2)")).toBeInTheDocument());
        const deleteButton = screen.getByText("Delete (2)");
        await act(async () => {
            fireEvent.click(deleteButton);
        });

        // Confirm deletion
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(screen.getByTestId("confirm-delete-btn"));
        });

        // Verify API call
        await waitFor(() => {
            expect(mockApi).toHaveBeenCalledWith(expect.stringContaining("/inboxes/inbox-1"), expect.objectContaining({ method: "DELETE" }));
            expect(mockApi).toHaveBeenCalledWith(expect.stringContaining("/inboxes/inbox-2"), expect.objectContaining({ method: "DELETE" }));
        });
    });

    it("should handle inbox ownership transfer", async () => {
        render(<InboxManager />);
        await waitFor(() => expect(screen.getByTestId("inbox-card-inbox-1")).toBeInTheDocument());

        // Click transfer on inbox-1
        await act(async () => {
            fireEvent.click(screen.getByTestId("transfer-btn-inbox-1"));
        });

        // Transfer modal should appear
        await waitFor(() => {
            expect(screen.getByTestId("transfer-inbox-modal")).toBeInTheDocument();
        });

        // Simulate successful transfer (mocked modal component calls onTransferComplete)
        await act(async () => {
            fireEvent.click(screen.getByTestId("confirm-transfer-btn"));
        });

        // Inbox should be removed from view
        await waitFor(() => {
            expect(screen.queryByTestId("inbox-card-inbox-1")).not.toBeInTheDocument();
        });

        // Modal should be closed
        expect(screen.queryByTestId("transfer-inbox-modal")).not.toBeInTheDocument();
    });
});
