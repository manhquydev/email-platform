/**
 * Postfix Relay Domains Sync Utility
 *
 * Syncs verified domains from database to Postfix relay_domains file.
 * This ensures Postfix accepts mail for all verified domains.
 */

import { prisma } from "../lib/prisma";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Path to relay_domains file (shared volume between API and Postfix)
const RELAY_DOMAINS_PATH = process.env.RELAY_DOMAINS_PATH || "/app/shared/relay_domains";

// Postfix container name for docker exec (fallback method)
const POSTFIX_CONTAINER = process.env.POSTFIX_CONTAINER || "email-platform-postfix-1";

interface SyncResult {
  success: boolean;
  method: "file" | "docker" | "skipped";
  domains: string[];
  error?: string;
}

/**
 * Get all verified domains from database
 */
export async function getVerifiedDomains(): Promise<string[]> {
  const domains = await prisma.domain.findMany({
    where: { status: "VERIFIED" },
    select: { name: true },
  });
  return domains.map((d) => d.name);
}

/**
 * Generate relay_domains content in Postfix format
 */
export function generateRelayDomainsContent(domains: string[]): string {
  // Postfix relay_domains format: domain OK
  const lines = domains.map((domain) => `${domain} OK`);
  if (lines.length === 0) return "";
  return lines.join("\n") + "\n";
}

/**
 * Sync domains via shared file (preferred method)
 */
async function syncViaFile(domains: string[]): Promise<SyncResult> {
  try {
    const content = generateRelayDomainsContent(domains);
    const dir = path.dirname(RELAY_DOMAINS_PATH);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write relay_domains file
    fs.writeFileSync(RELAY_DOMAINS_PATH, content, { encoding: "utf-8" });

    // Try to signal Postfix to reload (via marker file)
    const reloadMarker = path.join(dir, ".reload_postfix");
    fs.writeFileSync(reloadMarker, Date.now().toString());

    console.log(`[postfix-sync] Wrote ${domains.length} domains to ${RELAY_DOMAINS_PATH}`);

    return {
      success: true,
      method: "file",
      domains,
    };
  } catch (error) {
    console.error("[postfix-sync] File sync failed:", error);
    return {
      success: false,
      method: "file",
      domains,
      error: (error as Error).message,
    };
  }
}

/**
 * Sync domains via docker exec (fallback method)
 * Requires docker socket to be mounted
 */
async function syncViaDocker(domains: string[]): Promise<SyncResult> {
  try {
    const content = generateRelayDomainsContent(domains);

    // Escape content for shell
    const escapedContent = content.replace(/'/g, "'\\''");

    // Write to Postfix container and reload
    const cmd = `docker exec ${POSTFIX_CONTAINER} sh -c 'echo "${escapedContent}" > /etc/postfix/relay_domains && postmap lmdb:/etc/postfix/relay_domains && postfix reload'`;

    await execAsync(cmd);

    console.log(`[postfix-sync] Docker sync: ${domains.length} domains`);

    return {
      success: true,
      method: "docker",
      domains,
    };
  } catch (error) {
    console.error("[postfix-sync] Docker sync failed:", error);
    return {
      success: false,
      method: "docker",
      domains,
      error: (error as Error).message,
    };
  }
}

/**
 * Main sync function - tries file method first, falls back to docker
 */
export async function syncPostfixRelayDomains(): Promise<SyncResult> {
  // Skip in test environment
  if (process.env.NODE_ENV === "test") {
    return { success: true, method: "skipped", domains: [] };
  }

  const domains = await getVerifiedDomains();
  console.log(`[postfix-sync] Syncing ${domains.length} verified domains`);

  // Try file method first (if shared volume is configured)
  if (fs.existsSync(path.dirname(RELAY_DOMAINS_PATH))) {
    const fileResult = await syncViaFile(domains);
    if (fileResult.success) {
      return fileResult;
    }
  }

  // Fallback to docker method (if docker socket is available)
  try {
    await execAsync("docker --version");
    return await syncViaDocker(domains);
  } catch {
    console.log("[postfix-sync] Docker not available, skipping docker sync");
  }

  return {
    success: false,
    method: "skipped",
    domains,
    error: "No sync method available",
  };
}

/**
 * Add a single domain to Postfix relay_domains
 * Called after domain verification
 */
export async function addDomainToPostfix(domainName: string): Promise<SyncResult> {
  console.log(`[postfix-sync] Adding domain: ${domainName}`);

  // Full sync is safer than incremental update
  return await syncPostfixRelayDomains();
}

/**
 * Remove a domain from Postfix relay_domains
 * Called after domain deletion
 */
export async function removeDomainFromPostfix(domainName: string): Promise<SyncResult> {
  console.log(`[postfix-sync] Removing domain: ${domainName}`);

  // Full sync will exclude the deleted domain
  return await syncPostfixRelayDomains();
}
