import crypto from "crypto";
import { appConfig } from "../config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a string using AES-256-GCM
 * Returns: iv:authTag:ciphertext (all hex encoded)
 */
export function encrypt(text: string): string {
    const key = Buffer.from(appConfig.totpEncryptionKey, "hex");
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string
 * Input format: iv:authTag:ciphertext (all hex encoded)
 */
export function decrypt(encryptedText: string): string {
    const key = Buffer.from(appConfig.totpEncryptionKey, "hex");
    const [ivHex, authTagHex, ciphertext] = encryptedText.split(":");

    if (!ivHex || !authTagHex || !ciphertext) {
        throw new Error("Invalid encrypted format");
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}
