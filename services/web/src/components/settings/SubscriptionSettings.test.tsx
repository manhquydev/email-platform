import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// Mock dependencies
vi.mock("../../context/AuthContext", () => ({
    useAuth: () => ({
        token: "test-token",
    }),
}));

vi.mock("react-hot-toast", () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
    },
}));

// Mock the api utility
const mockApi = vi.fn();
vi.mock("../../utils/api", () => ({
    api: (...args: unknown[]) => mockApi(...args),
}));

vi.mock("../../utils/errorMapping", () => ({
    getFriendlyErrorMessage: (msg: string) => msg,
}));

// Mock UI components
vi.mock("../ui/GlassCard", () => ({
    GlassCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div className={className} data-testid="glass-card">
            {children}
        </div>
    ),
}));

vi.mock("../ui/Button", () => ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Button: ({ children, onClick, disabled, variant: _variant, size: _size, className }: {
        children: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
        variant?: string;
        size?: string;
        className?: string;
    }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={className}
            data-testid="button"
        >
            {children}
        </button>
    ),
}));

vi.mock("../ui/Input", () => ({
    Input: ({ value, onChange, placeholder, className }: {
        value?: string;
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        className?: string;
    }) => (
        <input
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
            data-testid="input"
        />
    ),
}));

import { SubscriptionSettings } from "./SubscriptionSettings";
import toast from "react-hot-toast";

describe("SubscriptionSettings - Basic Rendering", () => {
    const mockProfile = {
        tier: "FREE",
        credits: 100,
        subscriptionEndsAt: null,
        usage: { domains: 1, inboxes: 5, storage: 1024000 },
        limits: { domains: 5, inboxes: 50, storageGB: 1, dailyEmails: 100 },
    };

    const mockLoadProfile = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockApi.mockResolvedValue({ payments: [] });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should render the component title", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        await waitFor(() => {
            expect(screen.getByText("Gói & Thanh toán")).toBeInTheDocument();
        });
    });

    it("should render export report button", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        await waitFor(() => {
            expect(screen.getByText("Xuất báo cáo")).toBeInTheDocument();
        });
    });

    it("should render subscription tier", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        await waitFor(() => {
            expect(screen.getByText("MIỄN PHÍ")).toBeInTheDocument();
        });
    });

    it("should render credits balance", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        await waitFor(() => {
            expect(screen.getByText("100")).toBeInTheDocument();
        });
    });

    it("should render redeem code input", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        const input = screen.getByPlaceholderText("MÃ KÍCH HOẠT");
        expect(input).toBeInTheDocument();
    });

    it("should render activate button", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        expect(screen.getByText("Kích hoạt")).toBeInTheDocument();
    });

    it("should render payment history section", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        await waitFor(() => {
            expect(screen.getByText("Lịch sử thanh toán")).toBeInTheDocument();
        });
    });

    it("should show empty payment history message", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        await waitFor(() => {
            expect(screen.getByText("Chưa có giao dịch thanh toán nào.")).toBeInTheDocument();
        });
    });
});

describe("SubscriptionSettings - Export Report", () => {
    const mockProfile = {
        tier: "FREE",
        credits: 100,
        subscriptionEndsAt: null,
    };

    const mockLoadProfile = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should show error when no payments to export", async () => {
        mockApi.mockResolvedValue({ payments: [] });

        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        await waitFor(() => {
            expect(screen.getByText("Xuất báo cáo")).toBeInTheDocument();
        });

        // Click export button
        const exportButton = screen.getByText("Xuất báo cáo").closest("button");
        await act(async () => {
            if (exportButton) fireEvent.click(exportButton);
        });

        expect(toast.error).toHaveBeenCalledWith("Không có dữ liệu để xuất báo cáo");
    });

    it("should call API to load payments on mount", async () => {
        mockApi.mockResolvedValue({ payments: [] });

        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        await waitFor(() => {
            expect(mockApi).toHaveBeenCalledWith("/billing/payments", { token: "test-token" });
        });
    });
});

describe("SubscriptionSettings - Payment History Display", () => {
    const mockProfile = {
        tier: "STARTER",
        credits: 500,
        subscriptionEndsAt: "2024-12-31T23:59:59Z",
    };

    const mockPayments = [
        {
            id: "pay-123456789",
            amount: 1500,
            currency: "usd",
            status: "COMPLETED",
            createdAt: "2024-01-15T10:00:00Z",
            stripePaymentId: "pi_test123",
        },
    ];

    const mockLoadProfile = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockApi.mockResolvedValue({ payments: mockPayments });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should display payment records", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        await waitFor(() => {
            // Should show payment ID (first 8 chars uppercase)
            expect(screen.getByText("#PAY-1234")).toBeInTheDocument();
        });
    });

    it("should have download button for each payment", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        await waitFor(() => {
            const downloadButtons = screen.getAllByLabelText("Download invoice");
            expect(downloadButtons.length).toBeGreaterThan(0);
        });
    });

    it("should display payment status", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        await waitFor(() => {
            expect(screen.getByText("COMPLETED")).toBeInTheDocument();
        });
    });
});

describe("SubscriptionSettings - Redeem Code Functionality", () => {
    const mockProfile = {
        tier: "FREE",
        credits: 0,
        subscriptionEndsAt: null,
    };

    const mockLoadProfile = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockApi.mockResolvedValue({ payments: [] });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should convert input to uppercase", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        const input = screen.getByPlaceholderText("MÃ KÍCH HOẠT");

        await act(async () => {
            fireEvent.change(input, { target: { value: "testcode" } });
        });

        expect(input).toHaveValue("TESTCODE");
    });

    it("should call redeem API when code is submitted", async () => {
        mockApi.mockResolvedValueOnce({ payments: [] });
        mockApi.mockResolvedValueOnce({ message: "Kích hoạt thành công!", user: {} });

        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        const input = screen.getByPlaceholderText("MÃ KÍCH HOẠT");
        await act(async () => {
            fireEvent.change(input, { target: { value: "TESTCODE123" } });
        });

        const activateButton = screen.getByText("Kích hoạt");
        await act(async () => {
            fireEvent.click(activateButton);
        });

        await waitFor(() => {
            expect(mockApi).toHaveBeenCalledWith("/subscription/redeem", {
                method: "POST",
                token: "test-token",
                body: { code: "TESTCODE123" }
            });
        });
    });

    it("should show success message after successful redeem", async () => {
        mockApi.mockResolvedValueOnce({ payments: [] });
        mockApi.mockResolvedValueOnce({ message: "Kích hoạt thành công!", user: {} });

        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        const input = screen.getByPlaceholderText("MÃ KÍCH HOẠT");
        await act(async () => {
            fireEvent.change(input, { target: { value: "VALIDCODE" } });
        });

        await act(async () => {
            fireEvent.click(screen.getByText("Kích hoạt"));
        });

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith("Kích hoạt thành công!");
        });
    });

    it("should reload profile after successful redeem", async () => {
        mockApi.mockResolvedValueOnce({ payments: [] });
        mockApi.mockResolvedValueOnce({ message: "Success", user: {} });

        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        const input = screen.getByPlaceholderText("MÃ KÍCH HOẠT");
        await act(async () => {
            fireEvent.change(input, { target: { value: "CODE123" } });
        });

        await act(async () => {
            fireEvent.click(screen.getByText("Kích hoạt"));
        });

        await waitFor(() => {
            expect(mockLoadProfile).toHaveBeenCalled();
        });
    });

    it("should clear input after successful redeem", async () => {
        mockApi.mockResolvedValueOnce({ payments: [] });
        mockApi.mockResolvedValueOnce({ message: "Success", user: {} });

        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        const input = screen.getByPlaceholderText("MÃ KÍCH HOẠT");
        await act(async () => {
            fireEvent.change(input, { target: { value: "CODE123" } });
        });

        await act(async () => {
            fireEvent.click(screen.getByText("Kích hoạt"));
        });

        await waitFor(() => {
            expect(input).toHaveValue("");
        });
    });
});

describe("SubscriptionSettings - Pricing Section", () => {
    const mockProfile = {
        tier: "FREE",
        credits: 0,
        subscriptionEndsAt: null,
    };

    const mockLoadProfile = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockApi.mockResolvedValue({ payments: [] });
    });

    it("should render pricing cards", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        await waitFor(() => {
            expect(screen.getByText("Nâng cấp gói của bạn")).toBeInTheDocument();
        });
    });

    it("should show billing cycle toggle", async () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        expect(screen.getByText("Hàng tháng")).toBeInTheDocument();
        expect(screen.getByText(/Hàng năm/)).toBeInTheDocument();
    });

    it("should highlight current plan", () => {
        render(<SubscriptionSettings profile={mockProfile} loadProfile={mockLoadProfile} />);

        // "Gói hiện tại" appears multiple times - in summary card and in plan buttons
        // Just check that at least one exists
        const currentPlanElements = screen.getAllByText("Gói hiện tại");
        expect(currentPlanElements.length).toBeGreaterThanOrEqual(1);
    });
});
