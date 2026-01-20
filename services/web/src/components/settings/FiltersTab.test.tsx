import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FiltersTab } from "./FiltersTab";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock API
const mockApi = vi.fn();
vi.mock("../../utils/api", () => ({
    api: (path: string) => mockApi(path),
}));

// Mock AuthContext
vi.mock("../../context/AuthContext", () => ({
    useAuth: () => ({
        token: "mock-token",
        user: { id: "test-user", email: "test@example.com" },
        isAuthenticated: true,
    }),
}));

// Mock props for Toast
vi.mock("react-hot-toast", () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

const mockFilters = [
    {
        id: "f1",
        name: "Test Filter",
        conditions: [],
        actions: [],
        priority: 0,
        isActive: true,
        createdAt: new Date().toISOString()
    }
];

describe("FiltersTab Component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders empty state when no filters", async () => {
        mockApi.mockImplementation((path) => {
            if (path.includes("/filters")) return Promise.resolve({ filters: [] });
            if (path.includes("/labels")) return Promise.resolve({ labels: [] });
            return Promise.resolve({});
        });

        render(<FiltersTab inboxId="test-id" />);

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.getByText("Bộ lọc tự động")).toBeInTheDocument();
        });

        expect(screen.getByText("Chưa có bộ lọc nào. Hãy tạo bộ lọc đầu tiên để tự động hóa hộp thư của bạn.")).toBeInTheDocument();
    });

    it("renders list of filters", async () => {
        mockApi.mockImplementation((path) => {
            if (path.includes("/filters")) return Promise.resolve({ filters: mockFilters });
            if (path.includes("/labels")) return Promise.resolve({ labels: [] });
            return Promise.resolve({});
        });

        render(<FiltersTab inboxId="test-id" />);

        await waitFor(() => {
            expect(screen.getByText("Test Filter")).toBeInTheDocument();
        });
    });

    it("opens create modal when clicking add button", async () => {
        mockApi.mockImplementation((path) => {
            if (path.includes("/filters")) return Promise.resolve({ filters: [] });
            if (path.includes("/labels")) return Promise.resolve({ labels: [] });
            return Promise.resolve({});
        });

        render(<FiltersTab inboxId="test-id" />);

        await waitFor(() => {
            expect(screen.getByText("Bộ lọc tự động")).toBeInTheDocument();
        });

        const addButton = screen.getByText("+ Thêm Bộ lọc");
        fireEvent.click(addButton);
        expect(screen.getByText("Tạo Bộ lọc Mới")).toBeInTheDocument();
    });
});
