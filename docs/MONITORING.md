# Observability & Monitoring

## Overview
Monitoring infrastructure using Sentry for error tracking and Pino for structured logging.

## Error Tracking (Sentry)

### Setup
1. Create account at [sentry.io](https://sentry.io)
2. Create new Next.js project
3. Copy DSN and add to environment variables:
   ```
   SENTRY_DSN=https://...@sentry.io/...
   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
   SENTRY_ORG=your-org
   SENTRY_PROJECT=your-project
   ```
4. Copy example configs:
   ```bash
   cp sentry.config.example.js sentry.config.js
   cp sentry.client.config.example.ts sentry.client.config.ts
   cp sentry.server.config.example.ts sentry.server.config.ts
   ```

### Features
- Automatic error capture on client and server
- Source map upload for debugging
- Performance monitoring
- Session replay for debugging user issues
- Custom error boundaries for graceful failure

## Structured Logging

### Logger Usage
```typescript
import { logger, createRequestLogger } from "~/server/logger";

// Basic logging
logger.info("User logged in");
logger.error({ err }, "Failed to process request");

// With request context
const reqLogger = createRequestLogger(requestId);
reqLogger.info({ userId }, "Processing order");
```

### Log Levels
- **debug**: Development details (dev only)
- **info**: General informational messages
- **warn**: Warning messages
- **error**: Error conditions
- **fatal**: Critical failures

### Sensitive Data
Automatically redacted fields:
- `password`
- `passwordHash`
- `token`
- `authorization`

Add more in `src/server/logger.ts` redact configuration.

## Health Checks

### Endpoints

#### `/api/health`
Returns overall service health including database connectivity.

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-29T...",
  "uptime": 1234.56,
  "service": "crowdiant-os",
  "environment": "production",
  "checks": {
    "database": "healthy"
  }
}
```

Status codes:
- `200`: All checks passing
- `503`: One or more checks failing

## Request Tracing

Every request gets a unique `x-request-id` header for correlation across logs and services.

Access in API routes:
```typescript
const requestId = request.headers.get("x-request-id");
const reqLogger = createRequestLogger(requestId);
```

## Database Monitoring

### Query Performance
Monitor slow queries via Prisma middleware (to be implemented):
```typescript
// Add to src/server/db.ts
db.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  const duration = after - before;
  if (duration > 1000) {
    logger.warn({ model: params.model, action: params.action, duration }, "Slow query detected");
  }
  
  return result;
});
```

## Alerts

### Sentry Alerts
Configure in Sentry dashboard:
- Error rate thresholds
- New issue notifications
- Performance degradation
- Custom metric alerts

### Recommended Alerts
- Error rate > 10 errors/min
- New error types
- Response time p95 > 2s
- Database connection failures

## Dashboard Access

### Sentry
- URL: https://sentry.io/organizations/[org]/projects/[project]
- Issues, performance, releases

### Logs (Development)
- Pretty-printed to console
- Production: Configure log aggregation service (Datadog, Logflare, etc.)

## Troubleshooting

### Sentry not capturing errors
- Verify DSN environment variables set
- Check network connectivity to Sentry
- Ensure config files exist (not .example)

### Logs not appearing
- Check LOG_LEVEL environment variable
- Verify logger imported correctly
- Check console/stdout in deployment

### Health check failing
- Check DATABASE_URL connectivity
- Verify Prisma client generated
- Review service logs for errors
