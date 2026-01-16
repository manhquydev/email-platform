import { prisma } from "../lib/prisma";
import { verifyDomainOwnership } from "../utils/dns";
import { addDomainToPostfix } from "../utils/postfix-sync";
import { recordAudit } from "../utils/audit";

/**
 * Periodically checks DNS for PENDING domains and auto-verifies them.
 */
export const runDomainVerificationSweep = async (log: { info: Function; error: Function; warn?: Function }) => {
  try {
    // Find all unverified domains
    const pendingDomains = await prisma.domain.findMany({
      where: {
        status: "PENDING",
        // Only check domains that have an owner (system domains might be verified differently)
        ownerId: { not: null }
      },
      select: { id: true, name: true, verificationToken: true, ownerId: true }
    });

    if (pendingDomains.length === 0) return;

    log.info(`[DomainVerification] Checking ${pendingDomains.length} pending domains...`);

    let verifiedCount = 0;

    for (const domain of pendingDomains) {
      try {
        const isVerified = await verifyDomainOwnership(domain.name, domain.verificationToken);

        if (isVerified) {
          await prisma.domain.update({
            where: { id: domain.id },
            data: { status: "VERIFIED" }
          });

          // Sync with Postfix
          await addDomainToPostfix(domain.name);

          // Audit log
          if (domain.ownerId) {
            await recordAudit(domain.ownerId, "DOMAIN_VERIFIED", {
              domainId: domain.id,
              name: domain.name,
              method: "background_worker"
            });
          }

          log.info(`[DomainVerification] Successfully auto-verified ${domain.name}`);
          verifiedCount++;
        }
      } catch (domainErr) {
        log.error({ err: domainErr, domain: domain.name }, "Auto-verification failed for domain");
      }
    }

    if (verifiedCount > 0) {
      log.info(`[DomainVerification] Completed. Verified ${verifiedCount} domains.`);
    }
  } catch (err) {
    log.error({ err }, "Domain verification sweep failed");
  }
};
