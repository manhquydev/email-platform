import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { CreditService } from "../services/credit.service"; // Adjusted path
import { prisma } from "../lib/prisma"; // Adjusted path
import { CreditTransactionType, UserRole } from "@prisma/client";

describe("CreditService", () => {
    let testUserId: string;

    beforeEach(async () => {
        // Create a fresh user for each test to ensure isolation
        const user = await prisma.user.create({
            data: {
                email: `test_credit_${Date.now()}_${Math.random()}@example.com`,
                passwordHash: "dummy",
                role: UserRole.USER,
                credits: 10 // Start with 10 credits
            }
        });
        testUserId = user.id;
    });

    afterAll(async () => {
        // Clean up users created during tests
        await prisma.user.deleteMany({
            where: { email: { startsWith: "test_credit_" } }
        });
    });

    it("should get correct balance", async () => {
        const balance = await CreditService.getBalance(testUserId);
        expect(balance).toBe(10);
    });

    it("should add credits correctly", async () => {
        const { newBalance, transaction } = await CreditService.addCredits(
            testUserId,
            5,
            CreditTransactionType.DEPOSIT,
            "Test Deposit"
        );

        expect(newBalance).toBe(15);
        expect(transaction.amount).toBe(5);
        expect(transaction.type).toBe(CreditTransactionType.DEPOSIT);

        const dbBalance = await CreditService.getBalance(testUserId);
        expect(dbBalance).toBe(15);
    });

    it("should deduct credits correctly when sufficient balance", async () => {
        const { newBalance, transaction } = await CreditService.deductCredits(
            testUserId,
            3,
            CreditTransactionType.USAGE,
            "Test Usage"
        );

        expect(newBalance).toBe(7);
        expect(transaction.amount).toBe(-3);
        expect(transaction.type).toBe(CreditTransactionType.USAGE);

        const dbBalance = await CreditService.getBalance(testUserId);
        expect(dbBalance).toBe(7);
    });

    it("should throw error when deducting with insufficient balance", async () => {
        await expect(
            CreditService.deductCredits(
                testUserId,
                20, // More than 10
                CreditTransactionType.USAGE,
                "Fail Usage"
            )
        ).rejects.toThrow("Insufficient credits");

        // Balance should remain unchanged
        const dbBalance = await CreditService.getBalance(testUserId);
        expect(dbBalance).toBe(10);
    });

    it("should record transaction history", async () => {
        await CreditService.addCredits(testUserId, 5, CreditTransactionType.DEPOSIT, "Topup");
        await CreditService.deductCredits(testUserId, 2, CreditTransactionType.USAGE, "Send Mail");

        const { transactions, total } = await CreditService.getHistory(testUserId);

        expect(total).toBeGreaterThanOrEqual(2);
        // Note: Sort order is desc in service
        expect(transactions[0].description).toBe("Send Mail");
        expect(transactions[0].amount).toBe(-2);
        expect(transactions[1].description).toBe("Topup");
        expect(transactions[1].amount).toBe(5);
    });
});
