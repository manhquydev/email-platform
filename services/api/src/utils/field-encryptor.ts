import { encrypt, decrypt } from "./encryption";

/**
 * At-rest encryption for sensitive DB string fields (webhook signing secrets, etc.).
 *
 * Reuses the AES-256-GCM primitives in ./encryption (single key, single algorithm —
 * no second crypto scheme to manage). The helpers below add idempotency so the same
 * code path can encrypt-on-write for new rows AND back-fill existing plaintext rows
 * during migration without double-encrypting or crashing on legacy values.
 */

// A versioned envelope prefix marks values encrypted by THIS helper. A bare shape check on
// encrypt()'s "ivHex:authTagHex:ciphertextHex" output is unsafe here: ForwardingRule.webhookSecret
// is user-supplied, so a caller could submit a plaintext shaped like "32hex:32hex:hex" and have it
// mis-detected as already-encrypted (stored in the clear, then failing to decrypt on use). The
// prefix is something a real secret would essentially never start with.
const ENVELOPE_PREFIX = "fenc:v1:";

export function isEncrypted(value: string | null | undefined): boolean {
    return typeof value === "string" && value.startsWith(ENVELOPE_PREFIX);
}

/** Encrypt a field value, leaving already-encrypted values untouched (idempotent). */
export function encryptField(value: string): string {
    return isEncrypted(value) ? value : ENVELOPE_PREFIX + encrypt(value);
}

/**
 * Decrypt a stored field value. Values without the envelope prefix are returned verbatim, so
 * un-migrated legacy plaintext keeps working until the back-fill runs.
 */
export function decryptField(value: string): string {
    return isEncrypted(value) ? decrypt(value.slice(ENVELOPE_PREFIX.length)) : value;
}
