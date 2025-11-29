# Crowdiant Restaurant OS - Architecture

**Author:** Bradley
**Date:** 2025-11-25
**Version:** 1.0

---

## Executive Summary

Crowdiant Restaurant OS is architected as a cloud-native, multi-tenant SaaS platform built on modern TypeScript full-stack technologies. The architecture prioritizes real-time operations (essential for restaurant service), payment security (PCI DSS compliance), and horizontal scalability to support growth from single venues to enterprise chains. A modular monolith approach is chosen for MVP to accelerate development while maintaining clear boundaries for future service extraction.

---

## Project Initialization

First implementation story should execute:

```bash
npx create-t3-app@latest crowdiant-os --typescript --tailwind --trpc --prisma --nextAuth --app-router
```

This establishes the base architecture with these decisions:
- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript (strict mode)
- **API Layer:** tRPC for type-safe client-server communication
- **ORM:** Prisma with PostgreSQL
- **Auth:** NextAuth.js (extended for multi-tenant)
- **Styling:** Tailwind CSS + shadcn/ui
- **Validation:** Built-in tRPC + Zod

---

## Decision Summary

| Category | Decision | Version | Affects FR Categories | Rationale |
|----------|----------|---------|----------------------|-----------|
| Framework | Next.js (App Router) | 14.x | All | Server components, streaming, modern patterns |
| Language | TypeScript (strict) | 5.x | All | Type safety for complex domain |
| Database | PostgreSQL | 16.x | All persistence | ACID, row-level security, proven reliability |
| ORM | Prisma | 5.x | All data access | Type-safe queries, migrations, studio |
| Auth | NextAuth.js + Custom | 5.x | User Management, Trust | Multi-tenant, extensible for trust system |
| API | tRPC | 11.x | All client-server | End-to-end type safety |
| Real-time | Socket.io | 4.x | KDS, Table Status | Reliable WebSocket with fallback |
| Payments | Stripe Connect | Latest | Express Checkout, POS | Marketplace model, pre-auth support |
| Cache | Redis | 7.x | Session, Trust Scores | Fast reads, pub/sub for real-time |
| Queue | BullMQ | 5.x | Notifications, Async | Redis-backed, reliable job processing |
| Email | Resend | Latest | Customer Comms | Modern, React Email compatible |
| SMS | Twilio | Latest | Express Checkout, Comms | Reliable, 2-way messaging |
| Storage | AWS S3 | Latest | Menu images, receipts | Scalable, CDN-compatible |
| Search | PostgreSQL FTS | 16.x | Menu, Customer lookup | Good enough for MVP, Algolia later |
| Styling | Tailwind + shadcn/ui | 3.x / Latest | All UI | Rapid development, customizable |
| Testing | Vitest + Playwright | Latest | All | Fast unit tests, reliable E2E |
| Deployment | Vercel + PlanetScale | Latest | All | Serverless scale, managed DB |

---

## Project Structure

```
crowdiant-os/
├── .env.example                    # Environment variables template
├── .env.local                      # Local development (gitignored)
├── .eslintrc.cjs                   # ESLint configuration
├── .prettierrc                     # Prettier configuration
├── next.config.mjs                 # Next.js configuration
├── package.json                    # Dependencies
├── prisma/
│   ├── schema.prisma               # Database schema
│   ├── migrations/                 # Migration history
│   └── seed.ts                     # Development seed data
├── public/
│   ├── fonts/                      # Custom fonts
│   └── images/                     # Static images
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Auth route group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/            # Venue dashboard group
│   │   │   ├── layout.tsx          # Sidebar, nav
│   │   │   ├── overview/           # Dashboard home
│   │   │   ├── orders/             # Order management
│   │   │   ├── menu/               # Menu management
│   │   │   ├── tables/             # Table management
│   │   │   ├── kitchen/            # KDS view
│   │   │   ├── reports/            # Analytics
│   │   │   └── settings/           # Venue settings
│   │   ├── (pos)/                  # POS terminal view
│   │   │   ├── layout.tsx          # Full-screen POS layout
│   │   │   ├── terminal/           # Order entry
│   │   │   └── checkout/           # Payment processing
│   │   ├── (customer)/             # Customer-facing
│   │   │   ├── tab/[tabId]/        # View/close tab
│   │   │   ├── receipt/[id]/       # Digital receipt
│   │   │   └── profile/            # Customer profile
│   │   ├── api/
│   │   │   ├── trpc/[trpc]/        # tRPC handler
│   │   │   ├── webhooks/           # External webhooks
│   │   │   │   ├── stripe/
│   │   │   │   └── twilio/
│   │   │   └── cron/               # Scheduled jobs
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Landing page
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── forms/                  # Form components
│   │   ├── pos/                    # POS-specific components
│   │   │   ├── OrderPanel.tsx
│   │   │   ├── MenuGrid.tsx
│   │   │   ├── CartDrawer.tsx
│   │   │   └── PaymentModal.tsx
│   │   ├── kitchen/                # KDS components
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderQueue.tsx
│   │   │   └── StationFilter.tsx
│   │   ├── checkout/               # Express Checkout components
│   │   │   ├── TabView.tsx
│   │   │   ├── TipSelector.tsx
│   │   │   └── SelfClose.tsx
│   │   └── shared/                 # Shared components
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── LoadingStates.tsx
│   ├── server/
│   │   ├── api/
│   │   │   ├── root.ts             # tRPC root router
│   │   │   └── routers/
│   │   │       ├── venue.ts        # Venue management
│   │   │       ├── user.ts         # User management
│   │   │       ├── menu.ts         # Menu management
│   │   │       ├── order.ts        # Order management
│   │   │       ├── tab.ts          # Tab/Express Checkout
│   │   │       ├── payment.ts      # Payment processing
│   │   │       ├── table.ts        # Table management
│   │   │       ├── kitchen.ts      # KDS operations
│   │   │       ├── trust.ts        # Trust scoring
│   │   │       ├── customer.ts     # Customer profiles
│   │   │       ├── analytics.ts    # Reporting
│   │   │       └── notification.ts # Notifications
│   │   ├── db.ts                   # Prisma client
│   │   ├── auth.ts                 # NextAuth config
│   │   └── stripe.ts               # Stripe client
│   ├── lib/
│   │   ├── utils.ts                # Utility functions
│   │   ├── validators.ts           # Zod schemas
│   │   ├── constants.ts            # App constants
│   │   ├── trust-calculator.ts     # Trust score algorithm
│   │   ├── preauth-calculator.ts   # Pre-auth amount logic
│   │   └── formatters.ts           # Date, currency formatters
│   ├── hooks/
│   │   ├── useTab.ts               # Tab state management
│   │   ├── useOrder.ts             # Order state
│   │   ├── useSocket.ts            # WebSocket connection
│   │   └── useVenue.ts             # Current venue context
│   ├── stores/
│   │   ├── pos-store.ts            # POS state (Zustand)
│   │   └── kitchen-store.ts        # KDS state
│   ├── types/
│   │   ├── index.ts                # Shared types
│   │   ├── menu.ts                 # Menu types
│   │   ├── order.ts                # Order types
│   │   └── payment.ts              # Payment types
│   └── styles/
│       └── globals.css             # Global styles + Tailwind
├── socket-server/                   # Separate Socket.io server
│   ├── index.ts                    # Socket server entry
│   ├── handlers/
│   │   ├── kitchen.ts              # KDS real-time
│   │   ├── tables.ts               # Table status
│   │   └── orders.ts               # Order updates
│   └── auth.ts                     # Socket auth middleware
├── workers/                         # Background job processors
│   ├── notification-worker.ts      # SMS/email sending
│   ├── auto-close-worker.ts        # Walk-away detection
│   └── analytics-worker.ts         # Report generation
├── tests/
│   ├── unit/                       # Unit tests
│   ├── integration/                # API tests
│   └── e2e/                        # Playwright tests
│       ├── pos.spec.ts
│       ├── checkout.spec.ts
│       └── kitchen.spec.ts
└── docs/
    ├── api/                        # API documentation
    └── deployment/                 # Deployment guides
```

---

## FR Category to Architecture Mapping

| FR Category | Primary Module(s) | Database Tables | API Routers | Components |
|-------------|-------------------|-----------------|-------------|------------|
| User & Account Management | `src/server/api/routers/user.ts`, `venue.ts` | users, venues, staff_assignments | user, venue | Auth pages, Settings |
| Express Checkout & Tab | `src/server/api/routers/tab.ts`, `payment.ts` | tabs, tab_items, preauthorizations | tab, payment | TabView, SelfClose |
| Trust & Reputation | `src/server/api/routers/trust.ts` | trust_scores, trust_events | trust | Profile, Trust indicators |
| Point of Sale | `src/server/api/routers/order.ts`, `menu.ts` | orders, order_items, menus, items | order, menu | POS components |
| Menu Management | `src/server/api/routers/menu.ts` | menus, categories, items, modifiers | menu | Menu editor |
| Table & Floor | `src/server/api/routers/table.ts` | tables, floor_plans, reservations | table | Floor plan, Table grid |
| Kitchen Display | `src/server/api/routers/kitchen.ts`, socket-server | orders, order_items | kitchen | KDS components |
| Customer Communication | `workers/notification-worker.ts` | notifications, message_templates | notification | N/A (backend) |
| Analytics & Reporting | `src/server/api/routers/analytics.ts` | Aggregated from all | analytics | Report views |
| Integrations | `src/app/api/webhooks/` | integration_configs | N/A | Settings/Integrations |

---

## Technology Stack Details

### Core Technologies

#### Next.js 14+ (App Router)
- **Why:** Server Components reduce client JavaScript, streaming for fast initial paint
- **Configuration:**
  - App Router (not Pages)
  - Server Actions for mutations where appropriate
  - Parallel routes for complex layouts
  - Intercepting routes for modals
- **Routing Strategy:**
  - Route groups: `(auth)`, `(dashboard)`, `(pos)`, `(customer)`
  - Dynamic routes: `/tab/[tabId]`, `/order/[orderId]`
  - API routes for webhooks only (tRPC for internal)

#### PostgreSQL 16
- **Why:** ACID compliance for financial transactions, Row Level Security for multi-tenant isolation
- **Features Used:**
  - Row Level Security (RLS) for tenant isolation
  - Full-text search for menu/customer lookup
  - JSONB for flexible metadata
  - Triggers for audit logging
- **Hosting:** PlanetScale (serverless-compatible) or Supabase

#### Prisma ORM
- **Why:** Type-safe database access, excellent DX, automatic migrations
- **Patterns:**
  - Soft deletes via `deletedAt` column
  - Multi-tenant via `venueId` on all tables
  - Cascade rules defined in schema
  - Custom middleware for audit logging

#### tRPC
- **Why:** End-to-end type safety without code generation
- **Patterns:**
  - Input validation with Zod
  - Context includes user + venue
  - Middleware for auth + venue access
  - Subscriptions for real-time (via WebSocket adapter)

### Integration Points

#### Payment: Stripe Connect
```typescript
// Payment flow architecture
interface PaymentIntegration {
  // Venue onboarding
  createConnectedAccount(venue: Venue): Promise<StripeAccountId>;
  
  // Express Checkout pre-authorization
  createPreAuth(params: {
    customerId?: string;      // Stripe customer if exists
    paymentMethod: string;    // Card token
    amount: number;           // Pre-auth amount (configurable)
    venueId: string;
    tabId: string;
    metadata: Record<string, string>;
  }): Promise<PaymentIntent>;
  
  // Capture on tab close
  capturePreAuth(params: {
    paymentIntentId: string;
    finalAmount: number;      // Actual tab total
    tipAmount: number;
  }): Promise<PaymentIntent>;
  
  // Cancel unused pre-auth
  cancelPreAuth(paymentIntentId: string): Promise<void>;
  
  // Webhooks
  handleWebhook(event: Stripe.Event): Promise<void>;
}
```

#### Real-time: Socket.io
```typescript
// Socket event architecture
interface SocketEvents {
  // Kitchen Display
  'kitchen:new-order': { orderId: string; items: OrderItem[] };
  'kitchen:item-ready': { orderId: string; itemId: string };
  'kitchen:order-complete': { orderId: string };
  
  // Table Status
  'table:status-changed': { tableId: string; status: TableStatus };
  'table:assigned': { tableId: string; serverId: string };
  
  // Tab Updates (customer-facing)
  'tab:item-added': { tabId: string; item: TabItem };
  'tab:closed': { tabId: string; receipt: Receipt };
  
  // Notifications
  'notification:new': { type: string; message: string };
}
```

#### SMS: Twilio
```typescript
// Notification patterns
interface NotificationService {
  // Express Checkout confirmations
  sendTabOpenConfirmation(params: {
    phone: string;
    venueName: string;
    tabViewUrl: string;
  }): Promise<void>;
  
  // Walk-away warning (before auto-charge)
  sendAutoCloseWarning(params: {
    phone: string;
    tabAmount: number;
    minutesUntilClose: number;
    cancelUrl: string;
  }): Promise<void>;
  
  // Receipt delivery
  sendReceipt(params: {
    phone: string;
    receiptUrl: string;
    total: number;
  }): Promise<void>;
}
```

---

## Novel Pattern Designs

### Pattern 1: Trust Scoring System

**Purpose:** Calculate and manage customer trust levels for Express Checkout friction reduction

**Components:**
1. **TrustCalculator** - Core scoring algorithm
2. **TrustEventLogger** - Records trust-affecting events
3. **TrustLevelResolver** - Maps scores to levels (0-4)
4. **CrossVenueTrustBridge** - Handles trust transfer between venues

**Data Flow:**
```
Customer Action → TrustEventLogger → TrustCalculator → Database Update
                                            ↓
                     TrustLevelResolver → PreAuth Amount Decision
```

**Implementation:**

```typescript
// Trust score calculation
interface TrustScore {
  customerId: string;
  venueId: string;          // Per-venue score
  networkScore: number;     // Cross-network aggregate
  localScore: number;       // This venue only
  level: TrustLevel;        // 0-4
  lastCalculated: Date;
}

enum TrustLevel {
  NEW = 0,           // First time, full pre-auth
  FAMILIAR = 1,      // 2-5 successful visits, standard pre-auth
  REGULAR = 2,       // 6-15 visits, reduced pre-auth
  TRUSTED = 3,       // 16+ visits, minimal pre-auth
  VIP = 4            // Venue-nominated, no pre-auth
}

// Trust events that affect score
type TrustEvent = 
  | { type: 'SUCCESSFUL_PAYMENT'; amount: number }
  | { type: 'GENEROUS_TIP'; percentage: number }
  | { type: 'WALK_AWAY_RECOVERED' }        // Slight negative
  | { type: 'CHARGEBACK' }                  // Major negative
  | { type: 'DISPUTE' }                     // Moderate negative
  | { type: 'ACCOUNT_VERIFIED' }            // Bonus
  | { type: 'VIP_NOMINATION'; nominatedBy: string };

// Trust inheritance for cross-venue
interface TrustInheritance {
  sourceVenueId: string;
  targetVenueId: string;
  inheritanceRate: number;  // 0.5 = 50% of source trust
  inherited: number;
}
```

**Affects FR Categories:** Trust & Reputation, Express Checkout

---

### Pattern 2: Express Checkout State Machine

**Purpose:** Manage tab lifecycle with Express Checkout pre-authorization

**States:**
```
PENDING_AUTH → OPEN → CLOSING → CLOSED
      ↓                  ↑
   FAILED          WALK_AWAY
                       ↓
                 AUTO_CLOSED
```

**State Transitions:**

```typescript
interface TabStateMachine {
  // State definitions
  states: {
    PENDING_AUTH: 'Awaiting card authorization';
    OPEN: 'Tab active, items can be added';
    CLOSING: 'Customer initiated close, awaiting tip';
    WALK_AWAY: 'Customer left without closing, grace period';
    AUTO_CLOSED: 'System closed tab after walk-away';
    CLOSED: 'Tab successfully closed';
    FAILED: 'Authorization failed';
  };
  
  // Transitions
  transitions: {
    'PENDING_AUTH → OPEN': 'Pre-auth successful';
    'PENDING_AUTH → FAILED': 'Pre-auth declined';
    'OPEN → CLOSING': 'Customer or server initiates close';
    'OPEN → WALK_AWAY': 'Inactivity timeout + departure signals';
    'CLOSING → CLOSED': 'Payment captured successfully';
    'WALK_AWAY → AUTO_CLOSED': 'Grace period expired';
    'WALK_AWAY → CLOSING': 'Customer responded to warning';
  };
}

// Walk-away detection signals
interface WalkAwayDetection {
  // Time-based
  lastActivityMinutes: number;    // No orders in X minutes
  averageVisitDuration: number;   // Venue-specific baseline
  
  // Behavioral
  checkRequested: boolean;        // Asked for check but not paid
  tableCleared: boolean;          // Server marked cleared
  
  // External (future)
  beaconLeft: boolean;            // Customer's phone left vicinity
}
```

**Affects FR Categories:** Express Checkout & Tab Management

---

### Pattern 3: Multi-Tenant Data Isolation

**Purpose:** Ensure complete data separation between venues while allowing cross-venue features

**Architecture:**

```typescript
// Every tenant-scoped table includes venueId
interface TenantModel {
  id: string;
  venueId: string;          // REQUIRED
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;         // Soft delete
}

// Prisma middleware for automatic tenant filtering
const tenantMiddleware: Prisma.Middleware = async (params, next) => {
  // Get venueId from context
  const venueId = getCurrentVenueId();
  
  // Auto-inject venueId on creates
  if (params.action === 'create') {
    params.args.data.venueId = venueId;
  }
  
  // Auto-filter on reads
  if (['findMany', 'findFirst', 'findUnique'].includes(params.action)) {
    params.args.where = {
      ...params.args.where,
      venueId,
      deletedAt: null,      // Exclude soft-deleted
    };
  }
  
  return next(params);
};

// Cross-venue operations (explicit opt-in)
interface CrossVenueService {
  // Trust score aggregation
  getNetworkTrustScore(customerId: string): Promise<number>;
  
  // Customer profile lookup (with consent)
  findCustomerAcrossNetwork(email: string): Promise<Customer | null>;
  
  // Multi-venue operator reports
  getChainAnalytics(operatorId: string): Promise<ChainReport>;
}
```

---

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents:

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Database tables | snake_case, plural | `order_items`, `trust_scores` |
| Database columns | snake_case | `created_at`, `venue_id` |
| TypeScript types | PascalCase | `OrderItem`, `TrustScore` |
| TypeScript interfaces | PascalCase, no I prefix | `Order` not `IOrder` |
| Variables/functions | camelCase | `calculateTrustScore()` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_PREAUTH_AMOUNT` |
| React components | PascalCase | `OrderPanel.tsx` |
| React component files | PascalCase | `OrderPanel.tsx` |
| Utility files | kebab-case | `trust-calculator.ts` |
| CSS classes | Tailwind utilities | `className="flex items-center"` |
| API routes | kebab-case | `/api/webhooks/stripe` |
| tRPC procedures | camelCase | `tab.openWithExpressCheckout` |
| Environment variables | SCREAMING_SNAKE_CASE | `DATABASE_URL` |

### Code Organization

**File Structure per Feature:**
```
feature/
├── components/           # React components
│   ├── FeatureName.tsx   # Main component
│   └── SubComponent.tsx  # Sub-components
├── hooks/               # React hooks
│   └── useFeature.ts
├── types.ts             # Feature-specific types
└── utils.ts             # Feature-specific utilities
```

**Import Order:**
```typescript
// 1. External libraries
import { useState } from 'react';
import { api } from '@/lib/trpc';

// 2. Internal absolute imports
import { Button } from '@/components/ui/button';
import { useVenue } from '@/hooks/useVenue';

// 3. Relative imports
import { OrderItem } from './OrderItem';
import type { OrderItemProps } from './types';
```

### Error Handling

**API Errors (tRPC):**
```typescript
// Standard error throwing
import { TRPCError } from '@trpc/server';

throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'Tab not found',
  cause: originalError,
});

// Error codes used:
// - BAD_REQUEST: Invalid input
// - UNAUTHORIZED: Not logged in
// - FORBIDDEN: Logged in but no access
// - NOT_FOUND: Resource doesn't exist
// - CONFLICT: State conflict (e.g., tab already closed)
// - INTERNAL_SERVER_ERROR: Unexpected error
```

**Client-Side Error Handling:**
```typescript
// Use react-hot-toast for user feedback
import { toast } from 'react-hot-toast';

try {
  await mutation.mutateAsync(data);
  toast.success('Tab opened successfully');
} catch (error) {
  if (error instanceof TRPCClientError) {
    toast.error(error.message);
  } else {
    toast.error('Something went wrong. Please try again.');
    // Log to error tracking
    captureException(error);
  }
}
```

### Logging Strategy

**Structured Logging:**
```typescript
import { logger } from '@/lib/logger';

// Log levels
logger.debug('Detailed debug info', { context });
logger.info('Normal operation', { userId, action });
logger.warn('Potential issue', { warning });
logger.error('Error occurred', { error, stack });

// Required context fields
interface LogContext {
  venueId?: string;
  userId?: string;
  tabId?: string;
  action: string;
  [key: string]: unknown;
}
```

**Audit Logging (for compliance):**
```typescript
// All financial operations must be audit logged
interface AuditLog {
  id: string;
  timestamp: Date;
  venueId: string;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

type AuditAction = 
  | 'CREATE_TAB'
  | 'CLOSE_TAB'
  | 'CAPTURE_PAYMENT'
  | 'REFUND'
  | 'VOID'
  | 'MODIFY_ORDER'
  | 'DISCOUNT_APPLIED';
```

---

## Consistency Rules

### Date/Time Handling

```typescript
// ALWAYS use UTC for storage
// ALWAYS use venue timezone for display

import { formatInTimeZone } from 'date-fns-tz';

// Storage: always UTC
const createdAt = new Date(); // UTC

// Display: venue timezone
const displayTime = formatInTimeZone(
  createdAt,
  venue.timezone,  // e.g., 'America/New_York'
  'MMM d, h:mm a'  // e.g., 'Nov 25, 7:30 PM'
);
```

### Currency Handling

```typescript
// ALWAYS store amounts in cents (integer)
// NEVER store as decimal/float

interface MoneyAmount {
  amount: number;     // In cents: 1099 = $10.99
  currency: string;   // ISO 4217: 'USD'
}

// Display formatting
const formatCurrency = (cents: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
};
```

### API Response Format

```typescript
// Success response
{
  success: true,
  data: T,
  meta?: {
    page?: number;
    totalPages?: number;
    totalCount?: number;
  }
}

// Error response (handled by tRPC)
{
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }
}
```

---

## Data Architecture

### Core Domain Models

```prisma
// prisma/schema.prisma (key models)

model Venue {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  timezone      String   @default("America/New_York")
  currency      String   @default("USD")
  
  // Stripe Connect
  stripeAccountId String?
  stripeOnboarded Boolean @default(false)
  
  // Express Checkout Config
  preAuthAmountCents Int  @default(5000)  // $50 default
  walkAwayGraceMinutes Int @default(15)
  minTrustLevelNoPreAuth Int @default(3)
  
  // Relations
  staff         StaffAssignment[]
  menus         Menu[]
  tables        Table[]
  tabs          Tab[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  phone         String?
  role          UserRole @default(CUSTOMER)
  
  // Customer-specific
  trustScores   TrustScore[]
  tabs          Tab[]
  
  // Staff-specific
  staffAt       StaffAssignment[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Tab {
  id            String   @id @default(cuid())
  venueId       String
  customerId    String?
  tableId       String?
  serverId      String?
  
  status        TabStatus @default(PENDING_AUTH)
  
  // Express Checkout
  stripePaymentIntentId String?
  preAuthAmountCents    Int
  
  // Totals
  subtotalCents Int      @default(0)
  taxCents      Int      @default(0)
  tipCents      Int      @default(0)
  totalCents    Int      @default(0)
  
  // Timestamps
  openedAt      DateTime @default(now())
  closedAt      DateTime?
  
  // Relations
  venue         Venue    @relation(fields: [venueId], references: [id])
  customer      User?    @relation(fields: [customerId], references: [id])
  items         TabItem[]
  
  @@index([venueId, status])
}

model TrustScore {
  id            String   @id @default(cuid())
  customerId    String
  venueId       String
  
  localScore    Float    @default(0)
  networkScore  Float    @default(0)
  level         Int      @default(0)  // 0-4
  
  visitCount    Int      @default(0)
  totalSpentCents Int    @default(0)
  
  customer      User     @relation(fields: [customerId], references: [id])
  events        TrustEvent[]
  
  updatedAt     DateTime @updatedAt
  
  @@unique([customerId, venueId])
}
```

### Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         VENUE                                    │
│  (Central tenant - all data scoped by venueId)                  │
└─────────────────────────────────────────────────────────────────┘
         │
         ├──── Staff Assignments ────── Users (staff role)
         │
         ├──── Menus ─── Categories ─── Items ─── Modifiers
         │
         ├──── Tables ─── Floor Plans
         │
         ├──── Tabs ─── Tab Items ─── Orders ─── Order Items
         │         │
         │         └──── Pre-authorizations
         │
         └──── Trust Scores (per customer per venue)
                    │
                    └──── Trust Events

┌─────────────────────────────────────────────────────────────────┐
│                         USER                                     │
│  (Cross-venue identity)                                          │
└─────────────────────────────────────────────────────────────────┘
         │
         ├──── Staff at multiple venues
         │
         ├──── Customer at multiple venues
         │
         ├──── Trust scores (per venue)
         │
         └──── Tabs (history across venues)
```

---

## API Contracts

### tRPC Router Structure

```typescript
// src/server/api/root.ts
export const appRouter = createTRPCRouter({
  // Venue management
  venue: venueRouter,
  
  // User/Staff management
  user: userRouter,
  
  // Menu management
  menu: menuRouter,
  
  // Order operations
  order: orderRouter,
  
  // Tab/Express Checkout
  tab: tabRouter,
  
  // Payment processing
  payment: paymentRouter,
  
  // Table management
  table: tableRouter,
  
  // Kitchen display
  kitchen: kitchenRouter,
  
  // Trust scoring
  trust: trustRouter,
  
  // Customer profiles
  customer: customerRouter,
  
  // Analytics
  analytics: analyticsRouter,
  
  // Notifications
  notification: notificationRouter,
});
```

### Key API Endpoints

```typescript
// Tab Router (Express Checkout)
tabRouter = createTRPCRouter({
  // Open tab with Express Checkout
  openWithExpressCheckout: protectedProcedure
    .input(z.object({
      tableId: z.string().optional(),
      paymentMethodId: z.string(),
      customerPhone: z.string().optional(),
      customerEmail: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Returns: Tab with pre-auth status
    }),
  
  // Get current tab
  getCurrent: protectedProcedure
    .input(z.object({ tabId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Returns: Tab with items, totals
    }),
  
  // Customer self-view (public link)
  getByAccessToken: publicProcedure
    .input(z.object({ accessToken: z.string() }))
    .query(async ({ input }) => {
      // Returns: Tab summary for customer view
    }),
  
  // Add item to tab
  addItem: protectedProcedure
    .input(z.object({
      tabId: z.string(),
      menuItemId: z.string(),
      quantity: z.number().default(1),
      modifiers: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Returns: Updated tab
    }),
  
  // Close tab (server-initiated)
  close: protectedProcedure
    .input(z.object({
      tabId: z.string(),
      tipCents: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      // Returns: Closed tab with receipt
    }),
  
  // Customer self-close
  customerClose: publicProcedure
    .input(z.object({
      accessToken: z.string(),
      tipCents: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      // Returns: Receipt URL
    }),
});
```

---

## Security Architecture

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  NextAuth   │────▶│  Database   │
│             │◀────│  (Session)  │◀────│  (Users)    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │
      │                    ▼
      │            ┌─────────────┐
      │            │   Redis     │
      │            │  (Sessions) │
      │            └─────────────┘
      │
      ▼
┌─────────────┐
│   tRPC      │ ← Middleware checks session + venue access
│   Context   │
└─────────────┘
```

### Authorization Layers

```typescript
// 1. Authentication (is user logged in?)
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { user: ctx.session.user } });
});

// 2. Venue Access (does user have access to this venue?)
const hasVenueAccess = isAuthed.unstable_pipe(async ({ ctx, next }) => {
  const venueId = ctx.input?.venueId || ctx.headers['x-venue-id'];
  
  const access = await ctx.prisma.staffAssignment.findFirst({
    where: { userId: ctx.user.id, venueId },
  });
  
  if (!access) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  
  return next({ ctx: { venue: access.venue, role: access.role } });
});

// 3. Role Check (does user have required role?)
const requireRole = (roles: StaffRole[]) => 
  hasVenueAccess.unstable_pipe(({ ctx, next }) => {
    if (!roles.includes(ctx.role)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return next({ ctx });
  });

// Usage
managerProcedure = t.procedure.use(requireRole(['OWNER', 'MANAGER']));
serverProcedure = t.procedure.use(requireRole(['OWNER', 'MANAGER', 'SERVER']));
```

### Payment Security (PCI DSS)

```typescript
// CRITICAL: Never handle raw card numbers
// Always use Stripe Elements + Payment Intents

// Client-side: Collect card with Stripe Elements
const { paymentMethod } = await stripe.createPaymentMethod({
  type: 'card',
  card: elements.getElement(CardElement),
});

// Send only the payment method ID (token) to backend
await api.tab.openWithExpressCheckout.mutate({
  paymentMethodId: paymentMethod.id,  // pm_xxx (safe to send)
  // NEVER send card numbers, CVV, etc.
});

// Server-side: Use payment method ID with Stripe API
const paymentIntent = await stripe.paymentIntents.create({
  amount: preAuthAmount,
  currency: 'usd',
  payment_method: paymentMethodId,
  capture_method: 'manual',  // Pre-auth only
});
```

---

## Performance Considerations

### Caching Strategy

```typescript
// Redis caching layers
const cacheConfig = {
  // Trust scores (read frequently, update occasionally)
  trustScore: {
    key: (customerId, venueId) => `trust:${customerId}:${venueId}`,
    ttl: 3600,  // 1 hour
    invalidateOn: ['TRUST_EVENT_LOGGED'],
  },
  
  // Menu items (read very frequently, update rarely)
  menuItems: {
    key: (venueId) => `menu:${venueId}`,
    ttl: 300,   // 5 minutes
    invalidateOn: ['MENU_UPDATED'],
  },
  
  // Table status (real-time, short cache)
  tableStatus: {
    key: (venueId) => `tables:${venueId}`,
    ttl: 10,    // 10 seconds
    // Primary source: Socket.io pub/sub
  },
};
```

### Database Optimization

```sql
-- Key indexes for performance
CREATE INDEX idx_tabs_venue_status ON tabs(venue_id, status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_trust_scores_customer ON trust_scores(customer_id);
CREATE INDEX idx_tables_venue ON tables(venue_id);

-- Partial indexes for active records
CREATE INDEX idx_open_tabs ON tabs(venue_id) WHERE status IN ('OPEN', 'PENDING_AUTH');
```

### Real-time Optimization

```typescript
// Socket.io rooms for efficient broadcasting
socket.join(`venue:${venueId}`);           // All venue events
socket.join(`venue:${venueId}:kitchen`);   // Kitchen only
socket.join(`tab:${tabId}`);               // Specific tab updates

// Broadcast to room instead of all connections
io.to(`venue:${venueId}:kitchen`).emit('kitchen:new-order', order);
```

---

## Deployment Architecture

### Infrastructure (Vercel + PlanetScale)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CDN (Vercel Edge)                        │
│  Static assets, ISR pages, Edge functions                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Vercel Serverless                            │
│  Next.js App Router, tRPC handlers, API routes                   │
└─────────────────────────────────────────────────────────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ PlanetScale │     │    Upstash      │     │     Railway     │
│ (PostgreSQL)│     │    (Redis)      │     │  (Socket.io +   │
│             │     │                 │     │   Workers)      │
└─────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │     External Services          │
              │  Stripe, Twilio, Resend, S3   │
              └───────────────────────────────┘
```

### Environment Configuration

```bash
# .env.example

# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_URL="https://app.crowdiant.com"
NEXTAUTH_SECRET="..."

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PUBLISHABLE_KEY="pk_..."

# Twilio
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."

# Redis
REDIS_URL="redis://..."

# Email (Resend)
RESEND_API_KEY="..."

# Storage (S3)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="..."
AWS_REGION="us-east-1"
```

---

## Development Environment

### Prerequisites

- Node.js 20.x LTS
- pnpm 8.x (preferred package manager)
- Docker Desktop (for local Postgres/Redis)
- Stripe CLI (for webhook testing)

### Setup Commands

```bash
# Clone and install
git clone https://github.com/crowdiant/crowdiant-os.git
cd crowdiant-os
pnpm install

# Environment setup
cp .env.example .env.local
# Fill in required values

# Database setup
pnpm db:push    # Push schema to database
pnpm db:seed    # Seed development data

# Start development
pnpm dev        # Next.js dev server (port 3000)

# In separate terminals:
pnpm socket:dev # Socket.io server (port 3001)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Other commands
pnpm test       # Run tests
pnpm lint       # ESLint
pnpm typecheck  # TypeScript check
pnpm db:studio  # Prisma Studio (database GUI)
```

---

## Architecture Decision Records (ADRs)

### ADR-001: Modular Monolith over Microservices

**Context:** Deciding initial architecture pattern for MVP.

**Decision:** Start with modular monolith (clear module boundaries, shared database) rather than microservices.

**Rationale:**
- Faster initial development
- Simpler deployment and debugging
- Clear boundaries allow future extraction
- Team size (1-3 developers) doesn't justify microservice overhead

**Consequences:**
- Must maintain module boundaries in code reviews
- May need to extract services as scale demands (e.g., payment service)

---

### ADR-002: tRPC over REST/GraphQL

**Context:** Choosing API communication pattern.

**Decision:** Use tRPC for all internal client-server communication.

**Rationale:**
- End-to-end type safety without code generation
- Excellent developer experience
- Perfect fit for Next.js App Router
- Can add REST endpoints later for external integrations

**Consequences:**
- External integrations need separate REST API
- Team must learn tRPC patterns

---

### ADR-003: Stripe Connect Marketplace Model

**Context:** How to handle payments across multiple venues.

**Decision:** Use Stripe Connect with Express accounts for each venue.

**Rationale:**
- Venues are independent businesses (own payouts)
- Platform can take transaction fee
- Pre-authorization fully supported
- Simplified PCI compliance

**Consequences:**
- Venue onboarding requires Stripe Connect setup
- Platform takes responsibility for disputes
- More complex than direct Stripe integration

---

### ADR-004: PostgreSQL with Row Level Security

**Context:** Multi-tenant data isolation strategy.

**Decision:** Use PostgreSQL Row Level Security (RLS) for tenant isolation, with application-level enforcement as primary.

**Rationale:**
- Defense in depth (both app + database enforce isolation)
- Single database simplifies operations
- RLS prevents bugs from leaking data
- Supports cross-tenant queries when needed (admin reports)

**Consequences:**
- Must configure RLS policies for each table
- Performance overhead on complex queries
- Testing must verify isolation

---

### ADR-005: Separate Socket.io Server

**Context:** Real-time communication architecture for KDS and table status.

**Decision:** Run Socket.io on separate Railway service, not embedded in Vercel serverless.

**Rationale:**
- Vercel serverless doesn't support long-lived WebSocket connections
- Socket.io needs persistent process for connection management
- Railway supports always-on containers
- Can scale socket server independently

**Consequences:**
- Additional infrastructure to manage
- Need to sync auth between Next.js and Socket server
- CORS configuration required

---

_Generated by BMAD Decision Architecture Workflow v1.0_
_Date: 2025-11-25_
_For: Bradley_
