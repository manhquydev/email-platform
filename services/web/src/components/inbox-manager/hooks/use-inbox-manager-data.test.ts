import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInboxManagerData } from "./use-inbox-manager-data";

const mockApi = vi.fn();
const mockToastError = vi.fn();

vi.mock("../../../context/AuthContext", () => ({
    useAuth: () => ({ token: "test-token" }),
}));

vi.mock("../../../utils/api", () => ({
    api: (...args: unknown[]) => mockApi(...args),
}));

vi.mock("../../../hooks/useRealtimeContext", () => ({
    useRealtimeSubscription: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
    default: {
        error: (...args: unknown[]) => mockToastError(...args),
    },
}));

function buildInboxes(count: number, start = 0) {
    return Array.from({ length: count }, (_, index) => {
        const id = start + index + 1;
        return {
            id: `inbox-${id}`,
            localPart: `user-${id}`,
            domain: { name: "example.com" },
        };
    });
}

describe("useInboxManagerData", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("loads inboxes across pages using offset pagination", async () => {
        const firstPage = buildInboxes(200, 0);
        const secondPage = buildInboxes(50, 200);

        mockApi
            .mockResolvedValueOnce({ data: [] }) // domains
            .mockResolvedValueOnce({ data: firstPage, meta: { total: 250 } }) // inboxes page 1
            .mockResolvedValueOnce({ data: secondPage, meta: { total: 250 } }); // inboxes page 2

        const { result } = renderHook(() => useInboxManagerData());

        await waitFor(() => {
            expect(result.current.inboxes).toHaveLength(250);
        });

        expect(mockApi).toHaveBeenNthCalledWith(
            2,
            "/inboxes?limit=200&offset=0",
            { token: "test-token" }
        );
        expect(mockApi).toHaveBeenNthCalledWith(
            3,
            "/inboxes?limit=200&offset=200",
            { token: "test-token" }
        );
    });

    it("stops pagination when first page size is below page limit", async () => {
        const singlePage = buildInboxes(80, 0);

        mockApi
            .mockResolvedValueOnce({ data: [] }) // domains
            .mockResolvedValueOnce({ data: singlePage, meta: { total: 80 } }); // inboxes page 1

        const { result } = renderHook(() => useInboxManagerData());

        await waitFor(() => {
            expect(result.current.inboxes).toHaveLength(80);
        });

        expect(mockApi).toHaveBeenCalledTimes(2);
        expect(mockApi).toHaveBeenLastCalledWith(
            "/inboxes?limit=200&offset=0",
            { token: "test-token" }
        );
        expect(mockToastError).not.toHaveBeenCalled();
    });
});
