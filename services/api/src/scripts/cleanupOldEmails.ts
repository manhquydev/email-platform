import { PrismaClient } from '@prisma/client';
import { cleanupOldEmails } from '../middleware/quotaCheck';

const prisma = new PrismaClient();

async function runCleanup() {
  console.log('Starting email cleanup job...');

  try {
    const startTime = Date.now();

    // Run cleanup
    await cleanupOldEmails();

    const duration = Date.now() - startTime;
    console.log(`✅ Email cleanup completed in ${duration}ms`);

    // Log metrics
    const totalMessages = await prisma.message.count();
    const deletedMessages = await prisma.message.count({
      where: {
        deletedAt: {
          not: null
        }
      }
    });

    console.log(`📊 Total messages: ${totalMessages}`);
    console.log(`📊 Deleted messages: ${deletedMessages}`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EMAIL_CLEANUP_COMPLETED',
        meta: {
          duration,
          totalMessages,
          deletedMessages,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ Email cleanup failed:', error);

    // Log error
    await prisma.auditLog.create({
      data: {
        action: 'EMAIL_CLEANUP_FAILED',
        meta: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }
    });

    throw error;
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  runCleanup()
    .then(() => {
      console.log('Cleanup job completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup job failed:', error);
      process.exit(1);
    });
}

export { runCleanup };