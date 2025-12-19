import { FastifyRequest, FastifyReply } from 'fastify';
import { automationService } from '../services/automationService';

/**
 * Middleware to automatically process messages through automation rules
 */
export async function automationProcessor(request: FastifyRequest, reply: FastifyReply) {
  // Only process for message creation endpoints
  if (request.url.includes('/messages') && request.method === 'POST') {
    // Get message ID from response after creation
    // Store automation processing info for later
    (request as any).shouldProcessAutomation = true;
  }
}

/**
 * Hook to process inbound emails through automation rules
 */
export async function processInboundEmail(messageId: string, inboxId: string) {
  try {
    await automationService.processMessage(messageId, {
      metadata: {
        source: 'inbound'
      }
    });
  } catch (error) {
    console.error(`Failed to process automation for message ${messageId}:`, error);
  }
}