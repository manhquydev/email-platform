import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { InboxWorkspace } from "./InboxWorkspace";

const mockSetBusy = vi.fn();
const mockSetActiveInbox = vi.fn();
const mockSetMessages = vi.fn();
const mockLoadMessages = vi.fn();

let mockInboxes = [
    {
        id: "inbox-1",
        localPart: "alpha",
        domain: { name: "example.com" },
        _count: { messages: 2 },
    },
];

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({ token: "test-token" }),
}));

vi.mock("../hooks/useBreakpoint", () => ({
    useBreakpoint: () => "desktop",
}));

vi.mock("../hooks/useMessageActions", () => ({
    useMessageActions: () => ({
        handleSelectMessage: vi.fn(),
        handleDeleteMessage: vi.fn(),
        handleTogglePin: vi.fn(),
    }),
}));

vi.mock("../components/Loading", () => ({
    Loading: () => <div data-testid="loading">Loading</div>,
}));

vi.mock("../layouts/AppShell", () => ({
    AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../components/inbox-manager/desktop-layout-modules", () => ({
    MiddlePane: () => <div data-testid="middle-pane">Middle Pane</div>,
}));

vi.mock("../components/email-viewer/MessageViewer", () => ({
    MessageViewer: () => <div data-testid="message-viewer">Message Viewer</div>,
}));

vi.mock("../components/inbox-manager/hooks/use-inbox-manager-data", () => ({
    useInboxManagerData: () => ({
        domains: [],
        inboxes: mockInboxes,
        messages: [],
        busy: false,
        setBusy: mockSetBusy,
        selectedDomain: "",
        activeInbox: null,
        setSelectedDomain: vi.fn(),
        setActiveInbox: mockSetActiveInbox,
        setInboxes: vi.fn(),
        setMessages: mockSetMessages,
        loadInboxes: vi.fn(),
        loadMessages: mockLoadMessages,
    }),
}));

vi.mock("../components/inbox-manager/hooks/use-inbox-search", () => ({
    useInboxSearch: () => ({
        searchQuery: "",
        searchResults: [],
        isSearching: false,
        isSearchMode: false,
        handleSearch: vi.fn(),
        clearSearch: vi.fn(),
    }),
}));

describe("InboxWorkspace", () => {
    it("renders workspace for existing inbox route", () => {
        mockInboxes = [
            { id: "inbox-1", localPart: "alpha", domain: { name: "example.com" }, _count: { messages: 0 } },
        ];

        render(
            <MemoryRouter initialEntries={["/app/inbox/inbox-1"]}>
                <Routes>
                    <Route path="/app/inbox/:inboxId" element={<InboxWorkspace />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText("Inbox Workspace")).toBeInTheDocument();
        expect(screen.getByText("Manager")).toBeInTheDocument();
        expect(screen.getByTestId("middle-pane")).toBeInTheDocument();
    });

    it("shows not-found state for unknown inbox route", () => {
        mockInboxes = [];

        render(
            <MemoryRouter initialEntries={["/app/inbox/unknown"]}>
                <Routes>
                    <Route path="/app/inbox/:inboxId" element={<InboxWorkspace />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText("Không tìm thấy inbox")).toBeInTheDocument();
        expect(screen.getByText("Quay lại manager")).toBeInTheDocument();
    });
});
