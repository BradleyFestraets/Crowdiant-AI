# Socket.io Authentication & Security

**Author:** System Architect  
**Date:** 2025-11-26  
**Version:** 1.0

---

## Overview

This document defines the comprehensive authentication and security strategy for Socket.io real-time connections in Crowdiant Restaurant OS. Socket.io is used for Kitchen Display System (KDS) updates, table status updates, and live tab updates. Proper authentication is critical to prevent unauthorized access to sensitive restaurant operations and customer data.

**Related Technical Specs:** 
- 05-realtime-socketio-technical-spec.md (existing implementation)
- This document extends authentication details for Sprint 7 (KDS) implementation

---

## Security Requirements

### Threat Model

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Unauthorized KDS access | Staff sees orders from other venues | Multi-tenant room isolation + venue verification |
| Customer spoofing | View other customers' tabs | Cryptographically signed tab tokens |
| Session hijacking | Impersonate staff member | Short-lived JWT + HTTPS only |
| Cross-venue data leak | Venue A sees Venue B's data | Room-level access control + middleware |
| Replay attacks | Reuse old auth tokens | Token expiration + nonce validation |
| Man-in-the-middle | Intercept socket messages | TLS 1.3 + WSS only |

---

## Authentication Flow

### 1. Initial Connection Authentication

```typescript
// Client-side: Establish socket connection with auth token
// app/components/KitchenDisplay.tsx

import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';

export function KitchenDisplay() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  
  useEffect(() => {
    if (!session?.user) return;
    
    // Connect to socket server with NextAuth session token
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: {
        token: session.accessToken, // JWT from NextAuth
      },
      transports: ['websocket', 'polling'],
      secure: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
    });
    
    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection failed:', error.message);
      
      if (error.message === 'Authentication failed') {
        // Refresh session and retry
        signOut({ callbackUrl: '/login' });
      }
    });
    
    setSocket(socketInstance);
    
    return () => {
      socketInstance.close();
    };
  }, [session]);
  
  // ... rest of component
}
```

### 2. Server-Side Authentication Middleware

```typescript
// socket-server/middleware/auth.ts

import { jwtVerify } from 'jose';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

export interface AuthenticatedSocketData {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'OWNER';
    venues: Array<{
      venueId: string;
      role: 'SERVER' | 'KITCHEN' | 'MANAGER' | 'OWNER';
    }>;
  };
}

export async function validateSocketAuth(token: string): Promise<AuthenticatedSocketData['user'] | null> {
  try {
    // 1. Verify JWT signature and expiration
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    
    // 2. Extract user ID from token
    const userId = payload.sub as string;
    if (!userId) {
      logger.warn('JWT missing sub claim');
      return null;
    }
    
    // 3. Fetch user from database with venue associations
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        venueStaff: {
          where: { 
            status: 'ACTIVE',
            // Only include venues where user has active assignments
          },
          select: {
            venueId: true,
            role: true,
          },
        },
      },
    });
    
    if (!user) {
      logger.warn('User not found in database', { userId });
      return null;
    }
    
    // 4. Return authenticated user data
    return {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role,
      venues: user.venueStaff.map(vs => ({
        venueId: vs.venueId,
        role: vs.role,
      })),
    };
  } catch (error) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      logger.warn('JWT token expired');
    } else {
      logger.error('JWT verification failed', { error });
    }
    return null;
  }
}

// Apply middleware to socket server
export function setupAuthMiddleware(io: Server) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      logger.warn('Socket connection without auth token', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      return next(new Error('Authentication token required'));
    }
    
    const user = await validateSocketAuth(token);
    
    if (!user) {
      logger.warn('Socket authentication failed', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      return next(new Error('Authentication failed'));
    }
    
    // Store user data on socket for use in event handlers
    socket.data.user = user;
    
    logger.info('Socket authenticated', {
      socketId: socket.id,
      userId: user.id,
      venueCount: user.venues.length,
    });
    
    next();
  });
}
```

---

## Authorization & Multi-Tenant Isolation

### Room-Based Access Control

```typescript
// socket-server/handlers/venue.ts

import { Socket } from 'socket.io';
import { z } from 'zod';
import { logger } from '../lib/logger';

const joinVenueSchema = z.object({
  venueId: z.string().cuid(),
});

export function setupVenueHandlers(socket: Socket) {
  const user = socket.data.user;
  
  /**
   * Join venue room for real-time updates
   * Only staff assigned to venue can join
   */
  socket.on('venue:join', async (data) => {
    try {
      const { venueId } = joinVenueSchema.parse(data);
      
      // 1. Verify user has access to this venue
      const hasAccess = user.venues.some(v => v.venueId === venueId);
      
      if (!hasAccess) {
        logger.warn('Unauthorized venue join attempt', {
          userId: user.id,
          venueId,
        });
        
        socket.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'You do not have access to this venue',
        });
        return;
      }
      
      // 2. Join venue-specific room
      const roomName = `venue:${venueId}`;
      await socket.join(roomName);
      
      logger.info('User joined venue room', {
        userId: user.id,
        venueId,
        roomName,
      });
      
      // 3. Send initial venue state
      const venueState = await getVenueState(venueId);
      socket.emit('venue:state', venueState);
      
      // 4. Notify other staff in venue
      socket.to(roomName).emit('venue:staff-joined', {
        userId: user.id,
        name: user.name,
      });
      
    } catch (error) {
      logger.error('Error joining venue', { error, userId: user.id });
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to join venue',
      });
    }
  });
  
  /**
   * Leave venue room
   */
  socket.on('venue:leave', async (data) => {
    try {
      const { venueId } = joinVenueSchema.parse(data);
      
      const roomName = `venue:${venueId}`;
      await socket.leave(roomName);
      
      logger.info('User left venue room', {
        userId: user.id,
        venueId,
      });
      
      socket.to(roomName).emit('venue:staff-left', {
        userId: user.id,
        name: user.name,
      });
      
    } catch (error) {
      logger.error('Error leaving venue', { error, userId: user.id });
    }
  });
}
```

### Kitchen Display System Authorization

```typescript
// socket-server/handlers/kitchen.ts

import { Socket } from 'socket.io';
import { logger } from '../lib/logger';

export function setupKitchenHandlers(socket: Socket) {
  const user = socket.data.user;
  
  /**
   * Join kitchen room - requires KITCHEN or MANAGER role
   */
  socket.on('kitchen:join', async (data) => {
    try {
      const { venueId } = joinVenueSchema.parse(data);
      
      // 1. Verify venue access
      const venueAccess = user.venues.find(v => v.venueId === venueId);
      
      if (!venueAccess) {
        socket.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'No access to this venue',
        });
        return;
      }
      
      // 2. Verify kitchen role
      const allowedRoles = ['KITCHEN', 'MANAGER', 'OWNER'];
      if (!allowedRoles.includes(venueAccess.role)) {
        logger.warn('Unauthorized kitchen access attempt', {
          userId: user.id,
          venueId,
          role: venueAccess.role,
        });
        
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: 'Kitchen access requires kitchen staff role',
        });
        return;
      }
      
      // 3. Join kitchen-specific room
      const kitchenRoom = `venue:${venueId}:kitchen`;
      await socket.join(kitchenRoom);
      
      logger.info('User joined kitchen room', {
        userId: user.id,
        venueId,
        role: venueAccess.role,
      });
      
      // 4. Send active orders
      const activeOrders = await getActiveKitchenOrders(venueId);
      socket.emit('kitchen:orders', activeOrders);
      
    } catch (error) {
      logger.error('Error joining kitchen', { error, userId: user.id });
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to join kitchen',
      });
    }
  });
  
  /**
   * Mark order as prepared - requires KITCHEN role
   */
  socket.on('kitchen:order-prepared', async (data) => {
    try {
      const { orderId, venueId } = z.object({
        orderId: z.string().cuid(),
        venueId: z.string().cuid(),
      }).parse(data);
      
      // Verify authorization
      const venueAccess = user.venues.find(v => v.venueId === venueId);
      if (!venueAccess || !['KITCHEN', 'MANAGER', 'OWNER'].includes(venueAccess.role)) {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Not authorized' });
        return;
      }
      
      // Update order status
      await updateOrderStatus(orderId, 'PREPARED');
      
      // Broadcast to all staff in venue
      io.to(`venue:${venueId}`).emit('order:status-changed', {
        orderId,
        status: 'PREPARED',
        preparedBy: user.id,
        preparedAt: new Date(),
      });
      
    } catch (error) {
      logger.error('Error marking order prepared', { error });
      socket.emit('error', { code: 'INTERNAL_ERROR' });
    }
  });
}
```

---

## Customer Tab Access

### Secure Tab Tokens

Customers access their tab via a signed token (not their user account). This allows:
- Customers without accounts to view tabs
- Secure, single-use access tokens
- No login required

```typescript
// lib/tab/tab-tokens.ts

import { SignJWT, jwtVerify } from 'jose';

const TAB_TOKEN_SECRET = new TextEncoder().encode(process.env.TAB_TOKEN_SECRET!);

export async function generateTabToken(tabId: string, expiresIn: string = '24h'): Promise<string> {
  const token = await new SignJWT({
    tabId,
    type: 'TAB_ACCESS',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setJti(crypto.randomUUID()) // Nonce for replay protection
    .sign(TAB_TOKEN_SECRET);
  
  return token;
}

export async function verifyTabToken(token: string): Promise<{ tabId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, TAB_TOKEN_SECRET);
    
    if (payload.type !== 'TAB_ACCESS') {
      return null;
    }
    
    return {
      tabId: payload.tabId as string,
    };
  } catch (error) {
    return null;
  }
}
```

### Customer Socket Authentication

```typescript
// socket-server/handlers/tab.ts

import { Socket } from 'socket.io';
import { verifyTabToken } from '../lib/tab/tab-tokens';
import { logger } from '../lib/logger';

export function setupCustomerTabHandlers(socket: Socket) {
  /**
   * Join tab room using signed token (not user auth)
   */
  socket.on('tab:join', async (data) => {
    try {
      const { tabToken } = z.object({
        tabToken: z.string(),
      }).parse(data);
      
      // 1. Verify tab token
      const tokenData = await verifyTabToken(tabToken);
      
      if (!tokenData) {
        logger.warn('Invalid tab token', {
          socketId: socket.id,
          ip: socket.handshake.address,
        });
        
        socket.emit('error', {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired tab access token',
        });
        return;
      }
      
      const { tabId } = tokenData;
      
      // 2. Verify tab exists and is active
      const tab = await prisma.tab.findUnique({
        where: { id: tabId },
        select: {
          id: true,
          status: true,
          venueId: true,
        },
      });
      
      if (!tab) {
        socket.emit('error', {
          code: 'TAB_NOT_FOUND',
          message: 'Tab not found',
        });
        return;
      }
      
      if (tab.status === 'CLOSED') {
        socket.emit('error', {
          code: 'TAB_CLOSED',
          message: 'This tab has been closed',
        });
        return;
      }
      
      // 3. Join tab-specific room
      const tabRoom = `tab:${tabId}`;
      await socket.join(tabRoom);
      
      // Store tab access info on socket
      socket.data.tabAccess = {
        tabId,
        venueId: tab.venueId,
      };
      
      logger.info('Customer joined tab room', {
        socketId: socket.id,
        tabId,
      });
      
      // 4. Send current tab state
      const tabState = await getFullTabState(tabId);
      socket.emit('tab:state', tabState);
      
    } catch (error) {
      logger.error('Error joining tab', { error });
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to join tab',
      });
    }
  });
}
```

---

## Security Best Practices

### 1. Token Expiration

```typescript
// Token lifetimes
const TOKEN_EXPIRY = {
  SESSION: '8h',      // Staff session tokens
  TAB_ACCESS: '24h',  // Customer tab access
  REFRESH: '30d',     // Refresh tokens
};

// Auto-disconnect sockets with expired tokens
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const user = await validateSocketAuth(token);
  
  if (!user) {
    // Token expired or invalid
    socket.disconnect(true);
    return next(new Error('Token expired'));
  }
  
  socket.data.user = user;
  next();
});
```

### 2. Rate Limiting

```typescript
// socket-server/middleware/rate-limit.ts

import rateLimit from 'express-rate-limit';

export const socketRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 events per minute per socket
  message: 'Too many socket events, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to event handlers
socket.on('kitchen:order-prepared', socketRateLimiter, async (data) => {
  // Handler logic
});
```

### 3. Input Validation

```typescript
// Always validate incoming socket data with Zod
import { z } from 'zod';

const orderUpdateSchema = z.object({
  orderId: z.string().cuid(),
  venueId: z.string().cuid(),
  status: z.enum(['PENDING', 'PREPARING', 'PREPARED', 'SERVED']),
  notes: z.string().max(500).optional(),
});

socket.on('order:update', async (data) => {
  try {
    const validated = orderUpdateSchema.parse(data);
    // Process validated data
  } catch (error) {
    socket.emit('error', { code: 'INVALID_INPUT', message: error.message });
  }
});
```

### 4. Audit Logging

```typescript
// Log all sensitive socket operations
function auditLog(event: string, data: any, user: any) {
  logger.info('Socket audit log', {
    event,
    userId: user?.id,
    userRole: user?.role,
    data,
    timestamp: new Date(),
    ip: socket.handshake.address,
  });
  
  // Also save to database for compliance
  prisma.auditLog.create({
    data: {
      event,
      userId: user?.id,
      data: JSON.stringify(data),
      ipAddress: socket.handshake.address,
    },
  });
}

// Use in critical operations
socket.on('payment:capture', async (data) => {
  auditLog('payment:capture', data, socket.data.user);
  // ... handler logic
});
```

### 5. XSS Prevention

```typescript
// Sanitize all user-generated content in socket messages
import DOMPurify from 'isomorphic-dompurify';

socket.on('chat:message', async (data) => {
  const sanitized = DOMPurify.sanitize(data.message, {
    ALLOWED_TAGS: [], // No HTML allowed
    ALLOWED_ATTR: [],
  });
  
  // Broadcast sanitized message
  io.to(`venue:${venueId}`).emit('chat:message', {
    ...data,
    message: sanitized,
  });
});
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('Socket Authentication', () => {
  it('should reject connections without token', async () => {
    const socket = io('http://localhost:3001', {
      auth: {}, // No token
    });
    
    await expect(socket.connect()).rejects.toThrow('Authentication token required');
  });
  
  it('should reject expired tokens', async () => {
    const expiredToken = await generateExpiredToken();
    
    const socket = io('http://localhost:3001', {
      auth: { token: expiredToken },
    });
    
    await expect(socket.connect()).rejects.toThrow('Token expired');
  });
  
  it('should prevent cross-venue access', async () => {
    const socket = await authenticatedSocket('user-1'); // Access to venue-1 only
    
    socket.emit('venue:join', { venueId: 'venue-2' });
    
    const error = await waitForEvent(socket, 'error');
    expect(error.code).toBe('UNAUTHORIZED');
  });
});
```

### Integration Tests

```typescript
describe('Kitchen Authorization', () => {
  it('should allow kitchen staff to join kitchen room', async () => {
    const kitchenStaff = await createUser({ role: 'KITCHEN', venueId: 'venue-1' });
    const socket = await authenticatedSocket(kitchenStaff.id);
    
    socket.emit('kitchen:join', { venueId: 'venue-1' });
    
    const orders = await waitForEvent(socket, 'kitchen:orders');
    expect(orders).toBeDefined();
  });
  
  it('should reject servers from kitchen room', async () => {
    const server = await createUser({ role: 'SERVER', venueId: 'venue-1' });
    const socket = await authenticatedSocket(server.id);
    
    socket.emit('kitchen:join', { venueId: 'venue-1' });
    
    const error = await waitForEvent(socket, 'error');
    expect(error.code).toBe('FORBIDDEN');
  });
});
```

---

## Monitoring & Alerting

### Key Metrics

```typescript
export const socketMetrics = {
  activeConnections: new Gauge({
    name: 'socket_active_connections',
    help: 'Number of active socket connections',
    labelNames: ['venue_id', 'user_role'],
  }),
  
  authenticationFailures: new Counter({
    name: 'socket_auth_failures_total',
    help: 'Total number of socket authentication failures',
    labelNames: ['reason'],
  }),
  
  unauthorizedAccessAttempts: new Counter({
    name: 'socket_unauthorized_access_total',
    help: 'Attempts to access unauthorized resources',
    labelNames: ['resource_type'],
  }),
};
```

### Alert Conditions

| Condition | Severity | Action |
|-----------|----------|--------|
| Auth failures > 10/min | Warning | Check for brute force attack |
| Unauthorized access > 5/min | Critical | Possible security breach |
| Socket connections > 1000 | Warning | Check for DoS attack |
| Token validation time > 500ms | Warning | Database performance issue |

---

## Deployment Checklist

Before deploying Socket.io to production:

- [ ] Generate secure `NEXTAUTH_SECRET` (32+ characters)
- [ ] Generate separate `TAB_TOKEN_SECRET` (32+ characters)
- [ ] Enable TLS/WSS in production (no plain WS)
- [ ] Configure CORS to allow only app domain
- [ ] Set up Socket.io sticky sessions (if multi-instance)
- [ ] Enable rate limiting on socket events
- [ ] Set up audit logging for sensitive operations
- [ ] Configure monitoring alerts (Sentry, DataDog)
- [ ] Test token expiration and refresh flow
- [ ] Verify multi-tenant isolation with penetration testing
- [ ] Document runbook for common security incidents

---

## Summary

This authentication strategy ensures:
- ✅ Strong authentication via JWT tokens
- ✅ Multi-tenant isolation via room-based access control
- ✅ Role-based authorization for sensitive operations
- ✅ Secure customer tab access without requiring accounts
- ✅ Comprehensive audit logging for compliance
- ✅ Protection against common attacks (XSS, CSRF, replay)

**Implementation Timeline:**
- Sprint 0: Basic socket infrastructure (Story E1.5)
- Sprint 7: Full KDS implementation with auth (Epic E6)
- Before Sprint 7: Review and implement all sections of this document
