import { prisma } from "../lib/prisma";
import { verifyDomainOwnership } from "../utils/dns";
import { addDomainToPostfix } from "../utils/postfix-sync";
import { recordAudit } from "../utils/audit";

const DEFAULT_VERIFIED_DOMAIN_ALIASES = ["postmaster", "info", "admin", "contact"];

const shouldAutoProvisionDefaultInboxes = () =>
  (process.env.AUTO_PROVISION_DEFAULT_INBOXES_ON_VERIFY ?? "true").toLowerCase() === "true";

const getDefaultAliases = () => {
  const raw = process.env.DEFAULT_VERIFIED_DOMAIN_ALIASES;
  const aliases = (raw ? raw.split(",") : DEFAULT_VERIFIED_DOMAIN_ALIASES)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(aliases));
};

export const ensureDefaultInboxesForVerifiedDomain = async (domainId: string) => {
  const aliases = getDefaultAliases();
  if (!shouldAutoProvisionDefaultInboxes() || aliases.length === 0) {
    return { created: 0, restored: 0, skipped: true, aliases };
  }

  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { id: true, ownerId: true, organizationId: true },
  });
  if (!domain) {
    return { created: 0, restored: 0, skipped: true, aliases };
  }

  const existing = await prisma.inbox.findMany({
    where: { domainId: domain.id, localPart: { in: aliases } },
    select: { id: true, localPart: true, deletedAt: true },
  });

  const existingByLocalPart = new Map(existing.map((item) => [item.localPart, item]));
  const toRestore = existing.filter((item) => item.deletedAt !== null).map((item) => item.id);
  if (toRestore.length > 0) {
    await prisma.inbox.updateMany({
      where: { id: { in: toRestore } },
      data: { deletedAt: null },
    });
  }

  const missing = aliases.filter((alias) => !existingByLocalPart.has(alias));
  let created = 0;
  if (missing.length > 0) {
    const result = await prisma.inbox.createMany({
      data: missing.map((localPart) => ({
        domainId: domain.id,
        localPart,
        ownerId: domain.ownerId,
        organizationId: domain.organizationId,
      })),
      skipDuplicates: true,
    });
    created = result.count;
  }

  return { created, restored: toRestore.length, skipped: false, aliases };
};

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
          const previousStatus = "PENDING";
          await prisma.domain.update({
            where: { id: domain.id },
            data: { status: "VERIFIED" }
          });

          // Sync with Postfix
          const syncResult = await addDomainToPostfix(domain.name);
          if (!syncResult.success) {
            await prisma.domain.update({
              where: { id: domain.id },
              data: { status: previousStatus }
            });
            log.warn?.({ domain: domain.name, error: syncResult.error }, "Postfix sync failed after auto-verify");
            continue;
          }

          const provisioned = await ensureDefaultInboxesForVerifiedDomain(domain.id);
          if (!provisioned.skipped && (provisioned.created > 0 || provisioned.restored > 0)) {
            log.info(
              `[DomainVerification] Provisioned default inboxes for ${domain.name} (created=${provisioned.created}, restored=${provisioned.restored})`
            );
          }

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
