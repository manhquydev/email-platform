const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const pkg1 = await prisma.servicePackage.create({
        data: {
            name: 'Professional Plan (Test)',
            description: 'Test Monthly Professional Plan',
            price: 199000,
            currency: 'VND',
            type: 'TIME_BASED',
            durationDays: 30,
            targetTier: 'PROFESSIONAL',
            stripePriceId: 'price_1Si6xEQfswxsecvcSZJbTGth',
            stripeProductId: 'prod_TfRqjhhxdRFbCv'
        }
    });
    console.log('Created package:', pkg1.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
