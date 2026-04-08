
import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export type ApiErrorEnvelope = {
    error: string;
    code?: string;
    details?: unknown;
};

type ApiErrorOptions = {
    code?: string;
    details?: unknown;
};

const hasValue = <T>(value: T | undefined): value is T => value !== undefined;
const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const defaultCodeByStatus: Record<number, string> = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "UNPROCESSABLE_ENTITY",
    429: "RATE_LIMITED",
    500: "INTERNAL_ERROR",
};

const deriveErrorCode = (statusCode: number, error: FastifyError): string | undefined => {
    const rawCode = typeof error.code === "string" && error.code.length > 0 ? error.code : undefined;
    if (rawCode) {
        return rawCode;
    }
    if (statusCode >= 500) {
        return defaultCodeByStatus[500];
    }
    return defaultCodeByStatus[statusCode];
};

const getStatusErrorCode = (statusCode: number): string =>
    statusCode >= 500 ? defaultCodeByStatus[500] : defaultCodeByStatus[statusCode] ?? defaultCodeByStatus[400];

export const sendApiError = (
    reply: FastifyReply,
    statusCode: number,
    error: string,
    options: ApiErrorOptions = {}
) => {
    const payload: ApiErrorEnvelope = {
        error,
        ...(hasValue(options.code) ? { code: options.code } : {}),
        ...(hasValue(options.details) ? { details: options.details } : {}),
    };

    return reply.status(statusCode).send(payload);
};

export const normalizeApiErrorPayload = (
    statusCode: number,
    payload: unknown
): ApiErrorEnvelope | null => {
    if (!isRecord(payload)) {
        return null;
    }

    const fallbackCode = getStatusErrorCode(statusCode);
    const payloadCode = typeof payload.code === "string" && payload.code.length > 0 ? payload.code : undefined;
    const details = hasValue(payload.details) ? payload.details : undefined;

    if (typeof payload.error === "string") {
        return {
            error: payload.error,
            code: payloadCode ?? fallbackCode,
            ...(hasValue(details) ? { details } : {}),
        };
    }

    if (payload.error === true && typeof payload.message === "string") {
        return {
            error: payload.message,
            code: payloadCode ?? fallbackCode,
            ...(hasValue(details) ? { details } : {}),
        };
    }

    if (typeof payload.message === "string") {
        return {
            error: payload.message,
            code: payloadCode ?? fallbackCode,
            ...(hasValue(details) ? { details } : {}),
        };
    }

    return null;
};

export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error({ err: error, reqId: request.id }, "Global Error Handler caught error");

    const statusCode = error.statusCode ?? 500;
    const isProduction = process.env.NODE_ENV === "production";

    const errorMessage =
        statusCode >= 500 && isProduction
            ? "Internal Server Error"
            : (error.message || "Internal Server Error");

    const details: Record<string, unknown> = {};

    if (Array.isArray((error as any).validation) && (error as any).validation.length > 0) {
        details.validation = (error as any).validation;
    }

    if (!isProduction && error.stack) {
        details.stack = error.stack;
    }

    const detailsPayload = Object.keys(details).length > 0 ? details : undefined;

    return sendApiError(reply, statusCode, errorMessage, {
        code: deriveErrorCode(statusCode, error),
        details: detailsPayload,
    });
};
