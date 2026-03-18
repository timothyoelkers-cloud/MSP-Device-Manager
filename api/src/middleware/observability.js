// Observability Middleware
// Structured logging and request tracing for Azure Monitor / Application Insights

const { randomUUID } = require('crypto');

function requestLogger(handler) {
    return async function (request, context) {
        const requestId = request.headers.get('x-request-id') || randomUUID();
        const start = Date.now();
        const method = request.method;
        const url = new URL(request.url);
        const path = url.pathname;

        // Add request ID to context for downstream use
        context.requestId = requestId;

        const logEntry = {
            requestId,
            method,
            path,
            query: url.search,
            userAgent: request.headers.get('user-agent')?.slice(0, 100),
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            timestamp: new Date().toISOString(),
        };

        try {
            const response = await handler(request, context);
            const duration = Date.now() - start;

            context.log({
                ...logEntry,
                status: response.status,
                duration,
                level: response.status >= 500 ? 'error' : response.status >= 400 ? 'warn' : 'info',
            });

            // Add tracing headers to response
            const headers = { ...response.headers };
            headers['x-request-id'] = requestId;
            headers['x-response-time'] = `${duration}ms`;

            return { ...response, headers };
        } catch (error) {
            const duration = Date.now() - start;

            context.error({
                ...logEntry,
                status: 500,
                duration,
                level: 'error',
                error: {
                    message: error.message,
                    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
                },
            });

            return {
                status: 500,
                jsonBody: { error: 'Internal server error', requestId },
                headers: {
                    'x-request-id': requestId,
                    'x-response-time': `${duration}ms`,
                },
            };
        }
    };
}

module.exports = { requestLogger };
