# Epic 1 Technical Specification: Foundation & Platform Setup

**Epic ID:** E1  
**Priority:** P0 - Critical  
**Sprint:** Sprint 0  
**Author:** Bob (Scrum Master)  
**Date:** 2025-11-26  
**Status:** Draft  

---

## Overview

Epic 1 establishes the foundational architecture and development infrastructure for the Crowdiant Restaurant OS platform. This epic creates the technical bedrock upon which all subsequent features will be built, including project scaffolding using the T3 Stack, multi-tenant database architecture with Prisma, authentication/authorization framework with NextAuth.js, shared UI component library with shadcn/ui, CI/CD pipeline with Vercel, and comprehensive observability infrastructure with Sentry.

The success of this epic directly impacts development velocity, system reliability, security posture, and operational visibility for all future sprints. Without a solid foundation, technical debt accumulates rapidly in a multi-tenant SaaS fintech platform.

**Key Goals:**
- Establish reproducible development environment for all team members
- Implement secure multi-tenant data isolation from day one
- Enable rapid feature development with type-safe APIs and reusable UI components
- Deploy production-ready infrastructure with monitoring and error tracking
- Create scalable CI/CD pipeline supporting preview deployments and automated testing

---

## Objectives and Scope (Updated 2025-11-30)

### In Scope
- ✅ T3 Stack initialization (Next.js 14+, TypeScript, tRPC, Prisma, NextAuth, Tailwind)
- ✅ PostgreSQL database setup (managed Postgres) with Prisma Accelerate pooling
- ✅ Core Prisma schema with multi-tenant models (Venue, User, StaffAssignment)
- ✅ NextAuth.js authentication with multi-tenant session management
- ✅ tRPC middleware for authentication and venue access control
- ✅ shadcn/ui component library setup with core components
- ✅ Vercel deployment pipeline with preview environments
- ✅ Environment variable management (.env.example, Vercel configuration)
- ✅ Sentry error tracking and performance monitoring
- ✅ Structured logging with Pino (Winston deferred)
- ✅ Health check endpoints (/api/health) – DB & Redis endpoints pending
- ✅ Development documentation (README.md, setup instructions)

### Out of Scope (Future Epics)
- ❌ Business logic features (Express Checkout, POS, etc.)
- ❌ Stripe Connect integration (Epic 3)
- ❌ Redis setup (will be added in Epic 3 for pre-auth state)
- ❌ Socket.io real-time infrastructure (Epic 6 for KDS)
- ❌ Production-scale load testing
- ❌ Advanced monitoring dashboards (Grafana, DataDog APM)

---

## System Architecture Alignment

### T3 Stack Alignment
The architecture document (Section: Project Initialization) mandates the T3 Stack as the foundation:

```bash
npx create-t3-app@latest crowdiant-os --typescript --tailwind --trpc --prisma --nextAuth --app-router
```

This ensures:
- **Next.js 14+ App Router:** Server components, streaming, modern patterns
- **TypeScript (strict mode):** Type safety for complex restaurant domain
- **tRPC:** End-to-end type safety for all API calls
- **Prisma:** Type-safe database queries with migration management
- **NextAuth.js:** Extensible authentication for multi-tenant scenarios
- **Tailwind CSS:** Utility-first styling with shadcn/ui components

### Architecture Constraints (Adjusted)
1. **Multi-Tenancy:** Core pattern established; additional tenant tables arrive later.
2. **Security:** PCI-adjacent posture; full PCI scope deferred until payment flows (Epic 3).
3. **Real-Time Readiness:** Socket.io deferred (Epics 3 & 6); code structured for future event layer.
4. **Scalability:** Prisma Accelerate pooled connections on Vercel serverless.

### Component Mapping
```
┌─────────────────────────────────────────────────────────────┐
│                       Vercel Edge Network                     │
│                    (Global CDN + Serverless)                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   Next.js 15 App    │
         │   App Router        │◄──── tRPC API Layer (Type-Safe)
         │   (Server + Client) │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │   Prisma ORM        │
         │   (Query Builder)   │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │   PostgreSQL 16     │
         │   (Managed + Accelerate) │◄──── Row-Level Security (Future)
         │   Multi-Tenant DB   │
         └─────────────────────┘

Observability:
┌─────────────────┐
│ Sentry          │◄──── Error Tracking + Performance
│ (Error + APM)   │
└─────────────────┘
┌─────────────────┐
│ Pino Logger     │◄──── Structured Logging (JSON)
│ (Vercel Logs)   │
└─────────────────┘
```

---

## Detailed Design

### 1. Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|----------------|---------------|--------|---------|-------|
| **T3 Stack Scaffold** | Project initialization, dependency management | CLI commands, config files | Initialized project structure | DevOps |
| **Prisma Schema** | Database schema definition, migrations | Schema.prisma changes | Migration files, TypeScript types | Backend |
| **Auth Service** | User authentication, session management | Credentials (email/password) | Session token, user context | Backend |
| **RBAC Middleware** | Role-based access control, venue filtering | Session token, venueId | Authorized request context | Backend |
| **UI Component Library** | Reusable React components | Props, children | Rendered components | Frontend |
| **Deployment Pipeline** | CI/CD automation, environment management | Git push events | Deployed application | DevOps |
| **Observability** | Error tracking, logging, health monitoring | Application events | Logs, metrics, alerts | DevOps |

---

### 2. Data Models

**Core Prisma Schema:**

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// CORE MODELS - Foundation for Multi-Tenancy
// ============================================================================

model Venue {
  id                      String   @id @default(cuid())
  name                    String
  slug                    String   @unique // URL-friendly identifier
  timezone                String   @default("America/New_York")
  currency                String   @default("USD")
  
  // Stripe Connect fields (populated in Epic 3)
  stripeAccountId         String?  @unique
  stripeOnboarded         Boolean  @default(false)
  
  // Express Checkout config (populated in Epic 3)
  preAuthAmountCents      Int      @default(5000) // $50 default
  walkAwayGraceMinutes    Int      @default(15)
  
  // Timestamps
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  deletedAt               DateTime? // Soft delete
  
  // Relations (defined in future epics)
  staff                   StaffAssignment[]
  // menus                Menu[]
  // tables               Table[]
  // tabs                 Tab[]
  
  @@index([slug])
  @@index([stripeAccountId])
  @@map("venues")
}

model User {
  id                      String   @id @default(cuid())
  email                   String   @unique
  name                    String?
  phone                   String?  @unique
  
  // Auth fields (NextAuth integration)
  emailVerified           DateTime?
  image                   String?
  passwordHash            String? // bcrypt, nullable for magic link auth
  
  // Timestamps
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  deletedAt               DateTime? // Soft delete
  
  // Relations
  staffAt                 StaffAssignment[] // Venues where user is staff
  accounts                Account[]
  sessions                Session[]
  // trustScores          TrustScore[] (Epic 7)
  // tabs                 Tab[] (Epic 3)
  
  @@index([email])
  @@index([phone])
  @@map("users")
}

model StaffAssignment {
  id                      String   @id @default(cuid())
  userId                  String
  venueId                 String
  role                    StaffRole
  
  // Timestamps
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  deletedAt               DateTime? // Soft delete (deactivated staff)
  
  // Relations
  user                    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  venue                   Venue    @relation(fields: [venueId], references: [id], onDelete: Cascade)
  
  @@unique([userId, venueId]) // One role per user per venue
  @@index([userId])
  @@index([venueId])
  @@index([role])
  @@map("staff_assignments")
}

enum StaffRole {
  OWNER
  MANAGER
  SERVER
  KITCHEN
  HOST
  CASHIER
}

// ============================================================================
// NEXTAUTH MODELS (Required for NextAuth.js)
// ============================================================================

model Account {
  id                      String   @id @default(cuid())
  userId                  String
  type                    String
  provider                String
  providerAccountId       String
  refresh_token           String?  @db.Text
  access_token            String?  @db.Text
  expires_at              Int?
  token_type              String?
  scope                   String?
  id_token                String?  @db.Text
  session_state           String?
  
  user                    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id                      String   @id @default(cuid())
  sessionToken            String   @unique
  userId                  String
  expires                 DateTime
  
  user                    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}

model VerificationToken {
  identifier              String
  token                   String   @unique
  expires                 DateTime
  
  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

**Key Design Decisions:**

1. **CUID vs UUID:** Using `cuid()` for primary keys (shorter, URL-safe, sortable)
2. **Soft Deletes:** `deletedAt` column on core models for audit trail and potential recovery
3. **Indexes:** Strategic indexes on foreign keys, unique constraints, and frequently queried fields
4. **Snake Case Mapping:** `@@map("table_name")` for database naming convention
5. **Timestamps:** Consistent `createdAt`, `updatedAt` on all models
6. **Multi-Tenant Isolation:** `venueId` foreign key on all tenant-scoped resources (future tables)

---

### 3. APIs and Interfaces

**tRPC Router Structure:**

```typescript
// src/server/api/root.ts
import { createTRPCRouter } from "~/server/api/trpc";
import { venueRouter } from "./routers/venue";
import { userRouter } from "./routers/user";
import { authRouter } from "./routers/auth";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  venue: venueRouter,
});

export type AppRouter = typeof appRouter;
```

**Auth Router (Epic 1):**

```typescript
// src/server/api/routers/auth.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import bcrypt from "bcryptjs";

export const authRouter = createTRPCRouter({
  // Register new user
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);
      
      // Create user
      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
        },
      });
      
      return { success: true, userId: user.id };
    }),
  
  // Request password reset
  requestPasswordReset: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Generate reset token, send email
      // Implementation in Epic 2
      return { success: true };
    }),
});
```

**Venue Router (Epic 1 - Basic Setup):**

```typescript
// src/server/api/routers/venue.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const venueRouter = createTRPCRouter({
  // Get current user's accessible venues
  listAccessible: protectedProcedure
    .query(async ({ ctx }) => {
      const staffAssignments = await ctx.db.staffAssignment.findMany({
        where: {
          userId: ctx.session.user.id,
          deletedAt: null,
        },
        include: {
          venue: true,
        },
      });
      
      return staffAssignments.map(sa => sa.venue);
    }),
  
  // Get venue by ID (must have access)
  getById: protectedProcedure
    .input(z.object({ venueId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify access via hasVenueAccess middleware
      const venue = await ctx.db.venue.findUnique({
        where: { id: input.venueId },
      });
      
      if (!venue) throw new Error("Venue not found");
      return venue;
    }),
});
```

**tRPC Middleware (Authentication & Authorization):**

```typescript
// src/server/api/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/server/db";

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const session = await getServerAuthSession(opts);
  
  return {
    session,
    db,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create();

// Middleware: Require authentication
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

// Middleware: Require venue access (checks staffAssignment)
const enforceVenueAccess = t.middleware(async ({ ctx, next, input }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  
  const venueId = (input as any).venueId;
  if (!venueId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "venueId required" });
  }
  
  const hasAccess = await ctx.db.staffAssignment.findFirst({
    where: {
      userId: ctx.session.user.id,
      venueId: venueId,
      deletedAt: null,
    },
  });
  
  if (!hasAccess) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No access to venue" });
  }
  
  return next({ ctx });
});

// Middleware: Require specific role
const enforceRole = (role: StaffRole) => t.middleware(async ({ ctx, next, input }) => {
  // Implementation checks user role for venue
  // Full implementation in Epic 2
  return next({ ctx });
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const venueProtectedProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(enforceVenueAccess);
```

**Health Check API Endpoints:**

```typescript
// src/app/api/health/route.ts
export async function GET() {
  return Response.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    service: 'crowdiant-os'
  });
}

// src/app/api/health/db/route.ts
import { db } from "~/server/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: 'ok', service: 'database' });
  } catch (error) {
    return Response.json(
      { status: 'error', service: 'database', error: String(error) },
      { status: 503 }
    );
  }
}
```

---

### 4. Workflows and Sequencing

**Story 1.1: Project Initialization Flow**

```
Developer (Local Setup)
    │
    ├──► Run: npx create-t3-app@latest crowdiant-os
    │    └──► Installs: Next.js, TypeScript, tRPC, Prisma, NextAuth, Tailwind
    │
    ├──► Configure package.json (pnpm as package manager)
    │    └──► Add scripts: dev, build, start, lint, format
    │
    ├──► Configure TypeScript (tsconfig.json)
    │    └──► Enable strict mode, path aliases (@/)
    │
    ├──► Create .env.example
    │    └──► Document all required environment variables
    │
    ├──► Run: pnpm install
    │    └──► Install dependencies (~200 packages)
    │
    ├──► Run: pnpm dev
    │    └──► Start development server on localhost:3000
    │
    └──► Verify: Health check endpoint responds
         └──► GET http://localhost:3000/api/health → { status: 'ok' }
```

**Story 1.2: Database Setup Flow**

```
Database Administrator
    │
    ├──► Create PlanetScale account (or Supabase)
    │    └──► Create database: crowdiant-os-dev
    │
    ├──► Copy connection string
    │    └──► Format: mysql://user:pass@host/db?sslaccept=strict
    │
    ├──► Add to .env.local
    │    DATABASE_URL="..."
    │
Developer (Schema Definition)
    │
    ├──► Define Prisma schema (see Data Models section)
    │    └──► Models: Venue, User, StaffAssignment, Account, Session
    │
    ├──► Run: pnpm prisma generate
    │    └──► Generate Prisma Client types
    │
    ├──► Run: pnpm prisma migrate dev --name init
    │    └──► Create initial migration
    │    └──► Apply migration to dev database
    │
    ├──► Run: pnpm prisma studio
    │    └──► Open GUI at http://localhost:5555
    │    └──► Verify tables created
    │
    └──► (Optional) Run: pnpm prisma db seed
         └──► Populate development data
```

**Story 1.3: Authentication Flow**

```
User (Login Request)
    │
    ├──► POST /api/auth/signin
    │    Body: { email, password }
    │
    └──► NextAuth.js Credential Provider
         │
         ├──► Query: User.findUnique({ where: { email } })
         │    └──► User found?
         │
         ├──► bcrypt.compare(password, user.passwordHash)
         │    └──► Password valid?
         │
         ├──► Create Session
         │    └──► Session.create({ userId, expires })
         │
         ├──► Generate JWT
         │    └──► Include: userId, email, name
         │
         └──► Return: Set-Cookie with session token
              └──► Client stores in HttpOnly cookie

Subsequent Request
    │
    ├──► GET /api/trpc/venue.listAccessible
    │    Cookie: session-token=...
    │
    └──► tRPC Context Creation
         │
         ├──► getServerAuthSession(req)
         │    └──► Decode JWT, load session from DB
         │
         ├──► Load User + StaffAssignments
         │    └──► Populate ctx.session.user
         │
         └──► Execute tRPC procedure with authed context
              └──► Access user via ctx.session.user
```

---

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Page Load Time** | < 2s (p95) | Lighthouse, Vercel Analytics |
| **API Response Time** | < 200ms (p95) | tRPC telemetry, Sentry |
| **Database Query Time** | < 50ms (p95) | Prisma query logging |
| **Build Time** | < 3 minutes | Vercel build logs |
| **Time to First Byte (TTFB)** | < 500ms (p95) | Vercel Edge metrics |

**Performance Implementation Notes:**
- Enable Next.js production optimizations (minification, tree-shaking)
- Use Prisma connection pooling (PgBouncer via PlanetScale)
- Implement tRPC batching for multiple queries
- Leverage Vercel Edge caching for static assets
- Add database indexes on frequently queried columns (see Data Models)

**Source:** Architecture doc (Section: Performance Requirements)

---

### Security

| Requirement | Implementation | Validation |
|-------------|----------------|------------|
| **Authentication** | NextAuth.js with bcrypt password hashing | Penetration testing, code review |
| **Authorization** | tRPC middleware with role checks | Unit tests for RBAC |
| **SQL Injection Prevention** | Prisma parameterized queries | Automated SAST scanning |
| **XSS Prevention** | React auto-escaping, CSP headers | Security audit |
| **CSRF Protection** | NextAuth.js built-in tokens | Manual testing |
| **Secure Headers** | Next.js security headers config | Mozilla Observatory scan |
| **HTTPS Only** | Vercel enforces HTTPS | Configuration check |
| **Environment Secrets** | Vercel encrypted env vars | Access audit |
| **Multi-Tenant Isolation** | venueId filtering in all queries | Integration tests |

**Security Configuration:**

```typescript
// next.config.mjs
const config = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

**Source:** Architecture doc (Section: Security Architecture), PRD (Fintech compliance requirements)

---

### Reliability

| Requirement | Implementation | Target |
|-------------|----------------|--------|
| **Availability** | Vercel multi-region deployment | 99.9% uptime |
| **Error Recovery** | Sentry error tracking + alerts | < 0.1% error rate |
| **Database Backup** | PlanetScale automated daily backups | RPO: 24h, RTO: 1h |
| **Health Monitoring** | /api/health endpoints + uptime checks | 1-minute check interval |
| **Graceful Degradation** | Feature flags, fallback UI | No critical failures |

**Reliability Implementation:**
- Vercel automatic failover across edge nodes
- Database connection retry logic (max 3 attempts)
- Sentry alerts for error rate spikes (>1% in 5 minutes)
- Health check integration with status page (e.g., StatusPage.io)

**Source:** Architecture doc (Section: Reliability & Disaster Recovery)

---

### Observability (Updated)

| Signal Type | Implementation | Retention |
|-------------|----------------|-----------|
| **Error Tracking** | Sentry (Next.js + tRPC integration) | 90 days |
| **Application Logs** | Pino structured logging (JSON) | 30 days |
| **Performance Traces** | Sentry Performance (APM) | 30 days |
| **Custom Metrics** | (Future: Prometheus + Grafana) | N/A (MVP) |
| **Health Checks** | /api/health/* endpoints | Real-time |

**Logging Configuration (Pino):**

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'crowdiant-os', env: process.env.NODE_ENV },
  redact: { paths: ['req.headers.authorization'], remove: true },
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

logger.info({ userId: '123', venueId: '456' }, 'User logged in');
logger.error({ err: new Error('DB fail') }, 'Database query failed');
```

**Sentry Configuration:**

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event) {
    // Filter sensitive data (card numbers, passwords)
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.cardNumber;
    }
    return event;
  },
});
```

**Alerts Configuration:**
- Error rate > 1% for 5 minutes → Slack #engineering-alerts
- Database health check fails → PagerDuty critical
- API p95 response time > 1s → Slack #performance

**Source:** Architecture doc (Section: Observability), Story E1.6 acceptance criteria

---

## Dependencies and Integrations

### Core Dependencies

**Production Dependencies:**

```json
{
  "dependencies": {
    "next": "^15.5.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@trpc/server": "^11.0.0",
    "@trpc/client": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@trpc/next": "^11.0.0",
    "@tanstack/react-query": "^5.0.0",
    "next-auth": "^5.0.0",
    "@prisma/client": "^5.14.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "pino": "^9.3.0",
    "@sentry/nextjs": "^8.0.0"
  }
}
```

**Development Dependencies:**

```json
{
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/bcryptjs": "^2.4.6",
    "prisma": "^5.14.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "@typescript-eslint/eslint-plugin": "^7.8.0",
    "@typescript-eslint/parser": "^7.8.0",
    "prettier": "^3.2.0",
    "prettier-plugin-tailwindcss": "^0.5.14",
    "vitest": "^1.6.0",
    "@vitejs/plugin-react": "^4.2.0",
    "playwright": "^1.44.0"
  }
}
```

**Package Manager:** pnpm (faster installs, better monorepo support for future microservices)

---

### External Service Integrations

| Service | Purpose | Version/Plan | Configuration |
|---------|---------|--------------|---------------|
| **Vercel** | Hosting, CI/CD, Edge functions | Pro plan | Auto-deploy from GitHub |
| **PlanetScale** | PostgreSQL database | Scaler plan | Connection pooling via Prisma |
| **Sentry** | Error tracking, APM | Team plan | DSN in env vars |
| **GitHub** | Code repository, version control | Team plan | Branch protection rules |

**Environment Variables Required:**

```bash
# .env.example (Foundation Epic Only)

# Database
DATABASE_URL="mysql://..."

# NextAuth
NEXTAUTH_SECRET="..." # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Sentry
SENTRY_DSN="https://...@sentry.io/..."
SENTRY_ORG="crowdiant"
SENTRY_PROJECT="crowdiant-os"

# Logging
LOG_LEVEL="info" # debug, info, warn, error
NODE_ENV="development" # development, production

# Feature Flags (Future)
# ENABLE_METRICS="false"
```

**Future Integrations (Out of Scope for Epic 1):**
- Stripe Connect (Epic 3: Express Checkout)
- Redis (Epic 3: Pre-auth state management)
- Socket.io (Epic 6: KDS real-time)
- Twilio (Epic 9: SMS notifications)
- Resend (Epic 9: Email delivery)
- AWS S3 (Epic 5: Menu images)

**Source:** Architecture doc (Decision Summary table), Story E1.5 acceptance criteria

---

## Acceptance Criteria

All acceptance criteria are extracted from Epic 1 stories (E1.1-E1.6) in the epics-and-stories.md document. Each criterion is testable and atomic.

### Story E1.1: Project Initialization

1. ✅ T3 Stack command executes successfully: `npx create-t3-app@latest crowdiant-os --typescript --tailwind --trpc --prisma --nextAuth --app-router`
2. ✅ All dependencies install without errors using pnpm
3. ✅ TypeScript strict mode enabled in tsconfig.json
4. ✅ ESLint and Prettier configured with Next.js recommended rules
5. ✅ .env.example created with all required variables documented
6. ✅ README.md documents setup process with step-by-step instructions
7. ✅ Development server starts on http://localhost:3000 without errors
8. ✅ Health check endpoint responds: GET /api/health returns { status: 'ok' }

### Story E1.2: Database Architecture

1. ✅ Prisma schema defines Venue, User, StaffAssignment models with correct fields
2. ✅ All tenant-scoped models include venueId foreign key for multi-tenant isolation
3. ✅ Soft delete support implemented via deletedAt column on core models
4. ✅ Database indexes created for performance (foreign keys, unique constraints)
5. ✅ Prisma middleware configured for automatic tenant filtering
6. ✅ Audit logging structure implemented (createdAt, updatedAt on all models)
7. ✅ NextAuth models (Account, Session, VerificationToken) included in schema
8. ✅ Prisma schema compiles without errors: `pnpm prisma generate` succeeds
9. ✅ Initial migration runs successfully: `pnpm prisma migrate dev --name init`
10. ✅ Prisma Studio opens and displays all tables correctly

### Story E1.3: Authentication Framework

1. ✅ NextAuth.js configured with credentials provider for email/password login
2. ✅ Session management uses database strategy (not JWT-only)
3. ✅ tRPC middleware `enforceUserIsAuthed` checks authentication and throws UNAUTHORIZED if missing
4. ✅ tRPC middleware `enforceVenueAccess` verifies staffAssignment for venueId
5. ✅ tRPC middleware `requireRole` checks specific staff role (implementation skeleton)
6. ✅ Password hashing implemented with bcrypt (cost factor: 10)
7. ✅ JWT token configuration includes userId, email, name in claims
8. ✅ Protected route wrapper redirects unauthenticated users to /login
9. ✅ User can log in with valid credentials and receive session cookie
10. ✅ Session persists across page reloads (browser refresh)
11. ✅ Protected tRPC routes reject requests without valid session

### Story E1.4: UI Component Library

1. ✅ shadcn/ui initialized in project: `pnpm dlx shadcn-ui@latest init`
2. ✅ Core components installed: Button, Input, Card, Dialog, Toast, Label, Select
3. ✅ Tailwind theme configured with custom brand colors
4. ✅ Theme variables defined in globals.css (--primary, --secondary, etc.)
5. ✅ Dark mode support configured (optional for MVP, class-based strategy)
6. ✅ Component documentation page created (Storybook or simple /components route)
7. ✅ All core components render correctly without errors
8. ✅ Components follow accessibility best practices (ARIA labels, keyboard navigation)

### Story E1.5: Deployment Pipeline

1. ✅ Vercel project created and linked to GitHub repository
2. ✅ Environment variables configured in Vercel dashboard (DATABASE_URL, NEXTAUTH_SECRET, etc.)
3. ✅ PlanetScale database created and connection string added to Vercel
4. ✅ Automatic deployments trigger on push to main branch
5. ✅ Preview deployments created for all pull requests
6. ✅ GitHub Actions workflow added for linting and type checking on PRs
7. ✅ Prisma migrations run automatically during Vercel build (postbuild script)
8. ✅ Error tracking (Sentry) configured and operational in production
9. ✅ Production deployment accessible via Vercel URL (e.g., crowdiant-os.vercel.app)
10. ✅ Health check endpoint responds in production: GET /api/health

### Story E1.6: Observability & Monitoring

1. ✅ Sentry SDK initialized for error tracking and performance monitoring
2. ✅ Winston logger configured with JSON structured logging
3. ✅ Application metrics collection enabled (response times, error rates)
4. ✅ Health check endpoints created: /api/health, /api/health/db
5. ✅ Uptime monitoring configured (Vercel monitoring or external service)
6. ✅ Log aggregation configured (Vercel logs or DataDog)
7. ✅ Custom error boundaries implemented in React app
8. ✅ Request ID tracking added for distributed tracing (X-Request-ID header)
9. ✅ Critical alerts configured (payment failures, auth issues)
10. ✅ Performance monitoring tracks key user flows (login, dashboard load)
11. ✅ Metrics dashboard displays key indicators (response times, error rates)
12. ✅ Sentry filters sensitive data (passwords, card numbers) from error logs

---

## Traceability Mapping

| Acceptance Criteria | Spec Section | Component/API | Test Strategy |
|---------------------|--------------|---------------|---------------|
| AC 1.1.1: T3 Stack initialization | Overview, System Arch | Project scaffold | Manual verification |
| AC 1.1.7: Dev server starts | Overview, Workflows | Next.js dev server | Unit test (curl localhost:3000) |
| AC 1.1.8: Health check responds | APIs > Health Endpoints | /api/health route | Integration test (GET request) |
| AC 1.2.1: Prisma models defined | Data Models | Venue, User, StaffAssignment | Schema validation test |
| AC 1.2.2: Multi-tenant venueId | Data Models > Multi-Tenant | All tenant-scoped tables | Unit test (schema inspection) |
| AC 1.2.5: Prisma middleware | Data Models > Multi-Tenant | Prisma middleware | Integration test (query filtering) |
| AC 1.2.8: Prisma generates | Data Models | Prisma Client | CLI test (prisma generate) |
| AC 1.3.1: NextAuth credentials | APIs > Auth Router | NextAuth config | Unit test (auth flow) |
| AC 1.3.3: Auth middleware | APIs > tRPC Middleware | enforceUserIsAuthed | Unit test (unauthorized request) |
| AC 1.3.4: Venue access middleware | APIs > tRPC Middleware | enforceVenueAccess | Unit test (forbidden request) |
| AC 1.3.6: Password hashing | APIs > Auth Router | bcrypt.hash | Unit test (hash verification) |
| AC 1.3.9: Login succeeds | Workflows > Auth Flow | NextAuth signin | E2E test (Playwright) |
| AC 1.4.1: shadcn/ui initialized | UI Component Library | shadcn CLI | Manual verification |
| AC 1.4.7: Components render | UI Component Library | Button, Input, Card | Unit test (render test) |
| AC 1.5.1: Vercel project linked | Deployment Pipeline | Vercel dashboard | Manual verification |
| AC 1.5.4: Auto-deploy on push | Deployment Pipeline | Vercel GitHub integration | Manual test (push to main) |
| AC 1.5.10: Production health check | NFR > Reliability | /api/health (prod) | Integration test (curl prod URL) |
| AC 1.6.1: Sentry SDK initialized | NFR > Observability | Sentry client config | Unit test (error capture) |
| AC 1.6.4: Health endpoints | NFR > Observability | /api/health/db | Integration test (DB connectivity) |
| AC 1.6.12: Sentry filters PII | NFR > Security | Sentry beforeSend | Unit test (data masking) |

---

## Risks, Assumptions, and Questions

### Risks

| ID | Risk | Impact | Probability | Mitigation |
|----|------|--------|-------------|------------|
| R1 | **Database migration failures in production** | HIGH | MEDIUM | Implement blue-green deployment strategy; test migrations in staging; use Prisma's `prisma migrate deploy` in production |
| R2 | **Multi-tenant data leakage** | CRITICAL | LOW | Comprehensive integration tests for tenant isolation; code review for all DB queries; Prisma middleware as safety net |
| R3 | **NextAuth session management issues** | MEDIUM | MEDIUM | Use database session strategy (not JWT-only); implement session refresh logic; monitor session errors in Sentry |
| R4 | **Vercel cold start latency** | MEDIUM | MEDIUM | Optimize bundle size; use Edge Functions where possible; implement warming strategy for critical paths |
| R5 | **Dependency version conflicts** | LOW | MEDIUM | Lock dependencies with pnpm-lock.yaml; regular dependency updates; automated security scanning |
| R6 | **Team environment setup inconsistencies** | MEDIUM | LOW | Comprehensive README; .env.example with clear docs; onboarding checklist; Docker option for future |

### Assumptions

| ID | Assumption | Validation Strategy |
|----|------------|---------------------|
| A1 | **PlanetScale provides sufficient database performance for MVP** | Monitor query performance in Sentry APM; benchmark with realistic load (100 concurrent users) |
| A2 | **Vercel Pro plan sufficient for MVP traffic** | Monitor bandwidth and function execution limits; plan upgrade path to Enterprise |
| A3 | **Team has TypeScript experience** | Knowledge sharing sessions; pair programming for complex types |
| A4 | **T3 Stack conventions align with team preferences** | Retrospective after Epic 1; document any deviations from T3 defaults |
| A5 | **No major breaking changes in Next.js 14 during development** | Stay on stable channel; avoid canary/beta releases; monitor Next.js release notes |

### Open Questions

| ID | Question | Owner | Status | Resolution |
|----|----------|-------|--------|------------|
| Q1 | **Should we use PlanetScale or Supabase for MVP?** | DevOps | OPEN | **Decision:** PlanetScale for serverless scaling and PlanetScale Boost (query caching) |
| Q2 | **Do we need Redis in Epic 1 or wait until Epic 3?** | Architect | OPEN | **Decision:** Wait until Epic 3 (pre-auth state management requires it) |
| Q3 | **Should we implement database connection pooling from day one?** | Backend | OPEN | **Decision:** Yes, use PgBouncer via PlanetScale built-in pooling |
| Q4 | **How many preview environments should Vercel support?** | DevOps | OPEN | **Decision:** Unlimited (Vercel Pro includes unlimited previews) |
| Q5 | **Should observability include custom metrics (Prometheus) in MVP?** | DevOps | OPEN | **Decision:** No, defer to post-MVP; Sentry metrics sufficient for Epic 1-8 |

---

## Test Strategy

### Test Levels

| Level | Framework | Scope | Coverage Target |
|-------|-----------|-------|-----------------|
| **Unit Tests** | Vitest | Individual functions, tRPC resolvers, utilities | 80%+ code coverage |
| **Integration Tests** | Vitest + Prisma | Database queries, auth flows, middleware | 100% critical paths |
| **E2E Tests** | Playwright | User journeys (login, dashboard navigation) | 100% happy paths |
| **Manual Testing** | QA Checklist | Deployment verification, UI polish | All acceptance criteria |

### Test Coverage by Story

**Story E1.1: Project Initialization**
- Manual: Verify T3 Stack installation
- Manual: Verify dev server starts
- Integration: Health check endpoint responds

**Story E1.2: Database Architecture**
- Unit: Prisma schema validation (zod schema from Prisma types)
- Integration: Database migration applies successfully
- Integration: Prisma Studio opens and displays tables
- Unit: Multi-tenant middleware filters queries by venueId

**Story E1.3: Authentication Framework**
- Unit: bcrypt password hashing and verification
- Integration: User registration creates user in database
- Integration: Login with valid credentials succeeds
- Integration: Login with invalid credentials fails
- Integration: Protected tRPC route rejects unauthenticated requests
- E2E: User can log in and access dashboard

**Story E1.4: UI Component Library**
- Unit: shadcn/ui components render without errors
- Visual Regression: Component snapshots match expected design
- Accessibility: ARIA labels and keyboard navigation work

**Story E1.5: Deployment Pipeline**
- Manual: Vercel project deployed successfully
- Manual: Environment variables configured
- Manual: Preview deployment created for PR
- Integration: Production health check responds

**Story E1.6: Observability & Monitoring**
- Unit: Winston logger formats logs correctly (JSON)
- Unit: Sentry filters sensitive data from errors
- Integration: Health check endpoints respond correctly
- Integration: Sentry captures test error

### Edge Cases and Error Scenarios

**Authentication:**
- User tries to log in with non-existent email → Error: "Invalid credentials"
- User tries to log in with correct email but wrong password → Error: "Invalid credentials"
- User session expires → Redirect to login
- User tries to access protected route without session → Redirect to login

**Multi-Tenancy:**
- User tries to access venueId they don't have access to → Error: "FORBIDDEN"
- User with OWNER role at Venue A tries to access Venue B → Error: "FORBIDDEN"
- Query without venueId in tenant-scoped table → Error: "venueId required"

**Database:**
- Database connection fails during startup → Application logs error and retries 3 times
- Migration fails in production → Rollback deployment, alert DevOps
- Unique constraint violation (duplicate email) → Error: "Email already exists"

**Deployment:**
- Vercel build fails (TypeScript error) → PR blocked, GitHub Actions fails
- Environment variable missing in production → Application fails to start, logs clear error
- Database migration not applied before deployment → Health check fails, rollback

### Test Execution

**Pre-Commit:**
- ESLint linting (all files)
- Prettier formatting (all files)
- TypeScript type checking (all files)

**Pull Request:**
- GitHub Actions: Lint, type check, unit tests
- GitHub Actions: Build succeeds
- Manual: Code review

**Pre-Merge:**
- All PR checks pass
- Code review approved
- E2E tests pass (Playwright on Vercel preview deployment)

**Post-Deploy:**
- Health checks pass in production
- Sentry monitoring active
- Smoke test: User can log in

---

## Appendix

### Story Sequence and Dependencies

```
Epic 1: Foundation & Platform Setup
│
├─► Story E1.1: Project Initialization (PREREQUISITE for all)
│   └─► Outputs: Initialized T3 project, dependencies installed
│
├─► Story E1.2: Database Architecture (DEPENDS ON E1.1)
│   └─► Outputs: Prisma schema, migrations, DB connection
│
├─► Story E1.3: Authentication Framework (DEPENDS ON E1.2)
│   └─► Outputs: NextAuth config, tRPC middleware, login flow
│
├─► Story E1.4: UI Component Library (DEPENDS ON E1.1)
│   └─► Outputs: shadcn/ui setup, core components
│
├─► Story E1.5: Deployment Pipeline (DEPENDS ON E1.1, E1.2)
│   └─► Outputs: Vercel deployment, CI/CD, production database
│
└─► Story E1.6: Observability (DEPENDS ON E1.5)
    └─► Outputs: Sentry integration, logging, health checks
```

**Recommended Implementation Order:**
1. E1.1 (Project Init) → E1.2 (Database) → E1.3 (Auth) → E1.4 (UI) → E1.5 (Deploy) → E1.6 (Observability)
2. E1.4 (UI) can be parallelized with E1.2-E1.3 (different team members)

---

### Environment Variables Reference (Revised)

```bash
# Epic 1 Environment Variables
# Copy this to .env.local for local development

# ============================================================================
# DATABASE (Required)
# ============================================================================
DATABASE_URL="prisma+postgres://accelerate-token@accelerate-host?connection_string=ENCODED_POSTGRES_URL"
DIRECT_URL="postgresql://user:password@host:5432/db" # Optional direct for migrations/scripts

# ============================================================================
# NEXTAUTH (Required)
# ============================================================================
NEXTAUTH_SECRET="your-secret-here-use-openssl-rand-base64-32"
# Generate with: openssl rand -base64 32
# Must be 32+ characters, keep secret!

NEXTAUTH_URL="http://localhost:3000"
# Development: http://localhost:3000
# Production: https://crowdiant-os.vercel.app

# ============================================================================
# SENTRY (Required for Production, Optional for Dev)
# ============================================================================
SENTRY_DSN="https://public@sentry.io/project-id"
NEXT_PUBLIC_SENTRY_DSN="https://public@sentry.io/project-id"
SENTRY_AUTH_TOKEN="" # Build-time only (source maps upload)

# ============================================================================
# LOGGING (Optional)
# ============================================================================
LOG_LEVEL="info"
# Options: debug, info, warn, error
# Development: debug
# Production: info

# ============================================================================
# ENVIRONMENT (Auto-detected)
# ============================================================================
NODE_ENV="development"
# Next.js sets this automatically
# Options: development, production, test

# ============================================================================
# FUTURE INTEGRATIONS (Not needed for Epic 1)
# ============================================================================
# STRIPE_SECRET_KEY="sk_test_..." (Epic 3)
# REDIS_URL="redis://..." (Epic 3)
# TWILIO_ACCOUNT_SID="..." (Epic 9)
# TWILIO_AUTH_TOKEN="..." (Epic 9)
# RESEND_API_KEY="..." (Epic 9)
# AWS_ACCESS_KEY_ID="..." (Epic 5)
# AWS_SECRET_ACCESS_KEY="..." (Epic 5)
```

---

### Key Technical Files

**Configuration Files:**
- `next.config.mjs` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS theme
- `tsconfig.json` - TypeScript compiler options
- `prisma/schema.prisma` - Database schema
- `.env.example` - Environment variable template
- `.eslintrc.cjs` - ESLint rules
- `.prettierrc` - Code formatting rules

**Core Application Files:**
- `src/server/api/trpc.ts` - tRPC context and middleware
- `src/server/api/root.ts` - tRPC router root
- `src/server/auth.ts` - NextAuth configuration
- `src/server/db.ts` - Prisma client singleton
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth API route
- `src/app/api/trpc/[trpc]/route.ts` - tRPC API route
- `src/app/api/health/route.ts` - Health check endpoint

**Monitoring Files:**
- `sentry.client.config.ts` - Sentry client setup
- `sentry.server.config.ts` - Sentry server setup
- `lib/monitoring/logger.ts` - Winston logger configuration

---

## Completion Checklist

- [ ] All 6 stories completed (E1.1 - E1.6)
- [ ] All 64 acceptance criteria validated
- [ ] Unit test coverage ≥ 80%
- [ ] Integration tests pass for critical paths
- [ ] E2E tests pass (login, dashboard)
- [ ] Manual QA checklist complete
- [ ] Documentation updated (README.md)
- [ ] Deployment successful to production
- [ ] Health checks pass in production
- [ ] Sentry monitoring active
- [ ] Team can replicate dev environment
- [ ] Performance targets met (page load < 2s)
- [ ] Security audit passed (OWASP top 10)
- [ ] Retrospective completed

---

**Epic 1 Status:** Ready for Implementation  
**Next Epic:** Epic 2: User & Venue Management (Sprint 1)  
**Generated:** 2025-11-26  
**Reviewed By:** Bradley (Product Owner)

---

_This Technical Specification is a living document. Update as implementation progresses and new learnings emerge._
