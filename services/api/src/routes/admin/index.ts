/**
 * Admin Routes Index
 * Registers all admin route modules
 */

import { FastifyInstance } from "fastify";
import { adminStatsRoutes } from "./stats";
import { adminUsersRoutes } from "./users";
import { adminDomainsRoutes } from "./domains";
import { adminEmailsRoutes } from "./emails";
import { adminAuditRoutes } from "./audit";
import { adminPaymentsRoutes } from "./payments";
import { adminPackagesRoutes } from "./packages";
import { adminSystemRoutes } from "./system";
import { adminAnalyticsRoutes } from "./analytics";
import { adminTelegramRoutes } from "./telegram";
import { adminBackupRoutes } from "./backup";
import { notificationTemplateRoutes } from "./notification-templates";
import { notificationLogRoutes } from "./notification-logs";

export async function adminRoutes(app: FastifyInstance) {
    // Register all admin route modules
    await adminStatsRoutes(app);
    await adminUsersRoutes(app);
    await adminDomainsRoutes(app);
    await adminEmailsRoutes(app);
    await adminAuditRoutes(app);
    await adminPaymentsRoutes(app);
    await adminPackagesRoutes(app);
    await adminSystemRoutes(app);
    await adminAnalyticsRoutes(app);
    await adminTelegramRoutes(app);
    await adminBackupRoutes(app);

    // Notification management routes
    app.register(notificationTemplateRoutes, { prefix: '/notifications/templates' });
    app.register(notificationLogRoutes, { prefix: '/notifications/logs' });
}

// Re-export individual modules for selective use
export {
    adminStatsRoutes,
    adminUsersRoutes,
    adminDomainsRoutes,
    adminEmailsRoutes,
    adminAuditRoutes,
    adminPaymentsRoutes,
    adminPackagesRoutes,
    adminSystemRoutes,
    adminAnalyticsRoutes,
    adminTelegramRoutes,
    adminBackupRoutes,
};
