import { FastifyInstance } from 'fastify';
import { AdminRole, requireAdminRole } from '../../middleware/rbac';
import { PstImportService } from '../../services/migration/pst-import';
import { MboxImportService } from '../../services/migration/mbox-import';
import { ImapSyncService } from '../../services/migration/imap-sync';

export default async function adminMigrationRoutes(fastify: FastifyInstance) {

  // Start IMAP Sync Job
  fastify.post('/imap-sync', {
    preHandler: requireAdminRole([AdminRole.SUPER_ADMIN, AdminRole.ORG_ADMIN])
  }, async (req, reply) => {
    const { sourceHost, sourcePort, sourceUser, sourcePass, targetInboxId, useSsl } = req.body as any;

    // In a real queue system (Bull/Redis), we'd add a job here
    // For MVP, we start async process
    ImapSyncService.startSync(
      { host: sourceHost, port: sourcePort, user: sourceUser, pass: sourcePass, tls: useSsl },
      targetInboxId
    ).catch(console.error);

    return { success: true, message: 'Migration started in background' };
  });

  // Upload PST for processing
  fastify.post('/upload-pst', {
    preHandler: requireAdminRole([AdminRole.SUPER_ADMIN, AdminRole.ORG_ADMIN])
  }, async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'No file' });

    const { targetInboxId } = (data.fields as any);

    // Save to temp storage
    const tempPath = `/tmp/${Date.now()}_${data.filename}`;
    // await pump(data.file, fs.createWriteStream(tempPath));

    // Trigger processing
    // PstImportService.processFile(tempPath, targetInboxId.value);

    return { success: true, message: 'PST upload received' };
  });

  // Upload MBOX for processing
  fastify.post('/upload-mbox', {
    preHandler: requireAdminRole([AdminRole.SUPER_ADMIN, AdminRole.ORG_ADMIN])
  }, async (req, reply) => {
    // Similar to PST
    return { success: true, message: 'MBOX upload received' };
  });
}
