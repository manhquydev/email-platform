const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Select only non-sensitive fields — never dump passwordHash / twoFactorSecret to the console.
    const users = await prisma.user.findMany({
        take: 5,
        select: {
            id: true,
            email: true,
            role: true,
            tier: true,
            isDisabled: true,
            emailVerified: true,
            createdAt: true,
        },
    });
    console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
