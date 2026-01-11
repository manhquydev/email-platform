/**
 * Microsoft Clarity Deep Link Utilities
 * Generate URLs to Clarity dashboard with filters for recordings, heatmaps, etc.
 */

const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || '';
const CLARITY_BASE_URL = 'https://clarity.microsoft.com';

/**
 * Get Clarity dashboard URL for the project
 */
export function getClarityDashboardUrl(): string {
  return `${CLARITY_BASE_URL}/projects/view/${CLARITY_PROJECT_ID}/dashboard`;
}

/**
 * Get Clarity recordings URL with optional filters
 */
export function getClarityRecordingsUrl(filters?: {
  userId?: string;
  customTag?: string;
  url?: string;
}): string {
  const baseUrl = `${CLARITY_BASE_URL}/projects/view/${CLARITY_PROJECT_ID}/recordings`;

  if (!filters) return baseUrl;

  const params = new URLSearchParams();

  // Clarity uses specific filter syntax
  if (filters.userId) {
    params.set('filter', `custom.user_id:${filters.userId}`);
  }
  if (filters.customTag) {
    params.set('filter', filters.customTag);
  }
  if (filters.url) {
    params.set('filter', `url:${filters.url}`);
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Get Clarity heatmaps URL for a specific page
 */
export function getClarityHeatmapsUrl(pageUrl?: string): string {
  const baseUrl = `${CLARITY_BASE_URL}/projects/view/${CLARITY_PROJECT_ID}/heatmaps`;

  if (!pageUrl) return baseUrl;

  const params = new URLSearchParams();
  params.set('url', pageUrl);

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Get Clarity insights URL
 */
export function getClarityInsightsUrl(): string {
  return `${CLARITY_BASE_URL}/projects/view/${CLARITY_PROJECT_ID}/insights`;
}

/**
 * Check if Clarity is configured
 */
export function isClarityConfigured(): boolean {
  return Boolean(CLARITY_PROJECT_ID);
}
