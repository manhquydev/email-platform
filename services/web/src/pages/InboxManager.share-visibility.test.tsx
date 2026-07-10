/**
 * InboxManager - Share Mode Toggle + Visibility Rules Tests
 *
 * Renders the real page component (not a decoupled sub-component) so this
 * test fails loudly if a control isn't actually in the live render tree.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { InboxManager } from "./InboxManager";

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
}));

vi.mock("../layouts/AppShell", () => ({
    AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

vi.mock("../components/CreateInboxModal", () => ({
    CreateInboxModal: () => <div data-testid="create-inbox-modal">Create Modal</div>,
}));

vi.mock("../components/VisibilityRulesPanel", () => ({
    VisibilityRulesPanel: ({ inboxEmail, onClose }: { inboxEmail: string; onClose: () => void }) => (
        <div data-testid="visibility-rules-panel">
            <p>{inboxEmail}</p>
            <button onClick={onClose}>Close</button>
        </div>
    ),
}));

const mockInbox = {
    id: "inbox-1",
    localPart: "test1",
    domain: { id: "d1", name: "example.com", createdAt: "", updatedAt: "" },
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    expiresAt: null,
    isPermanent: true,
    shareMode: "PRIVATE",
    ownerId: "user-1",
    _count: { messages: 3 },
};

const mockSharedInbox = {
    ...mockInbox,
    id: "inbox-2",
    localPart: "test2",
    ownerId: "someone-else",
};

const mockNoOwnerInbox = {
    ...mockInbox,
    id: "inbox-3",
    localPart: "test3",
    ownerId: null,
};

const mockApi = vi.fn();
vi.mock("../utils/api", () => ({
    api: (...args: unknown[]) => mockApi(...args),
}));

function renderPage() {
    return render(
        <MemoryRouter>
            <InboxManager />
        </MemoryRouter>
    );
}

describe("InboxManager - share mode + visibility rules controls", () => {
    beforeEach(() => {
        mockApi.mockReset();
        mockApi.mockImplementation((url: string) => {
            if (url.startsWith("/domains")) {
                return Promise.resolve({ data: [] });
            }
            if (url.startsWith("/inboxes")) {
                return Promise.resolve({ data: [mockInbox], meta: { total: 1 } });
            }
            return Promise.resolve({});
        });
    });

    it("renders a share mode toggle button for the inbox card", async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByTitle(/chuyển sang public/i)).toBeInTheDocument();
        });
    });

    it("calls PATCH /inboxes/:id with the flipped shareMode when the toggle is clicked", async () => {
        renderPage();
        const toggle = await screen.findByTitle(/chuyển sang public/i);
        fireEvent.click(toggle);

        await waitFor(() => {
            expect(mockApi).toHaveBeenCalledWith(
                "/inboxes/inbox-1",
                expect.objectContaining({ method: "PATCH", body: { shareMode: "PUBLIC" } })
            );
        });
    });

    it("renders a 'Quy tắc hiển thị' button that opens the VisibilityRulesPanel", async () => {
        renderPage();
        const rulesButton = await screen.findByText(/quy tắc hiển thị/i);
        fireEvent.click(rulesButton);

        const panel = screen.getByTestId("visibility-rules-panel");
        expect(panel).toBeInTheDocument();
        expect(within(panel).getByText("test1@example.com")).toBeInTheDocument();
    });

    it("hides the share toggle and visibility rules button for inboxes the user does not own", async () => {
        mockApi.mockImplementation((url: string) => {
            if (url.startsWith("/domains")) {
                return Promise.resolve({ data: [] });
            }
            if (url.startsWith("/inboxes")) {
                return Promise.resolve({ data: [mockSharedInbox], meta: { total: 1 } });
            }
            return Promise.resolve({});
        });

        renderPage();
        await screen.findByText("test2@example.com");

        expect(screen.queryByTitle(/chuyển sang public/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/quy tắc hiển thị/i)).not.toBeInTheDocument();
    });

    it("hides the share toggle and visibility rules button when ownerId is null (regression: backend 403s on unverifiable ownership)", async () => {
        // Backend `verifyInboxOwnership` requires an exact `ownerId === userId` match
        // and returns 403 for anything else, including a null ownerId. The controls
        // must not render for inboxes whose ownership can't be positively confirmed —
        // otherwise clicking them redirects the whole app to /403 (production regression).
        mockApi.mockImplementation((url: string) => {
            if (url.startsWith("/domains")) {
                return Promise.resolve({ data: [] });
            }
            if (url.startsWith("/inboxes")) {
                return Promise.resolve({ data: [mockNoOwnerInbox], meta: { total: 1 } });
            }
            return Promise.resolve({});
        });

        renderPage();
        await screen.findByText("test3@example.com");

        expect(screen.queryByTitle(/chuyển sang public/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/quy tắc hiển thị/i)).not.toBeInTheDocument();
    });
});
