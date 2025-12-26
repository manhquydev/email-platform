import { PrismaClient, CreditTransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma";

export class CreditService {
    /**
     * Add credits to a user's balance
     */
    static async addCredits(
        userId: string,
        amount: number,
        type: CreditTransactionType,
        description: string,
        metadata?: Record<string, any>
    ) {
        if (amount <= 0) throw new Error("Amount must be positive");

        return await prisma.$transaction(async (tx) => {
            // 1. Create transaction record
            const transaction = await tx.creditTransaction.create({
                data: {
                    userId,
                    amount, // Positive
                    type,
                    description,
                    metadata
                }
            });

            // 2. Update user balance
            const user = await tx.user.update({
                where: { id: userId },
                data: {
                    credits: { increment: amount }
                },
                select: { credits: true }
            });

            return { transaction, newBalance: user.credits };
        });
    }

    /**
     * Deduct credits from a user's balance
     * Throws error if insufficient funds
     */
    static async deductCredits(
        userId: string,
        amount: number,
        type: CreditTransactionType,
        description: string,
        metadata?: Record<string, any>
    ) {
        if (amount <= 0) throw new Error("Amount must be positive");

        return await prisma.$transaction(async (tx) => {
            // 1. Check balance (and lock row if needed? Update with where clause is safer)
            // We rely on the atomic update check.
            // But we need to check first to give a good error message.
            const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

            if (user.credits < amount) {
                throw new Error("Insufficient credits");
            }

            // 2. Create transaction record
            const transaction = await tx.creditTransaction.create({
                data: {
                    userId,
                    amount: -amount, // Negative for deduction
                    type,
                    description,
                    metadata
                }
            });

            // 3. Update user balance
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    credits: { decrement: amount }
                },
                select: { credits: true }
            });

            return { transaction, newBalance: updatedUser.credits };
        });
    }

    /**
     * Get user's credit balance
     */
    static async getBalance(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { credits: true }
        });
        return user?.credits || 0;
    }

    /**
     * Get transaction history
     */
    static async getHistory(userId: string, limit = 20, offset = 0) {
        const [transactions, total] = await Promise.all([
            prisma.creditTransaction.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset
            }),
            prisma.creditTransaction.count({ where: { userId } })
        ]);

        return { transactions, total };
    }
}
