/**
 * Seed script for visibility rule templates
 * Run with: npx ts-node src/scripts/seed-visibility-templates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  // Security Templates
  {
    name: 'Hide Password Reset Emails',
    description: 'Hides emails containing password reset links to protect account security',
    category: 'Security',
    ruleType: 'HIDE' as const,
    matchType: 'ANY' as const,
    conditions: [
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'password reset', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'reset your password', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'forgot password', negate: false },
    ],
    isSystem: true,
  },
  {
    name: 'Hide Verification Codes',
    description: 'Hides emails containing OTP, 2FA, or verification codes',
    category: 'Security',
    ruleType: 'HIDE' as const,
    matchType: 'ANY' as const,
    conditions: [
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'verification code', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'OTP', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: '2FA', negate: false },
      { field: 'SUBJECT', operator: 'REGEX', value: '\\b\\d{4,6}\\b', negate: false },
    ],
    isSystem: true,
  },
  {
    name: 'Hide Login Alerts',
    description: 'Hides security alerts about new login attempts or sessions',
    category: 'Security',
    ruleType: 'HIDE' as const,
    matchType: 'ANY' as const,
    conditions: [
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'new sign-in', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'new login', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'security alert', negate: false },
    ],
    isSystem: true,
  },

  // Banking/Financial Templates
  {
    name: 'Hide Banking Notifications',
    description: 'Hides emails from banks containing sensitive financial information',
    category: 'Banking',
    ruleType: 'HIDE' as const,
    matchType: 'ANY' as const,
    conditions: [
      { field: 'FROM', operator: 'CONTAINS', value: 'bank', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'account statement', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'transaction', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'transfer', negate: false },
    ],
    isSystem: true,
  },
  {
    name: 'Redact Payment Confirmations',
    description: 'Shows payment emails but redacts sensitive details',
    category: 'Banking',
    ruleType: 'REDACT' as const,
    matchType: 'ANY' as const,
    conditions: [
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'payment confirmation', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'receipt', negate: false },
      { field: 'FROM', operator: 'CONTAINS', value: 'paypal', negate: false },
      { field: 'FROM', operator: 'CONTAINS', value: 'stripe', negate: false },
    ],
    isSystem: true,
  },

  // HR/Work Templates
  {
    name: 'Hide HR Communications',
    description: 'Hides sensitive HR emails about salary, benefits, or performance',
    category: 'HR',
    ruleType: 'HIDE' as const,
    matchType: 'ANY' as const,
    conditions: [
      { field: 'FROM', operator: 'CONTAINS', value: 'hr@', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'salary', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'performance review', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'benefits', negate: false },
    ],
    isSystem: true,
  },
  {
    name: 'Hide Job Applications',
    description: 'Hides emails related to job applications and interviews',
    category: 'HR',
    ruleType: 'HIDE' as const,
    matchType: 'ANY' as const,
    conditions: [
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'application received', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'interview', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'job offer', negate: false },
    ],
    isSystem: true,
  },

  // Privacy Templates
  {
    name: 'Hide Medical Emails',
    description: 'Hides emails from healthcare providers containing sensitive medical info',
    category: 'Privacy',
    ruleType: 'HIDE' as const,
    matchType: 'ANY' as const,
    conditions: [
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'appointment', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'prescription', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'test results', negate: false },
      { field: 'FROM', operator: 'CONTAINS', value: 'hospital', negate: false },
    ],
    isSystem: true,
  },
  {
    name: 'Warn on Personal Emails',
    description: 'Displays a warning on emails that may contain personal information',
    category: 'Privacy',
    ruleType: 'WARN' as const,
    matchType: 'ANY' as const,
    conditions: [
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'personal', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'private', negate: false },
      { field: 'SUBJECT', operator: 'CONTAINS', value: 'confidential', negate: false },
    ],
    isSystem: true,
  },

  // Spam/Marketing Templates
  {
    name: 'Hide High Spam Score',
    description: 'Hides emails with high spam scores',
    category: 'Spam',
    ruleType: 'HIDE' as const,
    matchType: 'ALL' as const,
    conditions: [
      { field: 'SPAM_SCORE', operator: 'GT', value: '5', negate: false },
    ],
    isSystem: true,
  },
  {
    name: 'Show Only Known Senders',
    description: 'Only shows emails from specific trusted domains',
    category: 'Whitelist',
    ruleType: 'SHOW_ONLY' as const,
    matchType: 'ANY' as const,
    conditions: [
      { field: 'FROM', operator: 'ENDS_WITH', value: '@gmail.com', negate: false },
      { field: 'FROM', operator: 'ENDS_WITH', value: '@outlook.com', negate: false },
      { field: 'FROM', operator: 'ENDS_WITH', value: '@yahoo.com', negate: false },
    ],
    isSystem: true,
  },
];

async function seedTemplates() {
  console.log('Seeding visibility rule templates...');

  for (const template of templates) {
    const existing = await prisma.visibilityRuleTemplate.findFirst({
      where: { name: template.name, isSystem: true },
    });

    if (existing) {
      console.log(`  Updating: ${template.name}`);
      await prisma.visibilityRuleTemplate.update({
        where: { id: existing.id },
        data: template,
      });
    } else {
      console.log(`  Creating: ${template.name}`);
      await prisma.visibilityRuleTemplate.create({
        data: template,
      });
    }
  }

  console.log(`Done! Seeded ${templates.length} templates.`);
}

seedTemplates()
  .catch((e) => {
    console.error('Error seeding templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
