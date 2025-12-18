/**
 * Prisma Read Replica Client
 * Uses a separate connection for read-only queries to distribute load
 */

import { PrismaClient } from '@prisma/client';
import { appConfig } from '../config';

// Create a separate Prisma client for read operations
// This connects to the read replica if configured, otherwise uses primary
const prismaRead = new PrismaClient({
    datasources: {
        db: {
            url: appConfig.databaseReadUrl,
        },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

export { prismaRead };

/**
 * Usage pattern for read/write splitting:
 * 
 * // For WRITE operations (INSERT, UPDATE, DELETE)
 * import { prisma } from '../lib/prisma';
 * await prisma.user.create({ data: {...} });
 * 
 * // For READ operations (SELECT)
 * import { prismaRead } from '../lib/prismaRead';
 * const users = await prismaRead.user.findMany();
 * 
 * Benefits:
 * - Distributes read load to replica
 * - Keeps write operations on primary
 * - Improves overall database performance
 * - Enables horizontal read scaling
 */
