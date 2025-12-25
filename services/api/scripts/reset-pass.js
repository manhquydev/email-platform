const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('12345678', 10);
    await prisma.user.update({
        where: { email: 'tester274@example.com' },
        data: { passwordHash }
    });
    console.log('Password reset for tester274@example.com');
}

main().catch(console.error).finally(() => prisma.$disconnect());
