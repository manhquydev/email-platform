/**
 * Ephemera CLI Configuration Management
 */

import Conf from 'conf';

interface ConfigSchema {
  apiKey: string;
  baseUrl: string;
  defaultExpireMinutes: number;
}

const config = new Conf<ConfigSchema>({
  projectName: 'ephemera-cli',
  schema: {
    apiKey: { type: 'string', default: '' },
    baseUrl: { type: 'string', default: 'https://api.manhquy.click' },
    defaultExpireMinutes: { type: 'number', default: 60 },
  },
});

export function getApiKey(): string {
  return process.env.EPHEMERA_API_KEY || config.get('apiKey');
}

export function setApiKey(key: string): void {
  config.set('apiKey', key);
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
