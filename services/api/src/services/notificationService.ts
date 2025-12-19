import { PrismaClient, User } from '@prisma/client';
import { sendEmail } from './emailService';
import { getUserUsage } from '../middleware/quotaCheck';

const prisma = new PrismaClient();

interface NotificationData {
  userId: string;
  type: 'quota_warning' | 'quota_exceeded' | 'trial_ending' | 'upgrade_suggestion';
  data: any;
}

export class NotificationService {
  // Check and send quota warnings
  async checkQuotaWarnings() {
    const users = await prisma.user.findMany({
      where: {
        tier: {
          in: ['free', 'premium', 'business']
        },
        isDisabled: false
      },
      include: {
        userQuota: true
      }
    });

    for (const user of users) {
      if (!user.userQuota) continue;

      try {
        const usageInfo = await getUserUsage(user.id);
        await this.checkUserQuota(user, usageInfo);
      } catch (error) {
        console.error(`Failed to check quota for user ${user.id}:`, error);
      }
    }
  }

  // Check individual user quota
  private async checkUserQuota(user: User, usageInfo: any) {
    const { tier, limits, usage } = usageInfo;
    const warningsSent = await this.getWarningsSent(user.id);

    // Check domain quota (80% and 100%)
    if (limits.maxDomains !== -1) {
      const domainPercentage = (usage.domains / limits.maxDomains) * 100;

      if (domainPercentage >= 100 && !warningsSent.domain_exceeded) {
        await this.sendNotification(user.id, 'quota_exceeded', {
          resource: 'domain',
          current: usage.domains,
          limit: limits.maxDomains
        });
        await this.markWarningSent(user.id, 'domain_exceeded');
      } else if (domainPercentage >= 80 && !warningsSent.domain_warning) {
        await this.sendNotification(user.id, 'quota_warning', {
          resource: 'domain',
          current: usage.domains,
          limit: limits.maxDomains,
          percentage: Math.round(domainPercentage)
        });
        await this.markWarningSent(user.id, 'domain_warning');
      }
    }

    // Check inbox quota (80% and 100%)
    if (limits.maxInboxes !== -1) {
      const inboxPercentage = (usage.inboxes / limits.maxInboxes) * 100;

      if (inboxPercentage >= 100 && !warningsSent.inbox_exceeded) {
        await this.sendNotification(user.id, 'quota_exceeded', {
          resource: 'inbox',
          current: usage.inboxes,
          limit: limits.maxInboxes
        });
        await this.markWarningSent(user.id, 'inbox_exceeded');
      } else if (inboxPercentage >= 80 && !warningsSent.inbox_warning) {
        await this.sendNotification(user.id, 'quota_warning', {
          resource: 'inbox',
          current: usage.inboxes,
          limit: limits.maxInboxes,
          percentage: Math.round(inboxPercentage)
        });
        await this.markWarningSent(user.id, 'inbox_warning');
      }
    }

    // Check email quota (80% and 100%)
    if (limits.maxEmailsPerMonth !== -1) {
      const emailPercentage = (usage.emailsReceived / limits.maxEmailsPerMonth) * 100;

      if (emailPercentage >= 100 && !warningsSent.email_exceeded) {
        await this.sendNotification(user.id, 'quota_exceeded', {
          resource: 'email',
          current: usage.emailsReceived,
          limit: limits.maxEmailsPerMonth,
          resetsOn: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        });
        await this.markWarningSent(user.id, 'email_exceeded');
      } else if (emailPercentage >= 80 && !warningsSent.email_warning) {
        await this.sendNotification(user.id, 'quota_warning', {
          resource: 'email',
          current: usage.emailsReceived,
          limit: limits.maxEmailsPerMonth,
          percentage: Math.round(emailPercentage)
        });
        await this.markWarningSent(user.id, 'email_warning');
      }
    }
  }

  // Send notification
  async sendNotification(userId: string, type: string, data: any) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return;

    // Send email notification
    const emailTemplate = this.getEmailTemplate(type, data);
    await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      template: emailTemplate.template,
      data: { user, ...data, webUrl: process.env.WEB_URL }
    });

    // Create in-app notification record
    await prisma.notification.create({
      data: {
        userId,
        type: type as any,
        title: emailTemplate.title,
        message: emailTemplate.message,
        data: data as any,
        read: false
      }
    });

    console.log(`Sent ${type} notification to user ${userId}`);
  }

  // Get email template for notification
  private getEmailTemplate(type: string, data: any) {
    const templates: Record<string, any> = {
      quota_warning: {
        subject: `⚠️ Your ${data.resource} quota is almost full`,
        template: 'quota-warning',
        title: `Quota Warning`,
        message: `You've used ${data.percentage}% of your ${data.resource} limit (${data.current}/${data.limit})`
      },
      quota_exceeded: {
        subject: `🚫 Your ${data.resource} quota has been exceeded`,
        template: 'quota-exceeded',
        title: `Quota Exceeded`,
        message: `You've reached your ${data.resource} limit (${data.current}/${data.limit}). Upgrade to continue using this feature.`
      },
      trial_ending: {
        subject: '⏰ Your trial is ending soon',
        template: 'trial-ending',
        title: 'Trial Ending Soon',
        message: 'Your trial will end in 3 days. Upgrade to keep your premium features.'
      },
      upgrade_suggestion: {
        subject: '🚀 Upgrade to get more features',
        template: 'upgrade-suggestion',
        title: 'Upgrade Available',
        message: 'Based on your usage, we recommend upgrading to a higher tier for better value.'
      }
    };

    return templates[type] || templates.quota_warning;
  }

  // Mark warning as sent for this month
  private async markWarningSent(userId: string, warningType: string) {
    const key = `${warningType}_${new Date().toISOString().slice(0, 7)}`; // YYYY-MM

    await prisma.user.update({
      where: { id: userId },
      data: {
        // Use metadata field to store warnings
        settings: {
          [key]: true
        }
      }
    });
  }

  // Get warnings already sent for this month
  private async getWarningsSent(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true }
    });

    const warnings: any = {};
    const settings = user?.settings as any || {};
    const monthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Check all possible warning types
    const warningTypes = [
      'domain_warning',
      'domain_exceeded',
      'inbox_warning',
      'inbox_exceeded',
      'email_warning',
      'email_exceeded'
    ];

    warningTypes.forEach(type => {
      warnings[type] = settings[`${type}_${monthPrefix}`] || false;
    });

    return warnings;
  }

  // Get unread notifications for user
  async getUnreadNotifications(userId: string) {
    return await prisma.notification.findMany({
      where: {
        userId,
        read: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });
  }

  // Mark notification as read
  async markAsRead(userId: string, notificationId: string) {
    return await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        read: true
      }
    });
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true
      }
    });
  }

  // Delete old notifications (keep only last 100)
  async cleanupOldNotifications() {
    await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days old
        }
      }
    });
  }
}

// Add notification model to schema
/*
model Notification {
  id        String   @id @default(uuid())
  userId    String
  type      String   // quota_warning, quota_exceeded, trial_ending, upgrade_suggestion
  title     String
  message   String
  data      Json?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([read])
  @@index([type])
}
*/