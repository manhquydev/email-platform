/**
 * Ephemera CLI Configuration Management
 */

import Conf from 'conf';
import * as os from 'os';
import * as crypto from 'crypto';
import * as fs from 'fs';

interface ConfigSchema {
  apiKey: string;
  baseUrl: string;
  defaultExpireMinutes: number;
}

/**
 * Derive a stable per-machine obfuscation key so the config file is not
 * stored as plain text on disk.  This is obfuscation-at-rest, not true
 * secrecy — an attacker with file-system access can reconstruct the key from
 * the same public values.  A proper OS keychain integration (e.g.
 * @napi-rs/keyring) would be the stronger option but requires a native addon
 * dependency that complicates cross-platform installs; deferred for now.
 */
function deriveEncryptionKey(): string {
  const material = `${os.hostname()}:${os.userInfo().username}:ephemera-cli`;
  return crypto.createHash('sha256').update(material).digest('hex');
}

const config = new Conf<ConfigSchema>({
  projectName: 'ephemera-cli',
  encryptionKey: deriveEncryptionKey(),
  schema: {
    apiKey: { type: 'string', default: '' },
    baseUrl: { type: 'string', default: 'https://api.manhquy.click' },
    defaultExpireMinutes: { type: 'number', default: 60 },
  },
});

/**
 * Restrict config file permissions to owner-read/write only (0600) so that
 * other OS users cannot read the stored credentials.  Wrapped in try/catch
 * because chmod is not available on all platforms (e.g. Windows).
 */
function lockConfigFilePerms(): void {
  try {
    fs.chmodSync(config.path, 0o600);
  } catch {
    // Non-POSIX platforms (Windows) do not support Unix permissions; skip.
  }
}

export function getApiKey(): string {
  return process.env.EPHEMERA_API_KEY || config.get('apiKey');
}

export function setApiKey(key: string): void {
  config.set('apiKey', key);
  lockConfigFilePerms();
}

export function getBaseUrl(): string {
  return process.env.EPHEMERA_BASE_URL || config.get('baseUrl');
}

export function setBaseUrl(url: string): void {
  config.set('baseUrl', url);
}

export function getDefaultExpire(): number {
  return config.get('defaultExpireMinutes');
}

export function setDefaultExpire(minutes: number): void {
  config.set('defaultExpireMinutes', minutes);
}

export function clearConfig(): void {
  config.clear();
}

export function isAuthenticated(): boolean {
  return !!getApiKey();
}

export { config };
