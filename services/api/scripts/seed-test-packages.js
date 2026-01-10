const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed ServicePackage data for Stripe sandbox testing
 * Run: node scripts/seed-test-packages.js
 */
async function main() {
    console.log('Seeding service packages...\n');

    // Clear existing packages (optional - comment out if you want to keep existing)
    await prisma.servicePackage.deleteMany({});
    console.log('Cleared existing packages\n');

    // Starter Monthly
    const starterMonthly = await prisma.servicePackage.upsert({
        where: { id: 'starter-monthly' },
        update: {},
        create: {
            id: 'starter-monthly',
            name: 'Gói Khởi Đầu (Tháng)',
            description: 'Dành cho cá nhân - Thanh toán hàng tháng',
            price: 99000,
            currency: 'VND',
            type: 'TIME_BASED',
            durationDays: 30,
            targetTier: 'STARTER',
            stripePriceId: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
            stripeProductId: process.env.STRIPE_PRODUCT_STARTER || '',
            isActive: true
        }
    });
    console.log('Created:', starterMonthly.name);

    // Starter Yearly
    const starterYearly = await prisma.servicePackage.upsert({
        where: { id: 'starter-yearly' },
        update: {},
        create: {
            id: 'starter-yearly',
            name: 'Gói Khởi Đầu (Năm)',
            description: 'Dành cho cá nhân - Tiết kiệm 20%',
            price: 950000,
            currency: 'VND',
            type: 'TIME_BASED',
            durationDays: 365,
            targetTier: 'STARTER',
            stripePriceId: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
            stripeProductId: process.env.STRIPE_PRODUCT_STARTER || '',
            isActive: true
        }
    });
    console.log('Created:', starterYearly.name);

    // Professional Monthly
    const proMonthly = await prisma.servicePackage.upsert({
        where: { id: 'professional-monthly' },
        update: {},
        create: {
            id: 'professional-monthly',
            name: 'Gói Chuyên Nghiệp (Tháng)',
            description: 'Ẩn danh & riêng tư tối đa - Thanh toán hàng tháng',
            price: 199000,
            currency: 'VND',
            type: 'TIME_BASED',
            durationDays: 30,
            targetTier: 'PROFESSIONAL',
            stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_1Si6xEQfswxsecvcSZJbTGth',
            stripeProductId: process.env.STRIPE_PRODUCT_PROFESSIONAL || 'prod_TfRqjhhxdRFbCv',
            isActive: true
        }
    });
    console.log('Created:', proMonthly.name);

    // Professional Yearly
    const proYearly = await prisma.servicePackage.upsert({
        where: { id: 'professional-yearly' },
        update: {},
        create: {
            id: 'professional-yearly',
            name: 'Gói Chuyên Nghiệp (Năm)',
            description: 'Ẩn danh & riêng tư tối đa - Tiết kiệm 20%',
            price: 1900000,
            currency: 'VND',
            type: 'TIME_BASED',
            durationDays: 365,
            targetTier: 'PROFESSIONAL',
            stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || '',
            stripeProductId: process.env.STRIPE_PRODUCT_PROFESSIONAL || '',
            isActive: true
        }
    });
    console.log('Created:', proYearly.name);

    console.log('\n✅ All packages seeded successfully!');
    console.log('\nNote: Update .env with actual Stripe Price IDs:');
    console.log('  STRIPE_PRICE_STARTER_MONTHLY=price_xxx');
    console.log('  STRIPE_PRICE_STARTER_YEARLY=price_xxx');
    console.log('  STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_xxx');
    console.log('  STRIPE_PRICE_PROFESSIONAL_YEARLY=price_xxx');
}

main()
    .catch((e) => {
        console.error('Error seeding packages:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
