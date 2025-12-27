
import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyNewEmail } from "../services/telegramBot";

// Mock prisma
const mockFindUnique = vi.fn();
vi.mock("../lib/prisma", () => ({
    prisma: {
        user: {
            findUnique: (...args) => mockFindUnique(...args)
        }
    }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Telegram Content Verification", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ ok: true, result: {} }),
        });
        process.env.TELEGRAM_BOT_TOKEN = "test-token";
    });

    it("should include full text body in the message", async () => {
        mockFindUnique.mockResolvedValue({
            telegramChatId: "123",
            notifyOnEmail: true
        });

        const message = {
            id: "1",
            fromAddress: "sender@example.com",
            toAddress: "me@example.com",
            subject: "Test Subject",
            textBody: "This is the full content of the email.\nIt has multiple lines.",
            htmlBody: null
        };

        await notifyNewEmail("user1", message);

        expect(mockFetch).toHaveBeenCalled();
        const callArgs = mockFetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);

        expect(body.text).toContain("📝 *Nội dung:*");
        expect(body.text).toContain("This is the full content of the email.");
        expect(body.text).toContain("It has multiple lines.");
    });

    it("should truncate very long content", async () => {
        mockFindUnique.mockResolvedValue({
            telegramChatId: "123",
            notifyOnEmail: true
        });

        const longContent = "a".repeat(4000);
        const message = {
            id: "1",
            fromAddress: "sender@example.com",
            toAddress: "me@example.com",
            subject: "Long Subject",
            textBody: longContent,
            htmlBody: null
        };

        await notifyNewEmail("user1", message);

        expect(mockFetch).toHaveBeenCalled();
        const callArgs = mockFetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);

        expect(body.text).toContain("📝 *Nội dung:*");
        expect(body.text.length).toBeLessThan(4096); // Telegram limit
        expect(body.text).toContain("(Nội dung quá dài, vui lòng xem chi tiết trên web)");
    });
});
