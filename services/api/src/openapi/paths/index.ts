/**
 * OpenAPI Paths Index
 * Import all path definitions to register them with the registry
 */

// Import all path files to register them with the registry
import './auth';
import './inboxes';
import './messages';
import './webhooks';

// Re-export registry and generator
export { registry, generateOpenAPIDocument } from '../registry';
