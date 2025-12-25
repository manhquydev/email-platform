const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.servicePackage.update({
        where: { id: '8f29d29e-c38a-428e-867f-0c633d27c6a4' },
        data: { type: 'USAGE_BASED' }
    });
    console.log('Updated package to USAGE_BASED');
}

main().catch(console.error).finally(() => prisma.$disconnect());
