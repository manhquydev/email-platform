/**
 * Types for DeveloperSettings
 */

export interface ApiKey {
    id: string;
    prefix: string;
    name: string;
    createdAt: string;
    lastUsedAt?: string;
    key?: string; // Only present on creation response
}
