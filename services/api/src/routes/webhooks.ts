/**
 * Webhook Routes
 * Handles inbound webhooks from email providers
 */

import { FastifyPluginAsync } from 'fastify';
import { webhookService } from '../services/webhookService';

export const webhookRoutes: FastifyPluginAsync = async (app) => {
    // Generic webhook endpoint that detects provider
    app.post('/webhooks', async (req, reply) => {
        const provider = req.headers['x-provider'] as string;
        const userAgent = req.headers['user-agent'];

        // Auto-detect provider from headers if not specified
        let detectedProvider = provider;

        if (!detectedProvider) {
            if (req.body?.Message) {
                detectedProvider = 'ses'; // SNS message format
            } else if (userAgent?.includes('Mailgun')) {
                detectedProvider = 'mailgun';
            } else if (req.headers['x-twilio-email-event-notify-signature']) {
                detectedProvider = 'sendgrid';
            }
        }

        switch (detectedProvider) {
            case 'ses':
                return webhookService.handleSesWebhook(req, reply);

            case 'sendgrid':
                return webhookService.handleSendgridWebhook(req, reply);

            case 'mailgun':
                return webhookService.handleMailgunWebhook(req, reply);

            default:
                console.log('Unknown webhook provider:', { provider, headers: req.headers });
                reply.status(400).send({ error: 'Unknown provider' });
        }
    });

    // Dedicated SES webhook endpoint
    app.post('/webhooks/ses', async (req, reply) => {
        return webhookService.handleSesWebhook(req, reply);
    });

    // Dedicated SendGrid webhook endpoint
    app.post('/webhooks/sendgrid', async (req, reply) => {
        return webhookService.handleSendgridWebhook(req, reply);
    });

    // Dedicated Mailgun webhook endpoint
    app.post('/webhooks/mailgun', async (req, reply) => {
        return webhookService.handleMailgunWebhook(req, reply);
    });

    // Health check for webhooks
    app.get('/webhooks/health', async () => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            configuredProviders: {
                ses: !!process.env.AWS_ACCESS_KEY_ID,
                sendgrid: !!process.env.SENDGRID_API_KEY,
                mailgun: !!process.env.MAILGUN_API_KEY,
            },
        };
    });
};