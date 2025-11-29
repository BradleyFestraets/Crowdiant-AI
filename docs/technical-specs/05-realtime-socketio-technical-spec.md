# Real-Time Architecture - Socket.io Technical Specification

**Component:** Real-Time Communication System
**Version:** 1.0
**Date:** 2025-11-25
**Author:** System Architect

---

## Overview

Socket.io implementation for real-time updates across Express Checkout, kitchen operations, and customer notifications. Deployed separately from Next.js on Railway for WebSocket persistence.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  Next.js Client   │   POS Terminal   │   Kitchen Display        │
│  (Socket.io-client)│  (Socket.io-client)│  (Socket.io-client)  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │     Load Balancer (Railway)          │
            └─────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Socket.io   │    │  Socket.io   │    │  Socket.io   │
│  Instance 1  │    │  Instance 2  │    │  Instance 3  │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  Redis Adapter   │
                    │  (Upstash Redis) │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  PostgreSQL DB   │
                    │  (via tRPC API)  │
                    └──────────────────┘
```

---

## Server Configuration

### Socket.io Server Setup

```typescript
// socket-server/index.ts

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import cors from 'cors';
import { validateSocketAuth } from './middleware/auth';
import { setupEventHandlers } from './handlers';
import { logger } from './lib/logger';

const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = [
  process.env.NEXTAUTH_URL || 'http://localhost:3000',
  process.env.POS_URL || 'http://localhost:3001',
];

// Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Redis adapter for horizontal scaling
const pubClient = createClient({ 
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD 
});
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  logger.info('Redis adapter connected');
});

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const user = await validateSocketAuth(token);
    
    if (!user) {
      return next(new Error('Authentication failed'));
    }
    
    // Attach user to socket
    socket.data.user = user;
    next();
  } catch (error) {
    logger.error('Socket auth error', error);
    next(new Error('Authentication error'));
  }
});

// Connection handling
io.on('connection', async (socket: Socket) => {
  const user = socket.data.user;
  
  logger.info(`User connected: ${user.id} (${user.email})`);
  
  // Join user-specific room
  socket.join(`user:${user.id}`);
  
  // Setup event handlers
  setupEventHandlers(io, socket);
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    logger.info(`User disconnected: ${user.id} - Reason: ${reason}`);
  });
  
  // Handle errors
  socket.on('error', (error) => {
    logger.error('Socket error', { userId: user.id, error });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connections: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint (for monitoring)
app.get('/metrics', (req, res) => {
  res.json({
    connections: io.engine.clientsCount,
    rooms: io.sockets.adapter.rooms.size,
    uptime: process.uptime(),
  });
});

const PORT = process.env.PORT || 3002;

httpServer.listen(PORT, () => {
  logger.info(`Socket.io server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  httpServer.close(() => {
    logger.info('Server closed');
    pubClient.quit();
    subClient.quit();
    process.exit(0);
  });
});
```

---

## Authentication Middleware

```typescript
// socket-server/middleware/auth.ts

import { jwtVerify } from 'jose';
import { prisma } from '../lib/prisma';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function validateSocketAuth(token: string) {
  try {
    // Verify JWT (NextAuth session token)
    const { payload } = await jwtVerify(token, secret);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        venueStaff: {
          where: { status: 'ACTIVE' },
          select: {
            venueId: true,
            role: true,
          },
        },
      },
    });
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      venues: user.venueStaff.map(vs => vs.venueId),
    };
  } catch (error) {
    return null;
  }
}
```

---

## Event Handlers

### Tab Events

```typescript
// socket-server/handlers/tab.ts

import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { logger } from '../lib/logger';

const joinTabSchema = z.object({
  tabId: z.string().cuid(),
});

const joinVenueSchema = z.object({
  venueId: z.string().cuid(),
});

export function setupTabHandlers(io: Server, socket: Socket) {
  const user = socket.data.user;
  
  /**
   * Join tab room (customer viewing their tab)
   */
  socket.on('tab:join', async (data) => {
    try {
      const { tabId } = joinTabSchema.parse(data);
      
      // Verify user has access to this tab
      const hasAccess = await verifyTabAccess(user.id, tabId);
      
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to tab' });
        return;
      }
      
      const room = `tab:${tabId}`;
      socket.join(room);
      
      logger.info(`User ${user.id} joined tab room ${room}`);
      
      socket.emit('tab:joined', { tabId });
    } catch (error) {
      logger.error('tab:join error', error);
      socket.emit('error', { message: 'Failed to join tab' });
    }
  });
  
  /**
   * Leave tab room
   */
  socket.on('tab:leave', (data) => {
    try {
      const { tabId } = joinTabSchema.parse(data);
      const room = `tab:${tabId}`;
      socket.leave(room);
      
      logger.info(`User ${user.id} left tab room ${room}`);
    } catch (error) {
      logger.error('tab:leave error', error);
    }
  });
  
  /**
   * Join venue room (staff viewing all venue tabs)
   */
  socket.on('venue:join', async (data) => {
    try {
      const { venueId } = joinVenueSchema.parse(data);
      
      // Verify user is staff at this venue
      if (!user.venues.includes(venueId)) {
        socket.emit('error', { message: 'Not authorized for this venue' });
        return;
      }
      
      const room = `venue:${venueId}`;
      socket.join(room);
      
      logger.info(`User ${user.id} joined venue room ${room}`);
      
      socket.emit('venue:joined', { venueId });
    } catch (error) {
      logger.error('venue:join error', error);
      socket.emit('error', { message: 'Failed to join venue' });
    }
  });
  
  /**
   * Leave venue room
   */
  socket.on('venue:leave', (data) => {
    try {
      const { venueId } = joinVenueSchema.parse(data);
      const room = `venue:${venueId}`;
      socket.leave(room);
      
      logger.info(`User ${user.id} left venue room ${room}`);
    } catch (error) {
      logger.error('venue:leave error', error);
    }
  });
}

async function verifyTabAccess(userId: string, tabId: string): Promise<boolean> {
  const tab = await prisma.tab.findUnique({
    where: { id: tabId },
    select: {
      customerId: true,
      serverId: true,
      venueId: true,
    },
  });
  
  if (!tab) return false;
  
  // Customer can view their own tab
  if (tab.customerId === userId) return true;
  
  // Server who opened the tab can view
  if (tab.serverId === userId) return true;
  
  // Any staff at the venue can view
  const isVenueStaff = await prisma.venueStaff.findFirst({
    where: {
      userId,
      venueId: tab.venueId,
      status: 'ACTIVE',
    },
  });
  
  return !!isVenueStaff;
}
```

### Kitchen Events

```typescript
// socket-server/handlers/kitchen.ts

import { Server, Socket } from 'socket.io';
import { z } from 'zod';

const joinKitchenSchema = z.object({
  venueId: z.string().cuid(),
});

const updateOrderStatusSchema = z.object({
  tabItemId: z.string().cuid(),
  status: z.enum(['SENT', 'IN_PROGRESS', 'READY', 'DELIVERED']),
});

export function setupKitchenHandlers(io: Server, socket: Socket) {
  const user = socket.data.user;
  
  /**
   * Join kitchen room
   */
  socket.on('kitchen:join', async (data) => {
    try {
      const { venueId } = joinKitchenSchema.parse(data);
      
      // Verify user is kitchen staff
      const isKitchenStaff = await prisma.venueStaff.findFirst({
        where: {
          userId: user.id,
          venueId,
          role: { in: ['KITCHEN_MANAGER', 'CHEF', 'LINE_COOK', 'PREP_COOK'] },
          status: 'ACTIVE',
        },
      });
      
      if (!isKitchenStaff) {
        socket.emit('error', { message: 'Not authorized for kitchen' });
        return;
      }
      
      const room = `kitchen:${venueId}`;
      socket.join(room);
      
      logger.info(`User ${user.id} joined kitchen room ${room}`);
      
      socket.emit('kitchen:joined', { venueId });
    } catch (error) {
      logger.error('kitchen:join error', error);
    }
  });
  
  /**
   * Update order status (kitchen → servers)
   */
  socket.on('kitchen:update-status', async (data) => {
    try {
      const { tabItemId, status } = updateOrderStatusSchema.parse(data);
      
      // Update database
      const tabItem = await prisma.tabItem.update({
        where: { id: tabItemId },
        data: { 
          kitchenStatus: status,
          preparedAt: status === 'READY' ? new Date() : undefined,
        },
        include: {
          tab: { select: { venueId: true, id: true } },
        },
      });
      
      // Broadcast to venue staff
      io.to(`venue:${tabItem.tab.venueId}`).emit('kitchen:order-updated', {
        tabItemId,
        tabId: tabItem.tab.id,
        status,
        timestamp: new Date(),
      });
      
      logger.info(`Order ${tabItemId} status updated to ${status}`);
    } catch (error) {
      logger.error('kitchen:update-status error', error);
      socket.emit('error', { message: 'Failed to update order status' });
    }
  });
  
  /**
   * Bump order (mark as delivered)
   */
  socket.on('kitchen:bump', async (data) => {
    try {
      const { tabItemId } = z.object({ tabItemId: z.string() }).parse(data);
      
      await prisma.tabItem.update({
        where: { id: tabItemId },
        data: {
          kitchenStatus: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });
      
      socket.emit('kitchen:bumped', { tabItemId });
    } catch (error) {
      logger.error('kitchen:bump error', error);
    }
  });
}
```

### Notification Events

```typescript
// socket-server/handlers/notification.ts

import { Server, Socket } from 'socket.io';

export function setupNotificationHandlers(io: Server, socket: Socket) {
  const user = socket.data.user;
  
  // User automatically joins their notification room on connection
  socket.join(`user:${user.id}`);
  
  /**
   * Mark notification as read
   */
  socket.on('notification:read', async (data) => {
    try {
      const { notificationId } = z.object({ 
        notificationId: z.string() 
      }).parse(data);
      
      await prisma.notification.update({
        where: { id: notificationId, userId: user.id },
        data: { 
          read: true,
          readAt: new Date(),
        },
      });
      
      socket.emit('notification:read-success', { notificationId });
    } catch (error) {
      logger.error('notification:read error', error);
    }
  });
}
```

---

## Event Emitters (from Backend)

### Emit from tRPC Procedures

```typescript
// server/api/lib/socket-emit.ts

import { io } from 'socket.io-client';

// Connect to Socket.io server
const socketClient = io(process.env.SOCKET_SERVER_URL || 'http://localhost:3002', {
  auth: {
    token: process.env.SOCKET_SERVER_SECRET,  // Server-to-server auth
  },
});

export class SocketEmitter {
  /**
   * Emit tab item added event
   */
  static emitTabItemAdded(payload: {
    tabId: string;
    venueId: string;
    item: {
      id: string;
      name: string;
      quantity: number;
      priceCents: number;
    };
    newSubtotal: number;
    newTax: number;
    newTotal: number;
  }) {
    // Emit to tab room (customer viewing tab)
    socketClient.emit('broadcast', {
      room: `tab:${payload.tabId}`,
      event: 'tab:item-added',
      payload,
    });
    
    // Emit to venue room (staff)
    socketClient.emit('broadcast', {
      room: `venue:${payload.venueId}`,
      event: 'tab:item-added',
      payload,
    });
  }
  
  /**
   * Emit tab status changed
   */
  static emitTabStatusChanged(payload: {
    tabId: string;
    venueId: string;
    oldStatus: string;
    newStatus: string;
    trigger: string;
  }) {
    socketClient.emit('broadcast', {
      room: `tab:${payload.tabId}`,
      event: 'tab:status-changed',
      payload,
    });
    
    socketClient.emit('broadcast', {
      room: `venue:${payload.venueId}`,
      event: 'tab:status-changed',
      payload,
    });
  }
  
  /**
   * Emit tab closed
   */
  static emitTabClosed(payload: {
    tabId: string;
    venueId: string;
    totalCents: number;
    tipCents: number;
    receiptUrl: string;
  }) {
    socketClient.emit('broadcast', {
      room: `tab:${payload.tabId}`,
      event: 'tab:closed',
      payload,
    });
    
    socketClient.emit('broadcast', {
      room: `venue:${payload.venueId}`,
      event: 'tab:closed',
      payload,
    });
  }
  
  /**
   * Emit new order to kitchen
   */
  static emitNewOrder(payload: {
    venueId: string;
    tabId: string;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      modifiers: any;
      notes: string;
    }>;
  }) {
    socketClient.emit('broadcast', {
      room: `kitchen:${payload.venueId}`,
      event: 'kitchen:new-order',
      payload,
    });
  }
  
  /**
   * Emit notification to user
   */
  static emitNotification(payload: {
    userId: string;
    notification: {
      id: string;
      type: string;
      title: string;
      message: string;
      actionUrl?: string;
    };
  }) {
    socketClient.emit('broadcast', {
      room: `user:${payload.userId}`,
      event: 'notification:new',
      payload: payload.notification,
    });
  }
}

// Usage in tRPC procedure:
// await SocketEmitter.emitTabItemAdded({ ... });
```

### Broadcast Handler on Socket Server

```typescript
// socket-server/handlers/broadcast.ts

export function setupBroadcastHandler(io: Server, socket: Socket) {
  /**
   * Server-to-server broadcast
   * Only allowed from backend with secret token
   */
  socket.on('broadcast', (data) => {
    try {
      const user = socket.data.user;
      
      // Verify this is server connection
      if (user.role !== 'SYSTEM') {
        socket.emit('error', { message: 'Unauthorized broadcast' });
        return;
      }
      
      const { room, event, payload } = data;
      
      // Broadcast to room
      io.to(room).emit(event, payload);
      
      logger.debug(`Broadcast: ${event} to room ${room}`);
    } catch (error) {
      logger.error('broadcast error', error);
    }
  });
}
```

---

## Client Integration

### React Hook for Socket.io

```typescript
// hooks/useSocket.ts

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

export function useSocket() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    if (!session?.accessToken) return;
    
    // Connect to Socket.io server
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002', {
      auth: {
        token: session.accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    
    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });
    
    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    setSocket(socketInstance);
    
    return () => {
      socketInstance.close();
    };
  }, [session?.accessToken]);
  
  return { socket, connected };
}
```

### Tab Real-Time Hook

```typescript
// hooks/useTabRealtime.ts

import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { api } from '@/lib/trpc/react';

export function useTabRealtime(tabId: string) {
  const { socket, connected } = useSocket();
  const utils = api.useUtils();
  
  useEffect(() => {
    if (!socket || !connected) return;
    
    // Join tab room
    socket.emit('tab:join', { tabId });
    
    // Listen for item additions
    socket.on('tab:item-added', (payload) => {
      if (payload.tabId === tabId) {
        // Invalidate tab query to refetch
        utils.tab.getByAccessToken.invalidate();
        
        // Optimistic update (optional)
        utils.tab.getByAccessToken.setData(
          (oldData) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              tab: {
                ...oldData.tab,
                subtotalCents: payload.newSubtotal,
                taxCents: payload.newTax,
                totalCents: payload.newTotal,
              },
            };
          }
        );
      }
    });
    
    // Listen for status changes
    socket.on('tab:status-changed', (payload) => {
      if (payload.tabId === tabId) {
        utils.tab.getByAccessToken.invalidate();
      }
    });
    
    // Listen for tab closed
    socket.on('tab:closed', (payload) => {
      if (payload.tabId === tabId) {
        // Redirect to receipt
        window.location.href = payload.receiptUrl;
      }
    });
    
    return () => {
      socket.emit('tab:leave', { tabId });
      socket.off('tab:item-added');
      socket.off('tab:status-changed');
      socket.off('tab:closed');
    };
  }, [socket, connected, tabId]);
}
```

### Kitchen Display Integration

```typescript
// components/KitchenDisplay.tsx

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface KitchenOrder {
  tabId: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    modifiers: any;
    notes: string;
    status: string;
  }>;
  timestamp: Date;
}

export function KitchenDisplay({ venueId }: { venueId: string }) {
  const { socket, connected } = useSocket();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  
  useEffect(() => {
    if (!socket || !connected) return;
    
    // Join kitchen room
    socket.emit('kitchen:join', { venueId });
    
    // Listen for new orders
    socket.on('kitchen:new-order', (payload) => {
      setOrders(prev => [payload, ...prev]);
      
      // Play sound notification
      playNotificationSound();
    });
    
    // Listen for order updates
    socket.on('kitchen:order-updated', (payload) => {
      setOrders(prev => prev.map(order => {
        if (order.tabId === payload.tabId) {
          return {
            ...order,
            items: order.items.map(item => 
              item.id === payload.tabItemId 
                ? { ...item, status: payload.status }
                : item
            ),
          };
        }
        return order;
      }));
    });
    
    return () => {
      socket.emit('kitchen:leave', { venueId });
      socket.off('kitchen:new-order');
      socket.off('kitchen:order-updated');
    };
  }, [socket, connected, venueId]);
  
  const updateOrderStatus = (tabItemId: string, status: string) => {
    socket?.emit('kitchen:update-status', { tabItemId, status });
  };
  
  const bumpOrder = (tabItemId: string) => {
    socket?.emit('kitchen:bump', { tabItemId });
  };
  
  return (
    <div className="kitchen-display">
      <h1>Kitchen Orders</h1>
      <div className="orders-grid">
        {orders.map(order => (
          <OrderTicket 
            key={order.tabId} 
            order={order} 
            onUpdateStatus={updateOrderStatus}
            onBump={bumpOrder}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Room Management

### Room Naming Convention

```typescript
// Rooms follow consistent naming pattern

const ROOM_PATTERNS = {
  // Individual tab (customers + assigned server)
  TAB: (tabId: string) => `tab:${tabId}`,
  
  // Venue-wide (all staff)
  VENUE: (venueId: string) => `venue:${venueId}`,
  
  // Kitchen display (kitchen staff only)
  KITCHEN: (venueId: string) => `kitchen:${venueId}`,
  
  // Individual user (personal notifications)
  USER: (userId: string) => `user:${userId}`,
  
  // Table-specific (for future table management features)
  TABLE: (tableId: string) => `table:${tableId}`,
};

// Usage
socket.join(ROOM_PATTERNS.TAB(tab.id));
io.to(ROOM_PATTERNS.VENUE(venue.id)).emit('event', payload);
```

---

## Monitoring & Debugging

### Server-Side Logging

```typescript
// socket-server/lib/logger.ts

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});

// Log all socket events (debug mode)
export function logSocketEvent(event: string, data: any, socketId: string) {
  logger.debug({
    type: 'socket_event',
    event,
    socketId,
    data,
  });
}
```

### Metrics Collection

```typescript
// socket-server/lib/metrics.ts

import { Counter, Gauge, Histogram } from 'prom-client';

export const socketConnections = new Gauge({
  name: 'socket_connections',
  help: 'Current number of socket connections',
});

export const socketEvents = new Counter({
  name: 'socket_events_total',
  help: 'Total socket events processed',
  labelNames: ['event', 'status'],
});

export const socketLatency = new Histogram({
  name: 'socket_event_duration_seconds',
  help: 'Socket event processing duration',
  labelNames: ['event'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// Track connections
io.on('connection', (socket) => {
  socketConnections.inc();
  
  socket.on('disconnect', () => {
    socketConnections.dec();
  });
});

// Track events
socket.on('*', (event, data) => {
  const start = Date.now();
  
  // ... handle event
  
  const duration = (Date.now() - start) / 1000;
  socketEvents.inc({ event, status: 'success' });
  socketLatency.observe({ event }, duration);
});
```

---

## Deployment (Railway)

### Railway Configuration

```yaml
# railway.toml

[build]
builder = "NIXPACKS"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "npm run start:socket"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
NODE_ENV = "production"
```

### Dockerfile (Alternative)

```dockerfile
# Dockerfile

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY socket-server ./socket-server
COPY prisma ./prisma

RUN npx prisma generate

EXPOSE 3002

CMD ["node", "socket-server/index.js"]
```

### Environment Variables

```bash
# Railway environment variables

NODE_ENV=production
PORT=3002

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Redis (Upstash)
REDIS_URL=redis://...
REDIS_PASSWORD=...

# Authentication
NEXTAUTH_SECRET=...
SOCKET_SERVER_SECRET=...

# Logging
LOG_LEVEL=info

# CORS
NEXTAUTH_URL=https://app.crowdiant.com
POS_URL=https://pos.crowdiant.com
```

---

## Load Testing

### Socket.io Artillery Load Test

```yaml
# load-test/socket-artillery.yml

config:
  target: "http://localhost:3002"
  socketio:
    transports: ["websocket"]
  phases:
    - duration: 60
      arrivalRate: 10  # 10 new connections per second
      name: "Warm up"
    - duration: 120
      arrivalRate: 50  # 50 new connections per second
      name: "Ramp up"
    - duration: 300
      arrivalRate: 100  # 100 new connections per second
      name: "Sustained load"

scenarios:
  - name: "Tab viewer"
    engine: "socketio"
    flow:
      - emit:
          channel: "tab:join"
          data:
            tabId: "{{ $randomString() }}"
      - think: 5
      - emit:
          channel: "tab:leave"
          data:
            tabId: "{{ $randomString() }}"

  - name: "Kitchen display"
    engine: "socketio"
    flow:
      - emit:
          channel: "kitchen:join"
          data:
            venueId: "test-venue-id"
      - think: 60
```

Run test:
```bash
artillery run load-test/socket-artillery.yml
```

---

## Troubleshooting

### Common Issues

**1. Connection Timeout**
```typescript
// Increase timeout settings
io.set('heartbeat timeout', 60000);
io.set('heartbeat interval', 25000);
```

**2. CORS Errors**
```typescript
// Verify allowed origins
const allowedOrigins = [
  process.env.NEXTAUTH_URL,
  process.env.POS_URL,
  'http://localhost:3000',  // Development
];
```

**3. Redis Connection Issues**
```typescript
// Add connection retry logic
pubClient.on('error', (err) => {
  logger.error('Redis pub client error', err);
});

pubClient.on('reconnecting', () => {
  logger.info('Redis pub client reconnecting...');
});
```

**4. Memory Leaks**
```typescript
// Ensure proper cleanup
socket.on('disconnect', () => {
  socket.removeAllListeners();
  socket.data = {};
});
```

---

## Security Considerations

### Authentication Token Validation

```typescript
// Validate token freshness
const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000;  // 24 hours

if (payload.iat && Date.now() - payload.iat * 1000 > TOKEN_MAX_AGE) {
  throw new Error('Token expired');
}
```

### Rate Limiting

```typescript
// socket-server/middleware/rate-limit.ts

import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 100,  // 100 events
  duration: 60,  // per 60 seconds
});

export async function rateLimitMiddleware(socket: Socket, next: Function) {
  const userId = socket.data.user.id;
  
  try {
    await rateLimiter.consume(userId);
    next();
  } catch {
    next(new Error('Rate limit exceeded'));
  }
}

io.use(rateLimitMiddleware);
```

### Input Validation

```typescript
// Always validate incoming data with Zod
socket.on('event', (data) => {
  try {
    const validated = eventSchema.parse(data);
    // Process validated data
  } catch (error) {
    socket.emit('error', { message: 'Invalid data' });
  }
});
```

---

_Real-Time Architecture Specification v1.0_
_Generated: 2025-11-25_
_For: Crowdiant Restaurant OS - Socket.io Implementation_
