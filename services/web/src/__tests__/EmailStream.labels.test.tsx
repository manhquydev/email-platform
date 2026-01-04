import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock dependencies
vi.mock("react-hot-toast", () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("../utils/otpExtractor", () => ({
    extractOTP: vi.fn((text: string) => {
        // Simple mock implementation
        const match = text.match(/\d{6}/);
        return match ? match[0] : null;
    }),
}));

vi.mock("../utils/cn", () => ({
    cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(" "),
}));

import { EmailStream } from "../components/EmailStream";
import toast from "react-hot-toast";

describe("EmailStream - Labels Display", () => {
    const mockOnSelectMessage = vi.fn();
    const mockOnCopyOTP = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock clipboard
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        });
    });

    const createMessage = (overrides = {}) => ({
        id: "msg-1",
        inboxId: "inbox-1",
        subject: "Test Email Subject",
        fromAddress: "sender@example.com",
        toAddress: "recipient@test.com",
        receivedAt: new Date().toISOString(),
        textBody: "This is a test email body",
        htmlBody: null,
        isRead: false,
        isPinned: false,
        snoozedUntil: null,
        attachments: [],
        labels: [],
        ...overrides,
    });

    it("should render messages without labels", () => {
        const messages = [createMessage({ labels: [] })];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        expect(screen.getByText("Test Email Subject")).toBeInTheDocument();
        expect(screen.getByText("sender@example.com")).toBeInTheDocument();
    });

    it("should render message with a single label", () => {
        const messages = [
            createMessage({
                labels: [
                    { id: "label-1", inboxId: "inbox-1", name: "Important", color: "#FF0000", createdAt: "", updatedAt: "" }
                ]
            })
        ];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        expect(screen.getByText("Important")).toBeInTheDocument();
    });

    it("should render message with multiple labels", () => {
        const messages = [
            createMessage({
                labels: [
                    { id: "label-1", inboxId: "inbox-1", name: "Work", color: "#0000FF", createdAt: "", updatedAt: "" },
                    { id: "label-2", inboxId: "inbox-1", name: "Urgent", color: "#FF0000", createdAt: "", updatedAt: "" },
                    { id: "label-3", inboxId: "inbox-1", name: "Personal", color: "#00FF00", createdAt: "", updatedAt: "" },
                ]
            })
        ];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        expect(screen.getByText("Work")).toBeInTheDocument();
        expect(screen.getByText("Urgent")).toBeInTheDocument();
        expect(screen.getByText("Personal")).toBeInTheDocument();
    });

    it("should apply correct label styles", () => {
        const messages = [
            createMessage({
                labels: [
                    { id: "label-1", inboxId: "inbox-1", name: "Custom Label", color: "#9333EA", createdAt: "", updatedAt: "" }
                ]
            })
        ];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        const labelElement = screen.getByText("Custom Label");

        // Check that the label exists and has styling applied
        expect(labelElement).toBeInTheDocument();
        const labelSpan = labelElement.closest("span");
        expect(labelSpan).toBeTruthy();
        // Check that style attribute exists (inline styles are applied)
        expect(labelSpan).toHaveAttribute("style");
    });

    it("should render label indicator dot with correct color", () => {
        const messages = [
            createMessage({
                labels: [
                    { id: "label-1", inboxId: "inbox-1", name: "Colored Label", color: "#FF5722", createdAt: "", updatedAt: "" }
                ]
            })
        ];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        const labelSpan = screen.getByText("Colored Label").closest("span");
        const dotElement = labelSpan?.querySelector("span.rounded-full");

        expect(dotElement).toHaveStyle({
            backgroundColor: "#FF5722",
        });
    });

    it("should not render labels section when message has no labels", () => {
        const messages = [
            createMessage({ labels: [] }),
            createMessage({ id: "msg-2", labels: undefined }),
        ];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        // Labels should not be present
        expect(screen.queryByText("Important")).not.toBeInTheDocument();
        expect(screen.queryByText("Work")).not.toBeInTheDocument();
    });

    it("should handle undefined labels gracefully", () => {
        const messages = [
            createMessage({ labels: undefined })
        ];

        // Should not throw error
        expect(() => {
            render(
                <EmailStream
                    messages={messages}
                    selectedMessageId={null}
                    onSelectMessage={mockOnSelectMessage}
                />
            );
        }).not.toThrow();
    });

    it("should display labels in the correct position (after OTP button if present)", () => {
        const messages = [
            createMessage({
                textBody: "Your OTP code is 123456",
                labels: [
                    { id: "label-1", inboxId: "inbox-1", name: "OTP Email", color: "#4CAF50", createdAt: "", updatedAt: "" }
                ]
            })
        ];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        // Both OTP and label should be visible
        expect(screen.getByText(/OTP: 123456/)).toBeInTheDocument();
        expect(screen.getByText("OTP Email")).toBeInTheDocument();
    });

    it("should call onSelectMessage when message with labels is clicked", async () => {
        const message = createMessage({
            labels: [
                { id: "label-1", inboxId: "inbox-1", name: "Clickable", color: "#2196F3", createdAt: "", updatedAt: "" }
            ]
        });

        render(
            <EmailStream
                messages={[message]}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        const messageElement = screen.getByText("Test Email Subject").closest('[role="button"]');
        fireEvent.click(messageElement!);

        expect(mockOnSelectMessage).toHaveBeenCalledWith(message);
    });

    it("should display labels for selected message", () => {
        const message = createMessage({
            labels: [
                { id: "label-1", inboxId: "inbox-1", name: "Selected Label", color: "#E91E63", createdAt: "", updatedAt: "" }
            ]
        });

        render(
            <EmailStream
                messages={[message]}
                selectedMessageId="msg-1"
                onSelectMessage={mockOnSelectMessage}
            />
        );

        expect(screen.getByText("Selected Label")).toBeInTheDocument();
    });

    it("should handle labels with default color when color is undefined", () => {
        const messages = [
            createMessage({
                labels: [
                    { id: "label-1", inboxId: "inbox-1", name: "No Color Label", color: undefined, createdAt: "", updatedAt: "" }
                ]
            })
        ];

        // Should not throw and should render label
        expect(() => {
            render(
                <EmailStream
                    messages={messages}
                    selectedMessageId={null}
                    onSelectMessage={mockOnSelectMessage}
                />
            );
        }).not.toThrow();

        expect(screen.getByText("No Color Label")).toBeInTheDocument();
    });

    it("should render empty state when no messages", () => {
        render(
            <EmailStream
                messages={[]}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        expect(screen.getByText("Chưa có email")).toBeInTheDocument();
    });

    it("should group messages by time (Today, Yesterday, This Week, Earlier)", () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 3);

        const messages = [
            createMessage({ id: "msg-today", subject: "Today Email", receivedAt: today.toISOString() }),
            createMessage({ id: "msg-yesterday", subject: "Yesterday Email", receivedAt: yesterday.toISOString() }),
            createMessage({ id: "msg-week", subject: "Week Email", receivedAt: lastWeek.toISOString() }),
        ];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        expect(screen.getByText("Hôm nay")).toBeInTheDocument();
        expect(screen.getByText("Hôm qua")).toBeInTheDocument();
        expect(screen.getByText("Tuần này")).toBeInTheDocument();
    });

    it("should copy OTP and show toast when OTP button is clicked", async () => {
        const messages = [
            createMessage({
                textBody: "Your verification code is 654321",
                labels: []
            })
        ];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
                onCopyOTP={mockOnCopyOTP}
            />
        );

        const otpButton = screen.getByText(/OTP: 654321/);
        fireEvent.click(otpButton);

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith("654321");
        });

        expect(toast.success).toHaveBeenCalledWith("Đã copy OTP: 654321");
        expect(mockOnCopyOTP).toHaveBeenCalledWith("654321");
    });

    it("should not propagate click event when clicking OTP button", async () => {
        const messages = [
            createMessage({
                textBody: "Code: 111222",
            })
        ];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        const otpButton = screen.getByText(/OTP: 111222/);
        fireEvent.click(otpButton);

        // onSelectMessage should not be called when clicking OTP button
        expect(mockOnSelectMessage).not.toHaveBeenCalled();
    });
});

describe("EmailStream - Message Display", () => {
    const mockOnSelectMessage = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createMessage = (overrides = {}) => ({
        id: "msg-1",
        inboxId: "inbox-1",
        subject: "Test Subject",
        fromAddress: "from@test.com",
        toAddress: "to@test.com",
        receivedAt: new Date().toISOString(),
        textBody: "Test body content",
        htmlBody: null,
        isRead: false,
        isPinned: false,
        snoozedUntil: null,
        attachments: [],
        labels: [],
        ...overrides,
    });

    it("should display unread indicator for unread messages", () => {
        const messages = [createMessage({ isRead: false })];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        // Unread messages should have special styling
        const messageElement = screen.getByText("Test Subject").closest('[role="button"]');
        expect(messageElement).toHaveClass("bg-primary/5");
    });

    it("should highlight selected message", () => {
        const messages = [createMessage()];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId="msg-1"
                onSelectMessage={mockOnSelectMessage}
            />
        );

        const messageElement = screen.getByText("Test Subject").closest('[role="button"]');
        expect(messageElement).toHaveClass("bg-primary/5");
    });

    it("should display placeholder text for messages without subject", () => {
        const messages = [createMessage({ subject: null })];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        expect(screen.getByText("(Không có tiêu đề)")).toBeInTheDocument();
    });

    it("should display placeholder text for messages without body", () => {
        const messages = [createMessage({ textBody: null })];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        expect(screen.getByText("Không có nội dung xem trước")).toBeInTheDocument();
    });

    it("should truncate long message body", () => {
        const longBody = "A".repeat(200);
        const messages = [createMessage({ textBody: longBody })];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        // The body should be truncated to 100 characters
        const previewText = screen.getByText("A".repeat(100));
        expect(previewText).toBeInTheDocument();
    });

    it("should format relative time correctly", () => {
        const messages = [createMessage({ receivedAt: new Date().toISOString() })];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        // Should show "vừa xong" for just now
        expect(screen.getByText("vừa xong")).toBeInTheDocument();
    });

    it("should support keyboard navigation (Enter key)", () => {
        const message = createMessage();

        render(
            <EmailStream
                messages={[message]}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        const messageElement = screen.getByText("Test Subject").closest('[role="button"]');
        fireEvent.keyDown(messageElement!, { key: "Enter" });

        expect(mockOnSelectMessage).toHaveBeenCalledWith(message);
    });

    it("should have correct accessibility attributes", () => {
        const messages = [createMessage()];

        render(
            <EmailStream
                messages={messages}
                selectedMessageId={null}
                onSelectMessage={mockOnSelectMessage}
            />
        );

        const messageElement = screen.getByText("Test Subject").closest('[role="button"]');
        expect(messageElement).toHaveAttribute("role", "button");
        expect(messageElement).toHaveAttribute("tabIndex", "0");
    });
});
