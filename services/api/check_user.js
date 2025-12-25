
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'manhquydevq@gmail.com' },
        select: { id: true, email: true, tier: true, isDisabled: true, subscriptionStatus: true }
    });
    console.log('USER_CHECK:', JSON.stringify(user, null, 2));

    // also check admin user
    const admin = await prisma.user.findUnique({
        where: { email: 'admin@example.com' },
        select: { id: true, email: true, tier: true, isDisabled: true, password: true }
    });
    console.log('ADMIN_CHECK:', JSON.stringify(admin, null, 2));

    // If user is locked, unlock it so I can test again
    if (user && user.isDisabled) {
        console.log('Unlocking user...');
        await prisma.user.update({
            where: { email: 'manhquydevq@gmail.com' },
            data: { isDisabled: false }
        });
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
