/**
 * AI Summarization Service
 * Generates email summaries using Google Gemini API
 * Supports caching via database and tier-based access control
 */

import { appConfig } from '../config';
import { prisma } from '../lib/prisma';
import { TIER_LIMITS } from '../routes/billing';

interface SummarizationResult {
    summary: string;
    cached: boolean;
    creditCost: number;
}

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
    error?: {
        message: string;
        code: number;
    };
}

/**
 * AI Summarization Service class
 * Handles email summarization with Gemini API
 */
export class AISummarizationService {
    private static readonly GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

    /**
     * Check if AI features are enabled
     */
    static isEnabled(): boolean {
        return appConfig.ai.enabled && !!appConfig.ai.geminiApiKey;
    }

    /**
     * Check if user's tier has AI access
     */
    static hasTierAccess(tier: string): boolean {
        const tierKey = tier as keyof typeof TIER_LIMITS;
        const limits = TIER_LIMITS[tierKey] || TIER_LIMITS.FREE;
        // AI features available for STARTER+ tiers (those with API access)
        return limits.apiAccess === true;
    }

    /**
     * Get or generate summary for a message
     * Returns cached summary if available, otherwise generates new one
     */
    static async summarize(
        messageId: string,
        userId: string,
        forceRegenerate = false
    ): Promise<SummarizationResult> {
        // Fetch message with user tier
        const message = await prisma.message.findUnique({
            where: { id: messageId, deletedAt: null },
            select: {
                id: true,
                subject: true,
                fromAddress: true,
                textBody: true,
                htmlBody: true,
                aiSummary: true,
                aiSummarizedAt: true,
            },
        });

        if (!message) {
            throw new Error('Message not found');
        }

        // Return cached summary if available and not forcing regeneration
        if (message.aiSummary && message.aiSummarizedAt && !forceRegenerate) {
            return {
                summary: message.aiSummary,
                cached: true,
                creditCost: 0,
            };
        }

        // Generate new summary
        const emailContent = this.prepareEmailContent(message);
        const summary = await this.callGeminiAPI(emailContent);

        // Cache the summary in database
        await prisma.message.update({
            where: { id: messageId },
            data: {
                aiSummary: summary,
                aiSummarizedAt: new Date(),
            },
        });

        return {
            summary,
            cached: false,
            creditCost: appConfig.ai.summaryCreditCost,
        };
    }

    /**
     * Prepare email content for summarization
     * Strips HTML and limits content length
     */
    private static prepareEmailContent(message: {
        subject: string | null;
        fromAddress: string | null;
        textBody: string | null;
        htmlBody: string | null;
    }): string {
        // Prefer text body, fallback to stripped HTML
        let body = message.textBody || '';

        if (!body && message.htmlBody) {
            // Simple HTML stripping (remove tags)
            body = message.htmlBody
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // Limit content to ~4000 chars to stay within token limits
        const maxLength = 4000;
        if (body.length > maxLength) {
            body = body.substring(0, maxLength) + '... [truncated]';
        }

        return `Subject: ${message.subject || '(no subject)'}
From: ${message.fromAddress || 'unknown'}

${body}`;
    }

    /**
     * Call Gemini API to generate summary
     */
    private static async callGeminiAPI(emailContent: string): Promise<string> {
        const model = appConfig.ai.geminiModel;
        const apiKey = appConfig.ai.geminiApiKey;

        const prompt = `You are an email assistant. Summarize the following email in Vietnamese.
Provide a concise summary (2-4 sentences) that captures:
1. The main purpose/intent of the email
2. Key action items or requests (if any)
3. Important dates, numbers, or deadlines mentioned

Keep the tone professional and informative. If it's a promotional/spam email, simply state that.

Email:
${emailContent}

Summary (in Vietnamese):`;

        const url = `${this.GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 256,
                    topP: 0.8,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', errorText);
            throw new Error(`AI service error: ${response.status}`);
        }

        const data: GeminiResponse = await response.json();

        if (data.error) {
            throw new Error(`AI service error: ${data.error.message}`);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error('AI service returned empty response');
        }

        return text.trim();
    }

    /**
     * Clear cached summary for a message
     */
    static async clearCache(messageId: string): Promise<void> {
        await prisma.message.update({
            where: { id: messageId },
            data: {
                aiSummary: null,
                aiSummarizedAt: null,
            },
        });
    }

    /**
     * Batch summarize multiple messages (for future use)
     */
    static async batchSummarize(
        messageIds: string[],
        userId: string
    ): Promise<Map<string, SummarizationResult>> {
        const results = new Map<string, SummarizationResult>();

        for (const messageId of messageIds) {
            try {
                const result = await this.summarize(messageId, userId, false);
                results.set(messageId, result);
            } catch (error) {
                console.error(`Failed to summarize message ${messageId}:`, error);
            }
        }

        return results;
    }
}
