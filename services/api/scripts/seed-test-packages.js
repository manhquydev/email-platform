const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed ServicePackage data for VND pricing (Vietnam market)
 * Run: node scripts/seed-test-packages.js
 *
 * Pricing structure:
 * - STARTER: 49,000 VND/month, 470,000 VND/year (20% off)
 * - PROFESSIONAL: 99,000 VND/month, 950,000 VND/year (20% off)
 * - BUSINESS: 199,000 VND/month, 1,900,000 VND/year (20% off)
 * - ENTERPRISE: 499,000 VND/month, 4,790,000 VND/year (20% off)
 */
async function main() {
    console.log('Seeding service packages (VND pricing)...\n');

    // Clear existing packages
    await prisma.servicePackage.deleteMany({});
    console.log('Cleared existing packages\n');

    // === STARTER TIER ===
    const starterMonthly = await prisma.servicePackage.upsert({
        where: { id: 'starter-monthly' },
        update: {},
        create: {
            id: 'starter-monthly',
            name: 'Gói Khởi Đầu (Tháng)',
            description: 'Dành cho cá nhân và freelancer',
            price: 49000,
            currency: 'VND',
            type: 'TIME_BASED',
            durationDays: 30,
            targetTier: 'STARTER',
            stripePriceId: '',
            stripeProductId: '',
            isActive: true
        }
    });
    console.log('Created:', starterMonthly.name, '- 49,000 VND');

    const starterYearly = await prisma.servicePackage.upsert({
        where: { id: 'starter-yearly' },
        update: {},
        create: {
            id: 'starter-yearly',
            name: 'Gói Khởi Đầu (Năm)',
            description: 'Dành cho cá nhân - Tiết kiệm 20%',
            price: 470000,
            currency: 'VND',
            type: 'TIME_BASED',
            durationDays: 365,
            targetTier: 'STARTER',
            stripePriceId: '',
            stripeProductId: '',
            isActive: true
        }
    });
    console.log('Created:', starterYearly.name, '- 470,000 VND');

    // === PROFESSIONAL TIER ===
    const proMonthly = await prisma.servicePackage.upsert({
        where: { id: 'professional-monthly' },
        update: {},
        create: {
            id: 'professional-monthly',
            name: 'Gói Chuyên Nghiệp (Tháng)',
            description: 'Tốt nhất cho team đang phát triển',
            price: 99000,
            currency: 'VND',
            type: 'TIME_BASED',
            durationDays: 30,
            targetTier: 'PROFESSIONAL',
            stripePriceId: '',
            stripeProductId: '',
            isActive: true
        }
    });
    console.log('Created:', proMonthly.name, '- 99,000 VND');

    const proYearly = await prisma.servicePackage.upsert({
        where: { id: 'professional-yearly' },
        update: {},
        create: {
            id: 'professional-yearly',
            name: 'Gói Chuyên Nghiệp (Năm)',
            description: 'Tốt nhất cho team - Tiết kiệm 20%',
            price: 950000,
            currency: 'VND',
            type: 'TIME_BASED',
            durationDays: 365,
            targetTier: 'PROFESSIONAL',
            stripePriceId: '',
            stripeProductId: '',
            isActive: true
        }
    });
    console.log('Created:', proYearly.name, '- 950,000 VND');

    // === BUSINESS TIER (NEW) ===
    const businessMonthly = await prisma.servicePackage.upsert({
        where: { id: 'business-monthly' },
        update: {},
        create: {
            id: 'business-monthly',
            name: 'Gói Doanh Nghiệp (Tháng)',
            description: 'Dành cho doanh nghiệp vừa và nhỏ',
            price: 199000,
            currency: 'VND',
            type: 'TIME_BASED',
            durationDays: 30,
            targetTier: 'BUSINESS',
            stripePriceId: '',
            stripeProductId: '',
            isActive: true
        }
    });
    console.log('Created:', businessMonthly.name, '- 199,000 VND');

    const businessYearly = await prisma.servicePackage.upsert({
        where: { id: 'business-yearly' },
        update: {},
        create: {
            id: 'business-yearly',
            name: 'Gói Doanh Nghiệp (Năm)',
            description: 'Dành cho doanh nghiệp - Tiết kiệm 20%',
            price: 1900000,
            currency: 'VND',
            type: 'TIME_BASED',
            durationDays: 365,
            targetTier: 'BUSINESS',
            stripePriceId: '',
            stripeProductId: '',
            isActive: true
        }
    });
    console.log('Created:', businessYearly.name, '- 1,900,000 VND');

    // === ENTERPRISE TIER ===
    const enterpriseMonthly = await prisma.servicePackage.upsert({
        where: { id: 'enterprise-monthly' },
        update: {},
        create: {
            id: 'enterprise-monthly',
            name: 'Gói Enterprise (Tháng)',
            description: 'Dành cho tổ chức lớn',
            price: 499000,
            currency: 'VND',
            type: 'TIME_BASED',
            durationDays: 30,
            targetTier: 'ENTERPRISE',
            stripePriceId: '',
            stripeProductId: '',
            isActive: true
        }
    });
    console.log('Created:', enterpriseMonthly.name, '- 499,000 VND');

    const enterpriseYearly = await prisma.servicePackage.upsert({
        where: { id: 'enterprise-yearly' },
        update: {},
        create: {
            id: 'enterprise-yearly',
            name: 'Gói Enterprise (Năm)',
            description: 'Dành cho tổ chức lớn - Tiết kiệm 20%',
            price: 4790000,
            currency: 'VND',
            type: 'TIME_BASED',
            durationDays: 365,
            targetTier: 'ENTERPRISE',
            stripePriceId: '',
            stripeProductId: '',
            isActive: true
        }
    });
    console.log('Created:', enterpriseYearly.name, '- 4,790,000 VND');

    console.log('\n✅ All packages seeded successfully!');
    console.log('\nPricing Summary (VND):');
    console.log('  STARTER:      49,000/tháng  | 470,000/năm');
    console.log('  PROFESSIONAL: 99,000/tháng  | 950,000/năm');
    console.log('  BUSINESS:     199,000/tháng | 1,900,000/năm');
    console.log('  ENTERPRISE:   499,000/tháng | 4,790,000/năm');
}

main()
    .catch((e) => {
        console.error('Error seeding packages:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
