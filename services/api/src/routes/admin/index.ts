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
};
