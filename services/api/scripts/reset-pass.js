const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const NEW_PASSWORD = process.env.RESET_PASS_PASSWORD;
if (!NEW_PASSWORD) {
    console.error("Error: required environment variable 'RESET_PASS_PASSWORD' is not set.");
    process.exit(1);
}

const TARGET_EMAIL = process.env.RESET_PASS_EMAIL || 'tester274@example.com';

async function main() {
    const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);
    await prisma.user.update({
        where: { email: TARGET_EMAIL },
        data: { passwordHash }
    });
    console.log(`Password reset for ${TARGET_EMAIL}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
