# Story 1.3: Authentication & Authorization Framework

**Status:** drafted  
**Story ID:** E1.3  
**Epic:** Epic 1 - Foundation & Platform Setup  
**Sprint:** Sprint 0  
**Type:** Technical Task  
**Priority:** P0 - Critical  
**Effort:** 5 points  

---

## Story

**As a** developer,  
**I want to** configure NextAuth.js with multi-tenant session management and tRPC authorization middleware,  
**so that** users can securely authenticate and access only their authorized venues and resources.

---

## Context & Requirements

### From Epic 1 Technical Specification

This story implements the authentication and authorization framework for Crowdiant's multi-tenant platform. It builds on Story 1.2's database schema to provide secure user authentication, session management, and role-based access control (RBAC) through tRPC middleware.

**Key Requirements:**
- **Authentication:** NextAuth.js with credentials provider (email/password)
- **Session Management:** Database-backed sessions (not JWT-only) for security
- **Multi-tenant Authorization:** tRPC middleware to verify venue access via StaffAssignment
- **Role-Based Access Control:** Middleware to enforce staff roles (OWNER, MANAGER, SERVER, etc.)
- **Password Security:** bcrypt hashing with cost factor 10
- **Protected Routes:** Server and client-side route protection

**Security Principles:**
- Never trust client-side authentication checks
- All tRPC procedures must use appropriate middleware (publicProcedure, protectedProcedure, venueProtectedProcedure)
- Sessions stored in database for immediate revocation capability
- Passwords never logged or exposed in error messages

**Sources:**
- [Epic 1 Tech Spec: APIs and Interfaces > Auth Router](docs/sprint-artifacts/epic-1-context.md#apis-and-interfaces)
- [Epic 1 Tech Spec: Workflows > Authentication Flow](docs/sprint-artifacts/epic-1-context.md#workflows-and-sequencing)
- [Architecture: Security Architecture](docs/architecture.md#security-architecture)
- [Technical Spec: API Specifications](docs/technical-specs/04-api-specifications-technical-spec.md)

### Learnings from Previous Story

**From Story 1-2-database-architecture-multi-tenant-schema (Status: review)**

- **Schema Created**: Venue, User, StaffAssignment models now available in Prisma schema
- **Multi-tenant Pattern**: All models include proper relations - use these existing models for authentication
- **Database Connected**: PostgreSQL running in Docker container `crowdiant-postgres` on port 5432
- **Migration Applied**: `20251125230913_init_multi_tenant_schema` successfully created all tables
- **Prisma Client Generated**: TypeScript types available for all models including:
  - `User` with email, passwordHash, staffAt relation
  - `StaffAssignment` with userId, venueId, role
  - `Session` and `Account` models for NextAuth
- **Health Check Pattern**: `/api/health/db` endpoint established - follow same pattern for auth endpoints
- **Testing Setup**: All code quality checks (ESLint, TypeScript, Prettier) passing - maintain this standard

**Interfaces to Reuse:**
- Use `src/server/db.ts` for Prisma client access
- Prisma models: `User`, `Session`, `Account`, `VerificationToken`, `StaffAssignment`, `Venue`
- Health check pattern from `src/app/api/health/db/route.ts`

**Architectural Decisions:**
- Using cuid() for primary keys (shorter, URL-safe)
- Snake_case database naming via `@@map` directives
- Soft deletes via `deletedAt` timestamp

[Source: docs/sprint-artifacts/1-2-database-architecture-multi-tenant-schema.md#Dev-Agent-Record]

---

## Acceptance Criteria

- [ ] **AC1:** NextAuth.js configured with credentials provider for email/password login in `src/server/auth.ts`
- [ ] **AC2:** Session management uses database strategy (Session model from Story 1.2), not JWT-only
- [ ] **AC3:** tRPC middleware `enforceUserIsAuthed` checks authentication and throws UNAUTHORIZED if missing session
- [ ] **AC4:** tRPC middleware `enforceVenueAccess` verifies user has StaffAssignment for requested venueId, throws FORBIDDEN if not
- [ ] **AC5:** tRPC middleware `enforceRole` checks specific staff role (implementation skeleton for future use)
- [ ] **AC6:** Password hashing implemented with bcrypt (cost factor: 10) in registration/login
- [ ] **AC7:** JWT token configuration includes userId, email, name in session claims
- [ ] **AC8:** Protected route wrapper redirects unauthenticated users to /login page
- [ ] **AC9:** User can successfully log in with valid credentials and receive session cookie
- [ ] **AC10:** Session persists across page reloads (browser refresh maintains authentication)
- [ ] **AC11:** Protected tRPC routes reject requests without valid session (401 UNAUTHORIZED)
- [ ] **AC12:** Venue-protected routes reject requests without venue access (403 FORBIDDEN)

---

## Tasks (for Dev Agent)

### Task 1: Configure NextAuth.js Core
- [ ] 1.1 Update `src/server/auth.ts` with NextAuth configuration
- [ ] 1.2 Configure credentials provider with email/password
- [ ] 1.3 Implement authorize() function to verify credentials against User model
- [ ] 1.4 Add bcrypt password comparison logic
- [ ] 1.5 Configure database adapter to use Prisma (Session, Account models)
- [ ] 1.6 Set session strategy to "database" (not "jwt")
- [ ] 1.7 Configure callbacks: jwt() and session() to include user data
- [ ] 1.8 Add NEXTAUTH_SECRET to .env.example
- [ ] 1.9 **Maps to:** AC1, AC2, AC6, AC7

### Task 2: Create Authentication Router
- [ ] 2.1 Create `src/server/api/routers/auth.ts` file
- [ ] 2.2 Implement `register` mutation (publicProcedure)
  - [ ] 2.2.1 Validate input: email (valid format), password (min 8 chars), name (optional)
  - [ ] 2.2.2 Check email uniqueness (throw error if exists)
  - [ ] 2.2.3 Hash password with bcrypt (cost: 10)
  - [ ] 2.2.4 Create User record in database
  - [ ] 2.2.5 Return success response (userId)
- [ ] 2.3 Implement `requestPasswordReset` mutation skeleton (publicProcedure)
- [ ] 2.4 Add auth router to `src/server/api/root.ts`
- [ ] 2.5 **Maps to:** AC6, AC9

### Task 3: Create tRPC Authentication Middleware
- [ ] 3.1 Open `src/server/api/trpc.ts` file
- [ ] 3.2 Create `enforceUserIsAuthed` middleware
  - [ ] 3.2.1 Check if `ctx.session?.user` exists
  - [ ] 3.2.2 Throw TRPCError with code "UNAUTHORIZED" if missing
  - [ ] 3.2.3 Return enriched context with guaranteed user object
- [ ] 3.3 Export `protectedProcedure` = `t.procedure.use(enforceUserIsAuthed)`
- [ ] 3.4 Test middleware by creating sample protected query
- [ ] 3.5 **Maps to:** AC3, AC11

### Task 4: Create Venue Access Middleware
- [ ] 4.1 Create `enforceVenueAccess` middleware in `src/server/api/trpc.ts`
- [ ] 4.2 Extract venueId from input (procedure must have venueId in input)
- [ ] 4.3 Query StaffAssignment:
  - [ ] 4.3.1 WHERE userId = ctx.session.user.id
  - [ ] 4.3.2 AND venueId = input.venueId
  - [ ] 4.3.3 AND deletedAt = null
- [ ] 4.4 Throw TRPCError with code "FORBIDDEN" if no assignment found
- [ ] 4.5 Return enriched context (optionally include venueId)
- [ ] 4.6 Export `venueProtectedProcedure` combining auth + venue access
- [ ] 4.7 **Maps to:** AC4, AC12

### Task 5: Create Role-Based Authorization Middleware
- [ ] 5.1 Create `enforceRole` middleware factory in `src/server/api/trpc.ts`
- [ ] 5.2 Accept role parameter (or array of roles)
- [ ] 5.3 Query StaffAssignment with role check:
  - [ ] 5.3.1 WHERE userId = ctx.session.user.id
  - [ ] 5.3.2 AND venueId = input.venueId
  - [ ] 5.3.3 AND role IN [allowedRoles]
  - [ ] 5.3.4 AND deletedAt = null
- [ ] 5.4 Throw TRPCError with code "FORBIDDEN" if role doesn't match
- [ ] 5.5 Add comment: "Skeleton implementation - will be used in Epic 2+"
- [ ] 5.6 **Maps to:** AC5

### Task 6: Create Basic Venue Router
- [ ] 6.1 Create `src/server/api/routers/venue.ts` file
- [ ] 6.2 Implement `listAccessible` query (protectedProcedure)
  - [ ] 6.2.1 Query StaffAssignment where userId = current user
  - [ ] 6.2.2 Include venue relation
  - [ ] 6.2.3 Filter out soft-deleted assignments (deletedAt = null)
  - [ ] 6.2.4 Return array of accessible venues
- [ ] 6.3 Implement `getById` query (venueProtectedProcedure)
  - [ ] 6.3.1 Input: venueId (string)
  - [ ] 6.3.2 Query Venue by id (middleware already verified access)
  - [ ] 6.3.3 Return venue or throw "not found" error
- [ ] 6.4 Add venue router to `src/server/api/root.ts`
- [ ] 6.5 **Maps to:** AC4, AC12

### Task 7: Create Protected Route Wrapper
- [ ] 7.1 Create `src/components/auth/ProtectedRoute.tsx` component
- [ ] 7.2 Use `useSession()` hook from next-auth/react
- [ ] 7.3 If status === "loading", show loading spinner
- [ ] 7.4 If status === "unauthenticated", redirect to /login (useRouter)
- [ ] 7.5 If status === "authenticated", render children
- [ ] 7.6 Add TypeScript types for component props
- [ ] 7.7 **Maps to:** AC8

### Task 8: Create Login Page
- [ ] 8.1 Create `src/app/login/page.tsx` route
- [ ] 8.2 Create login form component with email and password fields
- [ ] 8.3 Use NextAuth `signIn()` function with credentials provider
- [ ] 8.4 Handle successful login (redirect to dashboard)
- [ ] 8.5 Display error message on failed login
- [ ] 8.6 Add "Sign Up" link to registration page (future story)
- [ ] 8.7 Style with Tailwind + shadcn/ui components (Button, Input, Label, Card)
- [ ] 8.8 **Maps to:** AC9, AC10

### Task 9: Update tRPC Context
- [ ] 9.1 Update `createTRPCContext` in `src/server/api/trpc.ts`
- [ ] 9.2 Call `getServerAuthSession()` to load session from database
- [ ] 9.3 Include session in returned context object
- [ ] 9.4 Ensure context is properly typed (TRPCContext interface)
- [ ] 9.5 **Maps to:** AC2, AC3

### Task 10: Add Environment Variables
- [ ] 10.1 Add to `.env.example`:
  - [ ] NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
  - [ ] NEXTAUTH_URL="http://localhost:3000"
- [ ] 10.2 Generate actual NEXTAUTH_SECRET for `.env` (do not commit)
- [ ] 10.3 Document generation command in README.md: `openssl rand -base64 32`
- [ ] 10.4 Update README with NextAuth setup instructions
- [ ] 10.5 **Maps to:** AC1

### Task 11: Integration Testing
- [ ] 11.1 Test registration flow:
  - [ ] 11.1.1 Create test user via `auth.register` mutation
  - [ ] 11.1.2 Verify user created in database with hashed password
  - [ ] 11.1.3 Verify password is NOT stored in plain text
- [ ] 11.2 Test login flow:
  - [ ] 11.2.1 Call `signIn()` with valid credentials
  - [ ] 11.2.2 Verify session created in database
  - [ ] 11.2.3 Verify session cookie set in browser
  - [ ] 11.2.4 Verify login fails with invalid password
- [ ] 11.3 Test protected tRPC route:
  - [ ] 11.3.1 Call protectedProcedure without session → expect 401 UNAUTHORIZED
  - [ ] 11.3.2 Call protectedProcedure with session → expect success
- [ ] 11.4 Test venue access middleware:
  - [ ] 11.4.1 Create test venue and StaffAssignment
  - [ ] 11.4.2 Call venueProtectedProcedure with valid venueId → expect success
  - [ ] 11.4.3 Call with unauthorized venueId → expect 403 FORBIDDEN
- [ ] 11.5 Test session persistence:
  - [ ] 11.5.1 Log in and verify session
  - [ ] 11.5.2 Refresh page (simulate browser reload)
  - [ ] 11.5.3 Verify session still valid and user still authenticated
- [ ] 11.6 **Maps to:** AC9, AC10, AC11, AC12

### Task 12: Code Quality & Documentation
- [ ] 12.1 Run `npx pnpm run check` (ESLint + TypeScript)
- [ ] 12.2 Run `npx pnpm tsc --noEmit` to verify type safety
- [ ] 12.3 Run `npx pnpm run format:write` (Prettier)
- [ ] 12.4 Add TSDoc comments to all middleware functions
- [ ] 12.5 Update README.md with authentication setup instructions
- [ ] 12.6 Document middleware usage patterns for future developers
- [ ] 12.7 Add security notes (password handling, session management)
- [ ] 12.8 **Maps to:** All ACs (quality assurance)

### Task 13: Commit and Update Status
- [ ] 13.1 Verify all acceptance criteria met
- [ ] 13.2 Stage changes: `git add src/server/auth.ts src/server/api/trpc.ts src/server/api/routers/auth.ts src/server/api/routers/venue.ts src/components/auth/ src/app/login/`
- [ ] 13.3 Commit: `git commit -m "feat(story-1.3): Implement NextAuth authentication with tRPC authorization middleware"`
- [ ] 13.4 Update sprint-status.yaml: change story status from "drafted" to "review"
- [ ] 13.5 Update this story file with completion notes in Dev Agent Record
- [ ] 13.6 Document any deviations from plan or technical debt

---

## Dev Notes

### Architecture Patterns

**NextAuth.js Integration Pattern:**
```typescript
// src/server/auth.ts
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "database" }, // NOT jwt
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Verify credentials, return user or null
      },
    }),
  ],
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
};
```

**tRPC Middleware Pattern:**
```typescript
// src/server/api/trpc.ts
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

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
```

**Multi-Tenant Authorization Pattern:**
```typescript
// Verify venue access via StaffAssignment
const enforceVenueAccess = t.middleware(async ({ ctx, input, next }) => {
  const venueId = (input as any).venueId;
  const hasAccess = await ctx.db.staffAssignment.findFirst({
    where: {
      userId: ctx.session.user.id,
      venueId: venueId,
      deletedAt: null,
    },
  });
  if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});
```

### Source Tree Components

**Files to Create:**
- `src/server/api/routers/auth.ts` (NEW) - Registration and auth utilities
- `src/server/api/routers/venue.ts` (NEW) - Venue access queries
- `src/components/auth/ProtectedRoute.tsx` (NEW) - Client route protection
- `src/app/login/page.tsx` (NEW) - Login UI

**Files to Modify:**
- `src/server/auth.ts` (MODIFY) - Add NextAuth configuration
- `src/server/api/trpc.ts` (MODIFY) - Add authentication middleware
- `src/server/api/root.ts` (MODIFY) - Add auth and venue routers
- `.env.example` (MODIFY) - Add NEXTAUTH_SECRET and NEXTAUTH_URL
- `README.md` (MODIFY) - Add authentication setup instructions

**Files from Story 1.2 to Reuse:**
- `src/server/db.ts` - Prisma client singleton
- `prisma/schema.prisma` - User, Session, Account, StaffAssignment models

### Testing Standards

**Unit Tests (Vitest):**
- Test bcrypt password hashing and verification
- Test middleware throws correct errors (UNAUTHORIZED, FORBIDDEN)
- Test session callback includes user id

**Integration Tests (Vitest + Prisma):**
- Test full registration flow (creates user with hashed password)
- Test full login flow (creates session in database)
- Test venue access checks with real StaffAssignment records
- Test protected routes reject unauthenticated requests

**E2E Tests (Playwright):**
- User can register and log in via UI
- Protected page redirects to login when unauthenticated
- User remains logged in after page refresh

### Security Considerations

**Password Security:**
- Use bcrypt with cost factor 10 (balance security and performance)
- Never log passwords or include in error messages
- Never return passwordHash in API responses

**Session Security:**
- Database sessions allow immediate revocation
- HttpOnly cookies prevent XSS attacks
- Secure flag ensures HTTPS-only in production
- SameSite=lax prevents CSRF

**Input Validation:**
- Validate email format (zod email() validator)
- Enforce minimum password length (8 characters)
- Sanitize user inputs to prevent injection

### References

- [Epic 1 Tech Spec: Authentication Framework](docs/sprint-artifacts/epic-1-context.md#story-e13-authentication--authorization-framework) - Complete acceptance criteria and implementation details
- [Epic 1 Tech Spec: APIs > Auth Router](docs/sprint-artifacts/epic-1-context.md#auth-router-epic-1) - Code examples for registration and login
- [Epic 1 Tech Spec: APIs > tRPC Middleware](docs/sprint-artifacts/epic-1-context.md#trpc-middleware-authentication--authorization) - Middleware implementation patterns
- [Epic 1 Tech Spec: Workflows > Authentication Flow](docs/sprint-artifacts/epic-1-context.md#story-e13-authentication-flow) - Flow diagrams for login and session management
- [Architecture: Security Architecture](docs/architecture.md#security-architecture) - Security requirements and best practices
- [Story 1.2: Database Schema](docs/sprint-artifacts/1-2-database-architecture-multi-tenant-schema.md) - Prisma models (User, Session, Account, StaffAssignment)
- [Technical Spec: API Specifications](docs/technical-specs/04-api-specifications-technical-spec.md) - API design patterns

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by story-context workflow -->

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent during implementation_

### Completion Notes List

_To be filled by dev agent upon completion_

### File List

```
NEW:
- src/server/api/routers/auth.ts
- src/server/api/routers/venue.ts
- src/components/auth/ProtectedRoute.tsx
- src/app/login/page.tsx

MODIFIED:
- src/server/auth.ts
- src/server/api/trpc.ts
- src/server/api/root.ts
- .env.example
- README.md
```

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-26 | Bob (SM Agent) | Story created from Epic 1 context and Story 1.2 learnings |
