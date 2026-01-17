/**
 * Structured Logging Utility - Phase 4 Code Quality
 * Provides consistent logging with context, timestamps, and metadata
 * Future: Can be extended to send logs to monitoring services (Sentry, LogRocket, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
    [key: string]: unknown;
}

interface LogEntry {
    level: LogLevel;
    context: string;
    message: string;
    timestamp: string;
    meta?: LogMeta;
}

/**
 * Format log entry for console output
 */
function formatLog(entry: LogEntry): string {
    const { level, context, message, timestamp } = entry;
    return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
}

/**
 * Get current ISO timestamp
 */
function getTimestamp(): string {
    return new Date().toISOString();
}

/**
 * Check if we're in development mode
 */
function isDev(): boolean {
    return import.meta.env.DEV;
}

/**
 * Structured logger with context-aware logging
 */
export const logger = {
    /**
     * Log debug information (only in development)
     */
    debug: (context: string, message: string, meta?: LogMeta): void => {
        if (!isDev()) return;

        const entry: LogEntry = {
            level: 'debug',
            context,
            message,
            timestamp: getTimestamp(),
            meta,
        };

        console.debug(formatLog(entry), meta || undefined);
    },

    /**
     * Log informational messages
     */
    info: (context: string, message: string, meta?: LogMeta): void => {
        const entry: LogEntry = {
            level: 'info',
            context,
            message,
            timestamp: getTimestamp(),
            meta,
        };

        console.info(formatLog(entry), meta ?? '');
    },

    /**
     * Log warning messages
     */
    warn: (context: string, message: string, meta?: LogMeta): void => {
        const entry: LogEntry = {
            level: 'warn',
            context,
            message,
            timestamp: getTimestamp(),
            meta,
        };

        console.warn(formatLog(entry), meta ?? '');
    },

    /**
     * Log error messages with Error object support
     */
    error: (context: string, error: Error | string, meta?: LogMeta): void => {
        const message = error instanceof Error ? error.message : error;
        const stack = error instanceof Error ? error.stack : undefined;

        const entry: LogEntry = {
            level: 'error',
            context,
            message,
            timestamp: getTimestamp(),
            meta: {
                ...meta,
                ...(stack && { stack }),
            },
        };

        console.error(formatLog(entry), entry.meta);

        // Future: Send to monitoring service
        // if (!isDev()) {
        //     sendToMonitoring(entry);
        // }
    },

    /**
     * Create a scoped logger with a fixed context
     */
    scope: (context: string) => ({
        debug: (message: string, meta?: LogMeta) => logger.debug(context, message, meta),
        info: (message: string, meta?: LogMeta) => logger.info(context, message, meta),
        warn: (message: string, meta?: LogMeta) => logger.warn(context, message, meta),
        error: (error: Error | string, meta?: LogMeta) => logger.error(context, error, meta),
    }),
};

export default logger;
