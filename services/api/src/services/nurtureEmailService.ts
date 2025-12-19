import { PrismaClient } from '@prisma/client';
import { sendEmail } from './emailService';

const prisma = new PrismaClient();

export class NurtureEmailService {
  // Send welcome email sequence
  async sendWelcomeSequence(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return;

    // Send initial welcome email
    await sendEmail({
      to: user.email,
      subject: 'Welcome to TempMail Pro! 🎉',
      template: 'welcome-free',
      data: {
        name: user.email.split('@')[0],
        email: user.email,
        tier: user.tier
      }
    });

    // Schedule follow-up emails
    await this.scheduleEmail(userId, 'getting-started', 1); // 1 day
    await this.scheduleEmail(userId, 'premium-features', 3); // 3 days
    await this.scheduleEmail(userId, 'usage-tips', 7); // 7 days
    await this.scheduleEmail(userId, 'upgrade-reminder', 14); // 14 days
    await this.scheduleEmail(userId, 'final-upgrade-offer', 21); // 21 days
  }

  // Send trial welcome sequence
  async sendTrialSequence(userId: string, trialTier: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return;

    // Send trial welcome email
    await sendEmail({
      to: user.email,
      subject: `Your ${trialTier} trial has started!`,
      template: 'trial-welcome',
      data: {
        name: user.email.split('@')[0],
        tier: trialTier,
        trialDays: 14
      }
    });

    // Schedule trial-specific emails
    await this.scheduleEmail(userId, 'trial-feature-highlight', 3);
    await this.scheduleEmail(userId, 'trial-ending-soon', 7);
    await this.scheduleEmail(userId, 'trial-last-chance', 10);
  }

  // Schedule an email to be sent later
  private async scheduleEmail(userId: string, template: string, delayDays: number) {
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + delayDays);

    await prisma.scheduledEmail.create({
      data: {
        userId,
        template,
        scheduledFor,
        status: 'scheduled'
      }
    });
  }

  // Process scheduled emails
  async processScheduledEmails() {
    const now = new Date();

    const pendingEmails = await prisma.scheduledEmail.findMany({
      where: {
        scheduledFor: {
          lte: now
        },
        status: 'scheduled'
      },
      include: {
        user: true
      }
    });

    for (const scheduledEmail of pendingEmails) {
      try {
        await this.sendNurtureEmail(scheduledEmail);

        // Mark as sent
        await prisma.scheduledEmail.update({
          where: { id: scheduledEmail.id },
          data: {
            status: 'sent',
            sentAt: new Date()
          }
        });
      } catch (error) {
        console.error(`Failed to send nurture email ${scheduledEmail.id}:`, error);

        // Mark as failed
        await prisma.scheduledEmail.update({
          where: { id: scheduledEmail.id },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }
  }

  // Send specific nurture email
  private async sendNurtureEmail(scheduledEmail: any) {
    const { user, template } = scheduledEmail;

    let subject = '';
    let templateData: any = { user };

    switch (template) {
      case 'getting-started':
        subject = 'Getting started with TempMail Pro';
        templateData = {
          ...templateData,
          dashboardUrl: `${process.env.WEB_URL}/app`,
          tutorialUrl: `${process.env.WEB_URL}/docs/getting-started`
        };
        break;

      case 'premium-features':
        subject = 'Unlock the full power of TempMail Pro';
        templateData = {
          ...templateData,
          pricingUrl: `${process.env.WEB_URL}/pricing`,
          features: [
            'Custom domains',
            'Advanced email filters',
            'Email automation',
            'API access',
            'Priority support'
          ]
        };
        break;

      case 'usage-tips':
        subject = 'Tips to get the most out of TempMail Pro';
        templateData = {
          ...templateData,
          tips: [
            'Use descriptive inbox names for better organization',
            'Set up auto-forwarding to your primary email',
            'Create filters to automatically sort incoming emails',
            'Use custom domains for a professional appearance'
          ]
        };
        break;

      case 'upgrade-reminder':
        subject = 'Ready to upgrade? More features await!';
        templateData = {
          ...templateData,
          currentUsage: await this.getUserUsageStats(user.id),
          upgradeUrl: `${process.env.WEB_URL}/pricing`
        };
        break;

      case 'final-upgrade-offer':
        subject = 'Last chance: Special offer on Premium!';
        templateData = {
          ...templateData,
          discount: '20%',
          discountCode: 'LAUNCH20',
          offerExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };
        break;

      case 'trial-feature-highlight':
        subject = 'Make the most of your trial';
        templateData = {
          ...templateData,
          features: this.getTierFeatures(user.tier)
        };
        break;

      case 'trial-ending-soon':
        subject = 'Your trial is ending soon';
        templateData = {
          ...templateData,
          daysLeft: 3,
          upgradeUrl: `${process.env.WEB_URL}/billing`
        };
        break;

      case 'trial-last-chance':
        subject = 'Last day of your trial!';
        templateData = {
          ...templateData,
          lastDay: true,
          upgradeUrl: `${process.env.WEB_URL}/billing`
        };
        break;

      default:
        subject = 'Update from TempMail Pro';
    }

    await sendEmail({
      to: user.email,
      subject,
      template: `nurture-${template}`,
      data: templateData
    });
  }

  // Get user usage stats
  private async getUserUsageStats(userId: string) {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [domainCount, inboxCount, emailCount] = await Promise.all([
      prisma.domain.count({
        where: {
          ownerId: userId,
          isActive: true
        }
      }),
      prisma.inbox.count({
        where: {
          domain: {
            ownerId: userId
          },
          isActive: true,
          deletedAt: null
        }
      }),
      prisma.message.count({
        where: {
          userId,
          createdAt: {
            gte: currentMonth
          }
        }
      })
    ]);

    return {
      domains: domainCount,
      inboxes: inboxCount,
      emails: emailCount
    };
  }

  // Get features for tier
  private getTierFeatures(tier: string) {
    const features = {
      premium: [
        { name: '10 Custom Domains', included: true },
        { name: '100 Temporary Inboxes', included: true },
        { name: '10,000 Emails/Month', included: true },
        { name: '1-Week Email Retention', included: true },
        { name: 'Custom Branding', included: true },
        { name: 'Advanced Filters', included: true },
        { name: 'Email Automation', included: true },
        { name: 'Priority Support', included: false }
      ],
      business: [
        { name: '100 Custom Domains', included: true },
        { name: '1,000 Temporary Inboxes', included: true },
        { name: '100,000 Emails/Month', included: true },
        { name: '30-Day Email Retention', included: true },
        { name: 'Custom Branding', included: true },
        { name: 'Advanced Filters', included: true },
        { name: 'Email Automation', included: true },
        { name: 'Priority Support', included: true }
      ]
    };

    return features[tier as keyof typeof features] || [];
  }

  // Re-engagement campaign for inactive users
  async sendReengagementEmails() {
    const inactiveThreshold = new Date();
    inactiveThreshold.setDate(inactiveThreshold.getDate() - 30); // 30 days ago

    const inactiveUsers = await prisma.user.findMany({
      where: {
        lastActiveAt: {
          lt: inactiveThreshold
        },
        tier: 'free',
        isDisabled: false
      }
    });

    for (const user of inactiveUsers) {
      // Check if we already sent a re-engagement email recently
      const recentEmail = await prisma.scheduledEmail.findFirst({
        where: {
          userId: user.id,
          template: 're-engagement',
          sentAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
          }
        }
      });

      if (!recentEmail) {
        await sendEmail({
          to: user.email,
          subject: 'We miss you! Here\'s what\'s new at TempMail Pro',
          template: 're-engagement',
          data: {
            name: user.email.split('@')[0],
            inactiveDays: Math.floor((Date.now() - user.lastActiveAt!.getTime()) / (1000 * 60 * 60 * 24)),
            newFeatures: [
              'Improved email filtering',
              'Faster delivery speeds',
              'New automation features',
              'Enhanced security'
            ]
          }
        });

        // Schedule follow-up
        await this.scheduleEmail(user.id, 're-engagement-followup', 3);
      }
    }
  }
}

/*
Add ScheduledEmail model to schema:

model ScheduledEmail {
  id          String   @id @default(uuid())
  userId      String
  template    String   // getting-started, premium-features, etc.
  scheduledFor DateTime
  status      String   @default("scheduled") // scheduled, sent, failed
  sentAt      DateTime?
  error       String?
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
  @@index([scheduledFor])
}
*/