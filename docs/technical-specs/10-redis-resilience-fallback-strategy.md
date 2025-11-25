# Redis Resilience & Fallback Strategy

**Author:** System Architect
**Date:** 2025-11-26
**Version:** 1.0

---

## Overview

This document defines the resilience strategy for Redis failures in Crowdiant Restaurant OS. Redis is used for caching, session storage, and BullMQ job queues. While critical for performance, the system must remain operational when Redis is unavailable.

**Design Principle:** Redis is a performance optimization, not a dependency. The system must gracefully degrade when Redis fails rather than becoming completely unavailable.

---

## Redis Usage Patterns

| Use Case | Criticality | Failure Impact | Fallback Strategy |
|----------|-------------|----------------|-------------------|
| Trust Score Cache | Medium | Slower queries | Query PostgreSQL directly |
| Menu Item Cache | Medium | Slower page loads | Query PostgreSQL + warn staff |
| Session Storage | High | Auth failures | Use JWT tokens + database sessions |
| Table Status Cache | Low | Socket.io as primary | Skip cache, use Socket.io only |
| BullMQ Job Queue | High | Jobs don't process | Use in-memory queue + log warning |
| Rate Limiting | Medium | No rate limits | Allow requests, log to Sentry |
| Active Tab Counts | Low | Dashboard missing data | Query PostgreSQL for counts |

---

## Failure Detection

### Health Check Implementation

```typescript
// lib/redis/health.ts

import { redis } from './client';
import { logger } from '../monitoring/logger';

let redisAvailable = true;
let lastHealthCheck = Date.now();
const HEALTH_CHECK_INTERVAL = 10_000; // 10 seconds

export async function checkRedisHealth(): Promise<boolean> {
  const now = Date.now();
  
  // Don't check too frequently
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return redisAvailable;
  }
  
  try {
    await redis.ping();
    
    if (!redisAvailable) {
      logger.info('Redis connection restored');
      redisAvailable = true;
    }
    
    lastHealthCheck = now;
    return true;
  } catch (error) {
    if (redisAvailable) {
      logger.error('Redis connection failed', { error });
      redisAvailable = false;
      
      // Alert on-call
      await alertRedisFailure(error);
    }
    
    lastHealthCheck = now;
    return false;
  }
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

async function alertRedisFailure(error: any) {
  // Send to Sentry
  Sentry.captureException(error, {
    tags: { component: 'redis', severity: 'critical' },
  });
  
  // Send to PagerDuty or similar
  // await pagerDuty.alert({ title: 'Redis connection failed', ...error });
}
```

### Connection Resilience

```typescript
// lib/redis/client.ts

import { Redis } from 'ioredis';
import { logger } from '../monitoring/logger';

export const redis = new Redis(process.env.REDIS_URL!, {
  // Connection settings
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  
  // Reconnection settings
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect if Redis is in readonly mode
      return true;
    }
    return false;
  },
  
  // Timeouts
  connectTimeout: 5000,
  commandTimeout: 3000,
  
  // Error handling
  lazyConnect: true,
  showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
});

// Event handlers
redis.on('error', (error) => {
  logger.error('Redis error', { error });
});

redis.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

// Initialize connection
redis.connect().catch((error) => {
  logger.error('Failed to connect to Redis', { error });
});
```

---

## Fallback Strategies by Use Case

### 1. Trust Score Caching

**Normal Flow:**
1. Check Redis for cached trust score
2. If cache hit, return immediately
3. If cache miss, query PostgreSQL and cache result

**Fallback Flow (Redis Down):**
1. Skip Redis check
2. Query PostgreSQL directly
3. Log warning (not error) to Sentry
4. Continue operation normally

**Implementation:**

```typescript
// lib/trust/trust-score.ts

import { redis, isRedisAvailable } from '../redis/client';
import { prisma } from '../prisma';
import { logger } from '../monitoring/logger';

export async function getTrustScore(
  customerId: string, 
  venueId: string
): Promise<number> {
  const cacheKey = `trust:${customerId}:${venueId}`;
  
  // Try cache first (if Redis available)
  if (isRedisAvailable()) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        return parseInt(cached, 10);
      }
    } catch (error) {
      // Redis failed mid-operation, fall through to DB
      logger.warn('Redis get failed for trust score, using DB', { 
        customerId, 
        venueId, 
        error 
      });
    }
  }
  
  // Cache miss or Redis unavailable - query database
  const score = await calculateTrustScoreFromDB(customerId, venueId);
  
  // Try to cache result (if Redis available)
  if (isRedisAvailable()) {
    try {
      await redis.setex(cacheKey, 3600, score.toString());
    } catch (error) {
      // Cache write failure is non-critical
      logger.warn('Failed to cache trust score', { error });
    }
  }
  
  return score;
}

async function calculateTrustScoreFromDB(
  customerId: string,
  venueId: string
): Promise<number> {
  const events = await prisma.trustEvent.findMany({
    where: { 
      customerId, 
      venueId,
      createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // 90 days
    },
    orderBy: { createdAt: 'desc' },
  });
  
  // Calculate score based on events
  // (See Trust Scoring Technical Spec for algorithm)
  return calculateScore(events);
}
```

---

### 2. Session Storage

**Normal Flow:**
- NextAuth stores sessions in Redis for fast access
- Session verified on each request via middleware

**Fallback Flow (Redis Down):**
- Use database session store as fallback
- Slightly slower but fully functional
- JWT tokens still work (stateless)

**Implementation:**

```typescript
// lib/auth/session-adapter.ts

import { PrismaAdapter } from "@auth/prisma-adapter";
import { redis, isRedisAvailable } from '../redis/client';
import { prisma } from '../prisma';

export const sessionAdapter = {
  async getSession(sessionToken: string) {
    // Try Redis first
    if (isRedisAvailable()) {
      try {
        const cached = await redis.get(`session:${sessionToken}`);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        // Fall through to database
      }
    }
    
    // Fallback to database
    return await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });
  },
  
  async setSession(session: Session) {
    // Write to database (source of truth)
    const dbSession = await prisma.session.create({
      data: session,
    });
    
    // Cache in Redis (if available)
    if (isRedisAvailable()) {
      try {
        await redis.setex(
          `session:${session.sessionToken}`,
          3600,
          JSON.stringify(dbSession)
        );
      } catch (error) {
        // Non-critical, database is source of truth
      }
    }
    
    return dbSession;
  },
  
  async deleteSession(sessionToken: string) {
    // Delete from database
    await prisma.session.delete({
      where: { sessionToken },
    });
    
    // Delete from cache (if available)
    if (isRedisAvailable()) {
      try {
        await redis.del(`session:${sessionToken}`);
      } catch (error) {
        // Non-critical
      }
    }
  },
};
```

---

### 3. BullMQ Job Queue

**Normal Flow:**
- Jobs queued in Redis via BullMQ
- Workers process jobs asynchronously
- Used for: email notifications, SMS, report generation

**Fallback Flow (Redis Down):**
- Use in-memory job queue (non-persistent)
- Process jobs immediately if possible
- Critical jobs (payment notifications) execute synchronously
- Log all jobs to database for replay when Redis restored

**Implementation:**

```typescript
// lib/queue/resilient-queue.ts

import { Queue, Worker } from 'bullmq';
import { redis, isRedisAvailable } from '../redis/client';
import { logger } from '../monitoring/logger';

class ResilientQueue {
  private bullQueue?: Queue;
  private inMemoryQueue: Array<{ name: string; data: any }> = [];
  
  constructor(private queueName: string) {
    if (isRedisAvailable()) {
      this.initializeBullQueue();
    }
  }
  
  private initializeBullQueue() {
    this.bullQueue = new Queue(this.queueName, {
      connection: redis,
    });
  }
  
  async add(jobName: string, data: any, options?: any) {
    // Log job to database for audit trail
    await this.logJobToDatabase(jobName, data);
    
    // Try BullMQ first
    if (isRedisAvailable() && this.bullQueue) {
      try {
        return await this.bullQueue.add(jobName, data, options);
      } catch (error) {
        logger.error('BullMQ add failed, using fallback', { error });
      }
    }
    
    // Fallback: Execute immediately or queue in memory
    if (this.isCriticalJob(jobName)) {
      // Critical jobs (payment notifications) - execute immediately
      logger.warn('Executing critical job immediately (Redis down)', { jobName });
      await this.executeJobImmediately(jobName, data);
    } else {
      // Non-critical jobs - queue in memory
      logger.warn('Queueing job in memory (Redis down)', { jobName });
      this.inMemoryQueue.push({ name: jobName, data });
      
      // Alert if in-memory queue grows too large
      if (this.inMemoryQueue.length > 100) {
        logger.error('In-memory job queue overflowing', {
          queueSize: this.inMemoryQueue.length,
        });
      }
    }
  }
  
  private isCriticalJob(jobName: string): boolean {
    const criticalJobs = [
      'payment-notification',
      'express-checkout-complete',
      'payment-failed-alert',
    ];
    return criticalJobs.includes(jobName);
  }
  
  private async executeJobImmediately(jobName: string, data: any) {
    const handler = this.getJobHandler(jobName);
    if (handler) {
      await handler(data);
    }
  }
  
  private getJobHandler(jobName: string): ((data: any) => Promise<void>) | null {
    // Map job names to handlers
    const handlers = {
      'payment-notification': sendPaymentNotification,
      'express-checkout-complete': sendExpressCheckoutComplete,
      'payment-failed-alert': sendPaymentFailedAlert,
    };
    return handlers[jobName] || null;
  }
  
  private async logJobToDatabase(jobName: string, data: any) {
    await prisma.jobLog.create({
      data: {
        jobName,
        jobData: JSON.stringify(data),
        status: 'PENDING',
        createdAt: new Date(),
      },
    });
  }
  
  async processInMemoryQueue() {
    if (this.inMemoryQueue.length === 0) return;
    
    logger.info('Processing in-memory job queue', {
      queueSize: this.inMemoryQueue.length,
    });
    
    while (this.inMemoryQueue.length > 0) {
      const job = this.inMemoryQueue.shift()!;
      
      try {
        if (isRedisAvailable() && this.bullQueue) {
          // Redis is back - add to BullMQ
          await this.bullQueue.add(job.name, job.data);
        } else {
          // Still down - execute immediately
          await this.executeJobImmediately(job.name, job.data);
        }
      } catch (error) {
        logger.error('Failed to process in-memory job', { job, error });
      }
    }
  }
}

// Periodically check if Redis is back and process queued jobs
setInterval(async () => {
  if (isRedisAvailable()) {
    // Process in-memory queues for all queue instances
    // (Implementation detail: maintain global registry of queues)
  }
}, 30_000); // Every 30 seconds
```

---

### 4. Rate Limiting

**Normal Flow:**
- Track request counts in Redis with expiring keys
- Block requests exceeding limits

**Fallback Flow (Redis Down):**
- Allow all requests (fail open, not fail closed)
- Log warning to Sentry for monitoring
- Use application-level throttling as backup

**Implementation:**

```typescript
// lib/rate-limit/rate-limiter.ts

import { redis, isRedisAvailable } from '../redis/client';
import { logger } from '../monitoring/logger';

export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rate_limit:${identifier}`;
  
  if (!isRedisAvailable()) {
    // Fail open - allow request but log
    logger.warn('Rate limiting disabled (Redis down)', { identifier });
    return { allowed: true, remaining: limit };
  }
  
  try {
    const current = await redis.incr(key);
    
    if (current === 1) {
      // First request in window - set expiration
      await redis.expire(key, windowSeconds);
    }
    
    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);
    
    return { allowed, remaining };
  } catch (error) {
    // Redis error mid-operation - fail open
    logger.error('Rate limit check failed, allowing request', { error });
    return { allowed: true, remaining: limit };
  }
}
```

---

## Monitoring & Alerting

### Metrics to Track

```typescript
// lib/monitoring/redis-metrics.ts

export const redisMetrics = {
  connectionStatus: new Gauge({
    name: 'redis_connection_status',
    help: '1 if connected, 0 if disconnected',
  }),
  
  cacheHitRate: new Histogram({
    name: 'redis_cache_hit_rate',
    help: 'Percentage of cache hits',
    buckets: [0, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 1],
  }),
  
  fallbackUsage: new Counter({
    name: 'redis_fallback_usage_total',
    help: 'Number of times fallback strategies were used',
    labelNames: ['strategy'],
  }),
  
  inMemoryQueueSize: new Gauge({
    name: 'redis_in_memory_queue_size',
    help: 'Number of jobs in in-memory queue',
  }),
};
```

### Alert Conditions

| Condition | Severity | Action |
|-----------|----------|--------|
| Redis down for 5+ minutes | Critical | Page on-call engineer |
| Cache hit rate < 50% | Warning | Investigate cache invalidation |
| In-memory queue > 50 jobs | Warning | Check Redis connection |
| In-memory queue > 500 jobs | Critical | Jobs may be lost, manual intervention |
| Fallback usage > 100/min | Warning | Redis performance degraded |

---

## Recovery Procedures

### Automatic Recovery

1. **Connection Restored:**
   - Health check detects Redis is available
   - Process in-memory job queues
   - Resume normal caching operations
   - Log recovery event

2. **Gradual Degradation:**
   - If Redis is slow (not down), reduce cache TTLs
   - Implement circuit breaker pattern
   - Skip non-critical cache operations

### Manual Recovery

1. **Redis Completely Down:**
   ```bash
   # Check Redis status
   redis-cli ping
   
   # Restart Redis (Upstash auto-restarts)
   # Or provision new instance
   
   # Verify connection
   curl https://api.crowdiant.com/api/health/redis
   ```

2. **Data Loss Scenario:**
   - Redis data is ephemeral (cache/sessions)
   - All critical data is in PostgreSQL
   - Trust scores recalculate from database
   - Sessions regenerate on next login
   - No permanent data loss

3. **In-Memory Queue Overflow:**
   ```sql
   -- Query job logs to replay missed jobs
   SELECT * FROM job_logs 
   WHERE status = 'PENDING' 
   AND created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at ASC;
   ```
   - Manually replay critical jobs (payment notifications)
   - Non-critical jobs (analytics) can be skipped

---

## Testing Strategy

### Unit Tests

```typescript
describe('Redis Fallback', () => {
  it('should use database when Redis is unavailable', async () => {
    // Mock Redis as unavailable
    jest.spyOn(redis, 'ping').mockRejectedValue(new Error('Connection refused'));
    
    const score = await getTrustScore('customer-1', 'venue-1');
    
    expect(score).toBeDefined();
    expect(prisma.trustEvent.findMany).toHaveBeenCalled();
  });
  
  it('should execute critical jobs immediately when Redis is down', async () => {
    jest.spyOn(redis, 'ping').mockRejectedValue(new Error('Connection refused'));
    
    const mockHandler = jest.fn();
    await queue.add('payment-notification', { tabId: 'tab-1' });
    
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
describe('Redis Failure Scenarios', () => {
  it('should handle Redis disconnection mid-request', async () => {
    // Start with Redis connected
    const session = await getSession('token-123');
    expect(session).toBeDefined();
    
    // Simulate Redis disconnect
    await redis.disconnect();
    
    // Should still work (fallback to DB)
    const session2 = await getSession('token-456');
    expect(session2).toBeDefined();
  });
});
```

### Load Testing

```bash
# Simulate Redis failure under load
artillery run --target https://api.crowdiant.com \
  --scenario redis-failure-load-test.yml

# Monitor:
# - Request success rate (should stay > 99%)
# - Response time (will increase but should stay < 2s)
# - Error rate (should remain low)
```

---

## Performance Impact

| Operation | Normal (Redis) | Fallback (No Redis) | Impact |
|-----------|----------------|---------------------|--------|
| Trust score lookup | 5ms | 50ms | 10x slower (acceptable) |
| Session validation | 3ms | 30ms | 10x slower (acceptable) |
| Menu item fetch | 8ms | 80ms | 10x slower (acceptable) |
| Rate limit check | 2ms | 0ms | Skipped (fail open) |
| Job enqueuing | 5ms | 1ms (sync) | Faster but blocks request |

**Overall Impact:** System remains functional but 5-10x slower. Still acceptable for restaurant operations (response times under 100ms).

---

## Summary

**Key Principles:**
1. **Fail Open:** When in doubt, allow operations to proceed
2. **Database is Source of Truth:** Redis is always a cache/optimization
3. **Graceful Degradation:** Slower is better than broken
4. **Critical Jobs Run Synchronously:** Payment notifications can't wait
5. **Monitor & Alert:** Know immediately when Redis fails

**Implementation Priority:** Story E1.6 (Observability) should include Redis health monitoring before any features that depend on Redis (Sprint 0).

**Trade-offs:**
- ✅ System stays operational during Redis outages
- ✅ No data loss (database is source of truth)
- ✅ Critical operations (payments) still work
- ⚠️ Performance degrades 5-10x without Redis
- ⚠️ Rate limiting disabled without Redis
- ⚠️ Non-critical jobs may be delayed

This strategy ensures Crowdiant Restaurant OS can continue serving customers even during infrastructure failures.
