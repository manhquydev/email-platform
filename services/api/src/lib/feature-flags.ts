/**
 * Feature Flags - Cloud vs Community Edition
 * Phase 6: Open-Core & Community
 *
 * AGPL Core: Free, self-hostable
 * Cloud Edition: Proprietary features for hosted service
 */

// Cloud-only features (require paid subscription on hosted service)
const CLOUD_FEATURES = [
  'sso',                    // SSO/SAML authentication
  'audit-logs',             // Audit logging with export
  'priority-support',       // Priority support queue
  'data-broker-removal',    // Data broker removal service
  'breach-monitoring',      // HIBP integration (API costs)
  'advanced-analytics',     // Usage analytics dashboard
  'custom-domains-unlimited', // Unlimited custom domains
  'team-management',        // Team/org management
  'api-unlimited',          // Unlimited API requests
  'sla-guarantee',          // 99.9% uptime SLA
] as const;

type CloudFeature = typeof CLOUD_FEATURES[number];

// Edition detection
export type Edition = 'community' | 'cloud';

export function getEdition(): Edition {
  return process.env.EPHEMERA_EDITION === 'cloud' ? 'cloud' : 'community';
}

export function isCloudEdition(): boolean {
  return getEdition() === 'cloud';
}

export function isCommunityEdition(): boolean {
  return getEdition() === 'community';
}

/**
 * Check if a feature is available in current edition
 */
export function isFeatureEnabled(feature: string): boolean {
  // Cloud features only available in cloud edition
  if (CLOUD_FEATURES.includes(feature as CloudFeature)) {
    return isCloudEdition();
  }
  // All other features available in both editions
  return true;
}

/**
 * Check if feature is cloud-only
 */
export function isCloudFeature(feature: string): boolean {
  return CLOUD_FEATURES.includes(feature as CloudFeature);
}

/**
 * Get list of available features for current edition
 */
export function getAvailableFeatures(): string[] {
  const coreFeatures = [
    'ephemeral-inbox',
    'email-aliases',
    'passkey-auth',
    'otp-extraction',
    'phishing-detection',
    'email-forwarding',
    'api-access',
    'webhooks',
    'real-time-updates',
  ];

  if (isCloudEdition()) {
    return [...coreFeatures, ...CLOUD_FEATURES];
  }

  return coreFeatures;
}

/**
 * Get upgrade prompt for cloud-only feature
 */
export function getUpgradePrompt(feature: string): string | null {
  if (!isCloudFeature(feature)) return null;
  if (isCloudEdition()) return null;

  const prompts: Record<string, string> = {
    'sso': 'Upgrade to Cloud for SSO/SAML authentication',
    'audit-logs': 'Upgrade to Cloud for audit logging',
    'priority-support': 'Upgrade to Cloud for priority support',
    'data-broker-removal': 'Upgrade to Cloud for data broker removal',
    'breach-monitoring': 'Upgrade to Cloud for breach monitoring',
    'sla-guarantee': 'Upgrade to Cloud for 99.9% uptime SLA',
  };

  return prompts[feature] || `Upgrade to Cloud for ${feature}`;
}

/**
 * Feature gate middleware factory
 */
export function requireFeature(feature: string) {
  return (request: any, reply: any, done: () => void) => {
    if (!isFeatureEnabled(feature)) {
      return reply.status(402).send({
        error: 'Feature not available',
        feature,
        edition: getEdition(),
        upgrade: getUpgradePrompt(feature),
      });
    }
    done();
  };
}

/**
 * Edition info for API responses
 */
export function getEditionInfo() {
  return {
    edition: getEdition(),
    features: getAvailableFeatures(),
    cloudFeatures: CLOUD_FEATURES,
    isCloud: isCloudEdition(),
  };
}
