# Crowdiant Restaurant OS - Epics & User Stories

**Author:** Bradley
**Date:** 2025-11-25
**Version:** 1.0

---

## Overview

This document breaks down the 98 functional requirements from the PRD into 14 implementable epics with detailed user stories. Each epic represents a major feature area that can be developed incrementally.

**Total FRs:** 98
**Total Epics:** 14
**Estimated Epic Breakdown:**
- Foundation & Infrastructure: 2 epics (15 stories)
- Core Features (MVP): 6 epics (48 stories)
- Growth Features: 4 epics (24 stories)
- Enterprise Features: 2 epics (11 stories)

---

## Epic Prioritization

| Priority | Epic ID | Epic Name | FR Count | Sprint Target | Business Value |
|----------|---------|-----------|----------|---------------|----------------|
| P0 - Critical | E1 | Foundation & Platform Setup | 5 | Sprint 0 | Required for all features |
| P0 - Critical | E2 | User & Venue Management | 9 | Sprint 1 | Core multi-tenancy |
| P0 - Critical | E3 | Express Checkout System | 13 | Sprint 2-3 | Primary differentiator |
| P1 - High | E4 | Point of Sale Core | 12 | Sprint 4-5 | Revenue generation |
| P1 - High | E5 | Menu Management | 7 | Sprint 6 | Required for POS |
| P1 - High | E6 | Kitchen Display System | 8 | Sprint 7 | Operations efficiency |
| P2 - Medium | E7 | Trust & Reputation Engine | 7 | Sprint 8 | Innovation feature |
| P2 - Medium | E8 | Table & Floor Management | 6 | Sprint 9 | Operational control |
| P2 - Medium | E9 | Customer Communication | 6 | Sprint 10 | Customer experience |
| P3 - Low | E10 | Analytics & Reporting | 7 | Sprint 11 | Business intelligence |
| P3 - Low | E11 | Reservation System | 6 | Sprint 12 | Growth feature |
| P3 - Low | E12 | Loyalty Program | 5 | Sprint 13 | Customer retention |
| P3 - Low | E13 | Inventory Management | 4 | Sprint 14 | Advanced operations |
| P3 - Low | E14 | Integrations & Admin | 4 | Sprint 15 | Platform maturity |

---

## EPIC 1: Foundation & Platform Setup

**Epic ID:** E1
**Priority:** P0 - Critical
**Sprint:** Sprint 0
**Estimated Effort:** 2 weeks
**FR Count:** 5 (Infrastructure setup)

### Epic Description
Establish the foundational architecture and development environment for the Crowdiant Restaurant OS platform. This includes project scaffolding, core infrastructure setup, database architecture, and essential shared utilities that all other features will depend on.

### Success Criteria
- T3 stack fully configured and operational
- Database schema structure defined with multi-tenant support
- Authentication framework functional
- Development environment reproducible
- CI/CD pipeline operational

### Technical Dependencies
- Node.js 20.x LTS
- PostgreSQL 16
- Vercel deployment account
- Stripe Connect account (test mode)

---

### Story E1.1: Project Initialization & T3 Stack Setup

**Story ID:** E1.1
**Type:** Technical Task
**Priority:** P0
**Effort:** 3 points
**Sprint:** Sprint 0

**As a** developer
**I want to** initialize the project with the T3 stack
**So that** we have a solid TypeScript foundation with modern tooling

**Acceptance Criteria:**
- [ ] Run `npx create-t3-app@latest crowdiant-os --typescript --tailwind --trpc --prisma --nextAuth --app-router`
- [ ] Verify all dependencies install successfully
- [ ] Configure TypeScript strict mode
- [ ] Set up ESLint and Prettier
- [ ] Create `.env.example` with all required variables
- [ ] Document setup process in README.md
- [ ] Verify dev server starts on `http://localhost:3000`

**Technical Notes:**
- Use pnpm as package manager
- Enable App Router (not Pages Router)
- Configure absolute imports with `@/` prefix

**Definition of Done:**
- Project runs locally without errors
- All team members can replicate setup
- Basic health check endpoint responds

---

### Story E1.2: Database Architecture & Multi-Tenant Schema

**Story ID:** E1.2
**Type:** Technical Task
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 0

**As a** platform architect
**I want to** establish the core database schema with multi-tenant isolation
**So that** all features have a solid data foundation

**Acceptance Criteria:**
- [ ] Define base Prisma schema with core models (Venue, User, StaffAssignment)
- [ ] Implement multi-tenant pattern (venueId on all tenant-scoped tables)
- [ ] Add soft delete support (deletedAt column)
- [ ] Create database indexes for performance
- [ ] Set up Prisma middleware for tenant filtering
- [ ] Implement audit logging structure
- [ ] Add timestamp fields (createdAt, updatedAt) to all models

**Technical Notes:**
- Reference Architecture doc section: "Data Architecture > Core Domain Models"
- Use snake_case for database columns
- Use cuid() for primary keys
- Add database constraints for referential integrity

**Prisma Models to Define:**
```prisma
model Venue {
  id, name, slug, timezone, currency
  stripeAccountId, stripeOnboarded
  preAuthAmountCents, walkAwayGraceMinutes
  Relations: staff, menus, tables, tabs
}

model User {
  id, email, name, phone, role
  Relations: trustScores, tabs, staffAt
}

model StaffAssignment {
  id, userId, venueId, role
  Relations: user, venue
}
```

**Definition of Done:**
- Prisma schema compiles without errors
- Database migrations run successfully
- Prisma Studio can view all tables
- Multi-tenant middleware tested

---

### Story E1.3: Authentication & Authorization Framework

**Story ID:** E1.3
**Type:** Technical Task
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 0

**As a** developer
**I want to** configure NextAuth with multi-tenant support
**So that** users can securely authenticate across multiple venues

**Acceptance Criteria:**
- [ ] Configure NextAuth.js with credentials provider
- [ ] Implement session management with Redis (or database)
- [ ] Create tRPC middleware for authentication check
- [ ] Create tRPC middleware for venue access check
- [ ] Create tRPC middleware for role-based authorization
- [ ] Implement password hashing (bcrypt)
- [ ] Add JWT token configuration
- [ ] Create protected route wrapper

**Technical Notes:**
- Reference Architecture doc: "Security Architecture > Authentication Flow"
- Store sessions in Redis for scalability
- Implement these middleware:
  - `isAuthed` - checks if user is logged in
  - `hasVenueAccess` - checks venue access
  - `requireRole` - checks specific role

**Definition of Done:**
- User can log in and receive session
- Protected routes redirect unauthenticated users
- Role-based access control works
- Session persists across page reloads

---

### Story E1.4: Shared UI Component Library Setup

**Story ID:** E1.4
**Type:** Technical Task
**Priority:** P0
**Effort:** 3 points
**Sprint:** Sprint 0

**As a** developer
**I want to** set up shadcn/ui component library
**So that** we have consistent, accessible UI components

**Acceptance Criteria:**
- [ ] Initialize shadcn/ui in project
- [ ] Install core components (Button, Input, Card, Dialog, Toast)
- [ ] Configure Tailwind theme (colors, fonts, spacing)
- [ ] Create custom theme variables for brand
- [ ] Set up dark mode support (optional for MVP)
- [ ] Create component documentation page
- [ ] Add Storybook or component playground (optional)

**Components to Install:**
- Button, Input, Label, Select
- Card, Dialog, Sheet
- Toast, Alert
- Table, Badge
- Form components

**Technical Notes:**
- Use Tailwind CSS utilities for custom styles
- Follow shadcn/ui installation guide
- Keep components in `src/components/ui/`

**Definition of Done:**
- All core components render correctly
- Theme variables work across components
- Components are documented
- Sample page demonstrates components

---

### Story E1.5: Development & Deployment Pipeline

**Story ID:** E1.5
**Type:** Technical Task
**Priority:** P0
**Effort:** 3 points
**Sprint:** Sprint 0

**As a** developer
**I want to** establish CI/CD pipeline
**So that** we can deploy reliably and frequently

**Acceptance Criteria:**
- [ ] Set up Vercel project and link GitHub repo
- [ ] Configure environment variables in Vercel
- [ ] Set up database (PlanetScale or Supabase)
- [ ] Configure automatic deployments on push to main
- [ ] Set up preview deployments for PRs
- [ ] Add GitHub Actions for linting and type checking
- [ ] Configure Prisma migrations for production
- [ ] Set up error tracking (Sentry or similar)

**Environment Variables to Configure:**
- DATABASE_URL
- NEXTAUTH_URL, NEXTAUTH_SECRET
- STRIPE_SECRET_KEY (test mode)
- Redis connection details

**Technical Notes:**
- Use Vercel CLI for local testing
- Keep production and staging environments separate
- Document deployment process

**Definition of Done:**
- Push to main auto-deploys to production
- PRs create preview deployments
- Environment variables properly configured
- Monitoring/error tracking active

---

## EPIC 2: User & Venue Management

**Epic ID:** E2
**Priority:** P0 - Critical
**Sprint:** Sprint 1
**Estimated Effort:** 2 weeks
**FR Count:** 9 (FR1-FR9)

### Epic Description
Implement core user management and venue administration features, including venue onboarding, staff management, role-based access control, and customer account creation. This epic establishes the multi-tenant foundation for the platform.

### Success Criteria
- Venue owners can create and configure venues
- Staff can be invited and assigned roles
- Users can authenticate and access appropriate features
- Multi-venue access works correctly
- Customer accounts can be created optionally

### Related FRs
FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9

---

### Story E2.1: Venue Registration & Onboarding

**Story ID:** E2.1
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 1
**FR:** FR1

**As a** restaurant owner
**I want to** create and configure my venue account
**So that** I can start using the platform

**Acceptance Criteria:**
- [ ] Create venue registration page (`/register/venue`)
- [ ] Form collects: venue name, address, timezone, currency
- [ ] Generate unique slug from venue name (URL-friendly)
- [ ] Validate venue name uniqueness
- [ ] Create initial owner user during registration
- [ ] Assign owner role to creator automatically
- [ ] Redirect to venue dashboard after creation
- [ ] Display success confirmation

**API Endpoints:**
- `venue.create` (mutation)

**UI Components:**
- VenueRegistrationForm
- TimezoneSelector
- CurrencySelector

**Definition of Done:**
- Owner can complete full registration flow
- Venue appears in database with correct data
- Owner can access venue dashboard
- Validation prevents duplicate venues

---

### Story E2.2: Staff Invitation & Management

**Story ID:** E2.2
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 1
**FR:** FR2, FR3

**As a** venue owner or manager
**I want to** invite staff members and assign roles
**So that** my team can use the system

**Acceptance Criteria:**
- [ ] Create staff management page (`/dashboard/settings/staff`)
- [ ] Display list of current staff with roles
- [ ] "Invite Staff" button opens modal
- [ ] Form collects: email, role (Owner/Manager/Server/Kitchen/Host/Cashier)
- [ ] Send invitation email with registration link
- [ ] Invited user can complete registration
- [ ] Owner/Manager can edit staff roles
- [ ] Owner/Manager can deactivate staff accounts
- [ ] Log staff management actions for audit

**API Endpoints:**
- `user.inviteStaff` (mutation)
- `user.listStaff` (query)
- `user.updateStaffRole` (mutation)
- `user.deactivateStaff` (mutation)

**UI Components:**
- StaffList
- InviteStaffModal
- RoleSelector

**Definition of Done:**
- Staff can be invited via email
- Roles properly restrict access
- Staff list displays correctly
- Audit log tracks changes

---

### Story E2.3: User Authentication (Login/Logout)

**Story ID:** E2.3
**Type:** Feature
**Priority:** P0
**Effort:** 3 points
**Sprint:** Sprint 1
**FR:** FR3, FR4

**As a** user
**I want to** log in and out of the platform
**So that** I can access my account securely

**Acceptance Criteria:**
- [ ] Create login page (`/login`)
- [ ] Form collects email and password
- [ ] Validate credentials via NextAuth
- [ ] Display error for invalid credentials
- [ ] Redirect to appropriate dashboard after login (venue staff → dashboard, customer → profile)
- [ ] "Logout" button in header
- [ ] Clear session on logout
- [ ] Redirect to login page after logout

**API Endpoints:**
- NextAuth API routes (built-in)

**UI Components:**
- LoginForm
- LogoutButton

**Definition of Done:**
- Users can log in with valid credentials
- Invalid credentials show error
- Logout clears session
- Redirects work correctly

---

### Story E2.4: Password Reset Flow

**Story ID:** E2.4
**Type:** Feature
**Priority:** P1
**Effort:** 3 points
**Sprint:** Sprint 1
**FR:** FR4

**As a** user
**I want to** reset my password if I forget it
**So that** I can regain access to my account

**Acceptance Criteria:**
- [ ] "Forgot Password?" link on login page
- [ ] Password reset page (`/reset-password`)
- [ ] Form collects email address
- [ ] Generate secure reset token (expires in 1 hour)
- [ ] Send reset email with link containing token
- [ ] Reset link leads to new password form
- [ ] Validate token before allowing password change
- [ ] Update password and invalidate token
- [ ] Confirm password reset via email

**API Endpoints:**
- `user.requestPasswordReset` (mutation)
- `user.resetPassword` (mutation)

**UI Components:**
- ForgotPasswordForm
- ResetPasswordForm

**Definition of Done:**
- User receives reset email
- Token validates correctly
- Password updates successfully
- Old password no longer works

---

### Story E2.5: Multi-Venue Access & Switching

**Story ID:** E2.5
**Type:** Feature
**Priority:** P1
**Effort:** 5 points
**Sprint:** Sprint 1
**FR:** FR5

**As a** user who works at multiple venues
**I want to** easily switch between venues
**So that** I can manage multiple locations

**Acceptance Criteria:**
- [ ] Venue selector in dashboard header
- [ ] Display list of venues user has access to
- [ ] Show current venue name prominently
- [ ] Switch venue updates context throughout app
- [ ] Persist venue selection in session
- [ ] API calls automatically scoped to current venue
- [ ] Role may differ per venue (show current role)
- [ ] Switching venue preserves page location when possible

**API Endpoints:**
- `venue.listAccessible` (query)
- `venue.switchCurrent` (mutation)

**UI Components:**
- VenueSelector (dropdown)
- CurrentVenueIndicator

**Technical Notes:**
- Store current venueId in session or context
- tRPC middleware auto-injects venueId

**Definition of Done:**
- User can see all accessible venues
- Switching updates entire app context
- Data properly scoped to current venue
- Selection persists across page loads

---

### Story E2.6: Customer Account Creation (Optional)

**Story ID:** E2.6
**Type:** Feature
**Priority:** P1
**Effort:** 3 points
**Sprint:** Sprint 1
**FR:** FR6, FR7

**As a** customer
**I want to** optionally create an account
**So that** I can save payment methods and see my history

**Acceptance Criteria:**
- [ ] Account creation option after first transaction
- [ ] Supports email/password authentication
- [ ] Supports magic link (passwordless) authentication
- [ ] Optional social login (Google, Apple)
- [ ] Account creation is never required for transaction
- [ ] Pre-fill email/phone from transaction if available
- [ ] Send welcome email after account creation
- [ ] Customer can access account from any venue

**API Endpoints:**
- `customer.create` (mutation)
- `customer.sendMagicLink` (mutation)

**UI Components:**
- CustomerRegistrationForm
- MagicLinkForm
- SocialLoginButtons

**Definition of Done:**
- Customer can create account post-transaction
- Magic link authentication works
- Account creation remains optional
- Welcome email sent

---

### Story E2.7: Customer Profile Management

**Story ID:** E2.7
**Type:** Feature
**Priority:** P2
**Effort:** 3 points
**Sprint:** Sprint 1
**FR:** FR8

**As a** customer
**I want to** manage my profile and payment methods
**So that** I can update my information

**Acceptance Criteria:**
- [ ] Customer profile page (`/customer/profile`)
- [ ] Display current profile information (name, email, phone)
- [ ] Edit profile information
- [ ] List saved payment methods (cards)
- [ ] Add new payment method (via Stripe Elements)
- [ ] Remove payment method
- [ ] Set default payment method
- [ ] Update notification preferences (SMS, email)

**API Endpoints:**
- `customer.getProfile` (query)
- `customer.updateProfile` (mutation)
- `payment.listMethods` (query)
- `payment.addMethod` (mutation)
- `payment.removeMethod` (mutation)
- `payment.setDefaultMethod` (mutation)

**UI Components:**
- CustomerProfile
- PaymentMethodList
- AddPaymentMethodModal (Stripe Elements)

**Definition of Done:**
- Customer can view and edit profile
- Payment methods display correctly
- Adding/removing cards works
- Changes persist correctly

---

### Story E2.8: Customer Visit History

**Story ID:** E2.8
**Type:** Feature
**Priority:** P2
**Effort:** 3 points
**Sprint:** Sprint 1
**FR:** FR9

**As a** customer
**I want to** view my visit history across all venues
**So that** I can track my spending and receipts

**Acceptance Criteria:**
- [ ] Visit history page (`/customer/history`)
- [ ] List all past tabs across all venues
- [ ] Display: date, venue name, total amount, status
- [ ] Sort by date (newest first)
- [ ] Filter by venue, date range
- [ ] Click tab to view receipt details
- [ ] Show trust level indicator (if enrolled in trust program)
- [ ] Pagination for long history

**API Endpoints:**
- `customer.getVisitHistory` (query)
- `customer.getReceipt` (query)

**UI Components:**
- VisitHistoryList
- VisitHistoryFilters
- ReceiptDetailModal

**Definition of Done:**
- History displays all past tabs
- Filtering and sorting work
- Receipt details accessible
- Performance good with many records

---

### Story E2.9: Role-Based Access Control Testing

**Story ID:** E2.9
**Type:** Technical Task
**Priority:** P1
**Effort:** 2 points
**Sprint:** Sprint 1
**FR:** FR2, FR3

**As a** developer
**I want to** verify role-based access control works correctly
**So that** users only access features appropriate to their role

**Acceptance Criteria:**
- [ ] Create test users for each role (Owner, Manager, Server, Kitchen, Host, Cashier)
- [ ] Verify Owner can access all features
- [ ] Verify Manager can access operations features (not billing)
- [ ] Verify Server can only access POS and assigned tables
- [ ] Verify Kitchen can only access KDS
- [ ] Verify Host can only access reservations/seating
- [ ] Write integration tests for role restrictions
- [ ] Document role permission matrix

**Test Cases:**
- Owner tries to access venue settings → ✓ Allowed
- Server tries to access venue settings → ✗ Forbidden
- Kitchen tries to access POS → ✗ Forbidden
- Manager tries to modify billing → ✗ Forbidden

**Definition of Done:**
- All roles properly restricted
- Tests pass for all role combinations
- Permission matrix documented

---

## EPIC 3: Express Checkout System

**Epic ID:** E3
**Priority:** P0 - Critical
**Sprint:** Sprint 2-3
**Estimated Effort:** 4 weeks
**FR Count:** 13 (FR10-FR22)

### Epic Description
Implement the signature Express Checkout feature that allows card pre-authorization at tab opening, enabling customers to "leave when ready" without waiting for the check. This is the primary differentiator for Crowdiant and includes tab management, self-close capabilities, and walk-away detection.

### Success Criteria
- Servers can open tabs with pre-authorization
- Customers can view tabs in real-time via QR/link
- Customers can self-close with tip adjustment
- Walk-away detection auto-closes tabs
- Pre-auth properly released or captured
- SMS notifications work correctly

### Related FRs
FR10-FR22

---

### Story E3.1: Stripe Connect Integration Setup

**Story ID:** E3.1
**Type:** Technical Task
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 2
**FR:** Supporting infrastructure

**As a** developer
**I want to** integrate Stripe Connect for marketplace payments
**So that** venues can receive payments through the platform

**Acceptance Criteria:**
- [ ] Set up Stripe Connect application
- [ ] Implement Stripe account creation for venues
- [ ] Create OAuth flow for venue onboarding
- [ ] Store Stripe Connect account ID per venue
- [ ] Implement payment intent creation with connected account
- [ ] Set up webhook endpoint for Stripe events
- [ ] Test pre-authorization (capture_method: 'manual')
- [ ] Test authorization capture and release

**API Endpoints:**
- `venue.connectStripe` (mutation)
- `payment.createPreAuth` (mutation)
- `payment.capturePreAuth` (mutation)
- `/api/webhooks/stripe` (POST)

**Technical Notes:**
- Use Stripe Connect Express accounts
- Reference Architecture: "Integration Points > Payment: Stripe Connect"
- Store webhook signature validation

**Definition of Done:**
- Venue can complete Stripe onboarding
- Pre-auth can be created and captured
- Webhooks receive and process events
- Test mode works end-to-end

---

### Story E3.2: Open Tab with Pre-Authorization

**Story ID:** E3.2
**Type:** Feature
**Priority:** P0
**Effort:** 8 points
**Sprint:** Sprint 2
**FR:** FR10, FR11, FR12

**As a** server
**I want to** open a tab with Express Checkout
**So that** customers can pay seamlessly without wait

**Acceptance Criteria:**
- [ ] "Open Tab" button on POS terminal
- [ ] Modal prompts for: table number, customer phone (optional), email (optional)
- [ ] Collect payment method via Stripe Terminal or handheld card reader
- [ ] Calculate pre-auth amount based on venue settings (default $50)
- [ ] Create payment intent with pre-authorization
- [ ] Display authorization status to server
- [ ] Generate unique tab access token for customer
- [ ] Generate QR code for tab access
- [ ] Print QR code receipt or display on screen
- [ ] Handle declined authorization gracefully
- [ ] Customer keeps physical card after authorization

**API Endpoints:**
- `tab.openWithExpressCheckout` (mutation)

**UI Components:**
- OpenTabModal
- PaymentMethodCollector (Stripe Terminal integration)
- QRCodeGenerator
- TabOpenConfirmation

**Database Changes:**
- Create Tab record with status PENDING_AUTH → OPEN

**Definition of Done:**
- Server can open tab with card
- Pre-auth succeeds and tab opens
- QR code generated for customer
- Declined cards show clear error
- Customer keeps card

---

### Story E3.3: Real-Time Tab View for Customers

**Story ID:** E3.3
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 2
**FR:** FR13, FR14

**As a** customer
**I want to** view my current tab in real-time
**So that** I can see what I'm being charged

**Acceptance Criteria:**
- [ ] Customer-facing tab view page (`/tab/[accessToken]`)
- [ ] Display venue name and table number
- [ ] List all items with prices
- [ ] Show subtotal, tax, tip, total
- [ ] Real-time updates when items added (Socket.io or polling)
- [ ] Mobile-optimized design
- [ ] No authentication required (access token in URL)
- [ ] Show pre-authorized amount
- [ ] Display "You can leave when ready" messaging

**API Endpoints:**
- `tab.getByAccessToken` (public query)
- Socket.io event: `tab:item-added`

**UI Components:**
- CustomerTabView
- TabItemList
- TabTotalsSummary

**Technical Notes:**
- Use public tRPC procedure (no auth required)
- Access token should be secure, single-use URL
- Implement rate limiting on access token endpoint

**Definition of Done:**
- Customer can access tab via QR code
- Items display correctly
- Updates appear in real-time
- Works on mobile devices
- Secure access token validation

---

### Story E3.4: Add Items to Open Tab

**Story ID:** E3.4
**Type:** Feature
**Priority:** P0
**Effort:** 3 points
**Sprint:** Sprint 2
**FR:** FR13

**As a** server
**I want to** add items to an open tab
**So that** the customer's bill reflects their orders

**Acceptance Criteria:**
- [ ] POS menu grid shows available items
- [ ] Select items and add to current tab
- [ ] Specify quantity for each item
- [ ] Add modifiers if applicable
- [ ] Add special instructions
- [ ] Items immediately added to tab in database
- [ ] Customer tab view updates in real-time
- [ ] Calculate running total with tax
- [ ] Alert if total approaches pre-auth limit
- [ ] Allow adding beyond pre-auth (with warning)

**API Endpoints:**
- `tab.addItem` (mutation)

**UI Components:**
- (Reuse POS components from E4)
- TabTotalIndicator with pre-auth warning

**Business Logic:**
- When tab total reaches 90% of pre-auth, warn server
- When exceeds pre-auth, prompt for additional authorization

**Definition of Done:**
- Server can add items to tab
- Real-time updates work
- Tax calculated correctly
- Pre-auth warnings display

---

### Story E3.5: Customer Self-Close Tab

**Story ID:** E3.5
**Type:** Feature
**Priority:** P0
**Effort:** 8 points
**Sprint:** Sprint 2
**FR:** FR15, FR16

**As a** customer
**I want to** close my tab myself from my phone
**So that** I can leave without waiting for the server

**Acceptance Criteria:**
- [ ] "Close Tab" button on customer tab view
- [ ] Tip selection interface (%, custom amount, no tip)
- [ ] Display final total with tip
- [ ] Confirm close action
- [ ] Capture pre-authorization with final amount
- [ ] Handle capture errors gracefully
- [ ] Mark tab as CLOSED in database
- [ ] Generate digital receipt
- [ ] Send receipt via SMS and/or email
- [ ] Display "Thank you" confirmation
- [ ] Release excess pre-authorization

**API Endpoints:**
- `tab.customerClose` (public mutation)
- `payment.capturePreAuth` (internal)

**UI Components:**
- TipSelector (%, dollar amount, custom)
- CloseTabConfirmation
- ReceiptConfirmation

**Payment Flow:**
1. Calculate final amount (subtotal + tax + tip)
2. Capture pre-auth for final amount
3. If capture succeeds → close tab
4. If capture fails → display error, keep tab open
5. Release remaining pre-auth amount

**Definition of Done:**
- Customer can close tab from phone
- Tip selection works
- Payment captures correctly
- Receipt generated and sent
- Excess pre-auth released

---

### Story E3.6: Server Close Tab

**Story ID:** E3.6
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 2
**FR:** FR16

**As a** server
**I want to** close a tab on behalf of a customer
**So that** I can handle payment at the table

**Acceptance Criteria:**
- [ ] "Close Tab" option on POS terminal for open tabs
- [ ] Prompt for tip amount (or customer adds tip on terminal)
- [ ] Display final total
- [ ] Confirm close action
- [ ] Capture pre-authorization
- [ ] Print receipt option
- [ ] Send digital receipt to customer (if contact info provided)
- [ ] Mark tab as CLOSED
- [ ] Remove from active tabs list

**API Endpoints:**
- `tab.close` (mutation)

**UI Components:**
- CloseTabModal
- TipEntryForm
- ReceiptOptions

**Definition of Done:**
- Server can close tab from POS
- Tip entry works
- Payment captures
- Receipt sent
- Tab removed from active list

---

### Story E3.7: Walk-Away Detection System

**Story ID:** E3.7
**Type:** Feature
**Priority:** P0
**Effort:** 8 points
**Sprint:** Sprint 3
**FR:** FR17, FR18, FR21

**As a** restaurant owner
**I want** the system to detect when customers leave without closing their tab
**So that** I don't lose revenue from walk-aways

**Acceptance Criteria:**
- [ ] Background worker monitors open tabs
- [ ] Detect inactivity (no new orders in X minutes, configurable per venue)
- [ ] Check for departure signals (server marked table cleared)
- [ ] When walk-away detected, enter WALK_AWAY state
- [ ] Send SMS warning to customer before auto-close
- [ ] "We noticed you may have left. Your tab will auto-close in 10 minutes. Reply WAIT if you're still dining."
- [ ] Grace period (default 15 minutes, configurable)
- [ ] If no response, auto-close tab with last known tip (or 0%)
- [ ] Manager can override/cancel auto-close
- [ ] Log walk-away events for analytics

**API Endpoints:**
- `tab.markWalkAway` (mutation)
- `tab.cancelAutoClose` (mutation)
- Worker: `auto-close-worker.ts`

**UI Components:**
- WalkAwayAlert (for manager dashboard)
- OverrideAutoCloseButton

**Business Logic:**
```typescript
Walk-away detection triggers:
1. No activity for 30+ minutes after last order
2. Server marked table as "cleared"
3. Average visit duration exceeded by 50%

Walk-away flow:
1. Mark tab WALK_AWAY
2. Send SMS warning
3. Wait 10-15 minutes
4. If no response → AUTO_CLOSED
5. If customer responds → WALK_AWAY → CLOSING
```

**Definition of Done:**
- Worker detects walk-aways
- SMS warnings sent
- Auto-close executes correctly
- Manager can override
- Events logged

---

### Story E3.8: Tab Access Token & QR Code Generation

**Story ID:** E3.8
**Type:** Feature
**Priority:** P0
**Effort:** 3 points
**Sprint:** Sprint 2
**FR:** FR14

**As a** customer
**I want to** access my tab via QR code
**So that** I don't need to install an app or create an account

**Acceptance Criteria:**
- [ ] Generate secure access token on tab open (UUID or JWT)
- [ ] Token includes: tabId, expiry (24 hours), signature
- [ ] Generate QR code from URL: `https://app.crowdiant.com/tab/[token]`
- [ ] QR code displayed on receipt or screen
- [ ] Token validates correctly when scanned
- [ ] Expired tokens show error message
- [ ] Token single-use or rate-limited to prevent sharing

**API Endpoints:**
- `tab.generateAccessToken` (mutation)
- `tab.validateAccessToken` (query)

**Libraries:**
- `qrcode` npm package for QR generation

**Technical Notes:**
- Store access token in database with expiry
- Implement rate limiting (max 20 requests/minute per token)

**Definition of Done:**
- QR code generated for each tab
- Token validates correctly
- Expired tokens rejected
- Rate limiting works

---

### Story E3.9: Digital Receipt Generation & Delivery

**Story ID:** E3.9
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 2
**FR:** FR19

**As a** customer
**I want to** receive a digital receipt
**So that** I have a record of my purchase

**Acceptance Criteria:**
- [ ] Generate receipt on tab close (HTML format)
- [ ] Include: venue name, date/time, itemized list, totals, payment method (last 4 digits)
- [ ] Store receipt as PDF in S3 or similar
- [ ] Generate unique receipt URL
- [ ] Send SMS with receipt link (if phone provided)
- [ ] Send email with receipt PDF (if email provided)
- [ ] Receipt page (`/receipt/[receiptId]`) accessible without auth
- [ ] Option to download/print receipt

**API Endpoints:**
- `receipt.generate` (mutation)
- `receipt.getById` (public query)

**UI Components:**
- ReceiptTemplate (HTML/React Email)
- ReceiptViewer

**Integrations:**
- SMS: Twilio
- Email: Resend
- Storage: AWS S3

**Definition of Done:**
- Receipt generated on tab close
- SMS and email sent
- Receipt viewable in browser
- PDF download works

---

### Story E3.10: Pre-Authorization Amount Calculation

**Story ID:** E3.10
**Type:** Feature
**Priority:** P1
**Effort:** 3 points
**Sprint:** Sprint 2
**FR:** FR11, FR22

**As a** venue owner
**I want to** configure pre-authorization amounts based on my venue type
**So that** I balance security and customer experience

**Acceptance Criteria:**
- [ ] Venue settings page includes pre-auth configuration
- [ ] Default pre-auth amounts by venue type:
  - Food truck: $30
  - Casual dining: $50
  - Fine dining: $100
  - Bar: $75
- [ ] Custom pre-auth amount option
- [ ] Pre-auth adjusts based on party size (future enhancement)
- [ ] System calculates 20% buffer above typical check average
- [ ] Display pre-auth amount to server before opening tab

**API Endpoints:**
- `venue.updatePreAuthSettings` (mutation)

**UI Components:**
- PreAuthSettingsForm

**Business Logic:**
```typescript
calculatePreAuthAmount(venue, partySize) {
  let baseAmount = venue.preAuthAmountCents;
  // Future: adjust by party size
  // baseAmount *= partySize * 1.5;
  return baseAmount;
}
```

**Definition of Done:**
- Venue can configure pre-auth amount
- Amount used when opening tabs
- Settings persist correctly

---

### Story E3.11: Pre-Auth Excess Handling

**Story ID:** E3.11
**Type:** Feature
**Priority:** P1
**Effort:** 5 points
**Sprint:** Sprint 3
**FR:** FR22

**As a** server
**I want to** be alerted when a tab exceeds pre-authorization
**So that** I can request additional authorization

**Acceptance Criteria:**
- [ ] Monitor tab total as items added
- [ ] Alert server when total reaches 90% of pre-auth
- [ ] Alert customer when total reaches 100% of pre-auth
- [ ] Option to request additional pre-authorization
- [ ] Customer approves additional auth on their device
- [ ] New pre-auth increments (e.g., +$25)
- [ ] Update tab with new pre-auth amount
- [ ] Continue adding items after additional auth

**API Endpoints:**
- `tab.requestAdditionalAuth` (mutation)
- `tab.approveAdditionalAuth` (mutation)

**UI Components:**
- PreAuthExceededAlert
- AdditionalAuthRequest (customer-facing)

**Business Logic:**
- Alert at 90%: "Tab approaching limit"
- Alert at 100%: "Tab exceeded pre-auth. Request additional authorization?"
- Additional auth in $25 increments

**Definition of Done:**
- Alerts trigger at thresholds
- Additional auth can be requested
- Customer can approve on phone
- Tab total can exceed original pre-auth

---

### Story E3.12: Tab State Machine Implementation

**Story ID:** E3.12
**Type:** Technical Task
**Priority:** P1
**Effort:** 5 points
**Sprint:** Sprint 3
**FR:** Supporting infrastructure

**As a** developer
**I want to** implement the tab state machine
**So that** tab transitions are predictable and auditable

**Acceptance Criteria:**
- [ ] Define TabStatus enum (PENDING_AUTH, OPEN, CLOSING, WALK_AWAY, AUTO_CLOSED, CLOSED, FAILED)
- [ ] Implement state transition validation
- [ ] Prevent invalid state transitions
- [ ] Log all state transitions with timestamp
- [ ] Create state transition diagram in docs
- [ ] Write unit tests for all transitions
- [ ] Implement state machine utility functions

**State Transitions:**
```typescript
PENDING_AUTH → OPEN (pre-auth succeeds)
PENDING_AUTH → FAILED (pre-auth declines)
OPEN → CLOSING (close initiated)
OPEN → WALK_AWAY (customer left)
CLOSING → CLOSED (payment captured)
WALK_AWAY → AUTO_CLOSED (grace period expired)
WALK_AWAY → CLOSING (customer responded)
```

**Technical Notes:**
- Reference Architecture: "Novel Pattern Designs > Express Checkout State Machine"
- Use XState or custom state machine

**Definition of Done:**
- State transitions validated
- Invalid transitions rejected
- All transitions logged
- Tests pass for all scenarios

---

### Story E3.13: Express Checkout Analytics Dashboard

**Story ID:** E3.13
**Type:** Feature
**Priority:** P2
**Effort:** 3 points
**Sprint:** Sprint 3
**FR:** Supporting analytics

**As a** venue owner
**I want to** see Express Checkout adoption and performance metrics
**So that** I understand the value

**Acceptance Criteria:**
- [ ] Dashboard widget showing Express Checkout stats
- [ ] Metrics: adoption rate (% of tabs using Express Checkout)
- [ ] Walk-away recovery amount ($0 target)
- [ ] Average tab close time
- [ ] Customer self-close rate vs server close
- [ ] Pre-auth success rate
- [ ] Chart showing adoption trend over time

**API Endpoints:**
- `analytics.getExpressCheckoutStats` (query)

**UI Components:**
- ExpressCheckoutStatsWidget
- AdoptionTrendChart

**Definition of Done:**
- Dashboard displays all metrics
- Data accurate
- Charts render correctly
- Updates daily

---

## EPIC 4: Point of Sale Core

**Epic ID:** E4
**Priority:** P1 - High
**Sprint:** Sprint 4-5
**Estimated Effort:** 4 weeks
**FR Count:** 12 (FR30-FR41)

### Epic Description
Build the core Point of Sale functionality for order entry, payment processing, and transaction management. This enables venues to process sales and captures revenue through the platform.

### Success Criteria
- Servers can create and modify orders
- Multiple payment methods supported
- Check splitting works correctly
- Daily sales reports generate
- Cash drawer tracking functional

### Related FRs
FR30-FR41

---

### Story E4.1: POS Terminal Layout & Order Entry

**Story ID:** E4.1
**Type:** Feature
**Priority:** P0
**Effort:** 8 points
**Sprint:** Sprint 4
**FR:** FR30, FR31, FR32

**As a** server
**I want to** enter orders quickly on the POS terminal
**So that** I can process orders efficiently

**Acceptance Criteria:**
- [ ] POS terminal view (`/pos/terminal`)
- [ ] Full-screen layout optimized for touch
- [ ] Three-panel layout: Menu (left), Cart (right), Categories (top)
- [ ] Menu grid displays items with images and prices
- [ ] Click item to add to cart
- [ ] Show quantity selector
- [ ] Cart shows running total
- [ ] Support order types: Dine-in, Takeout, Delivery
- [ ] Assign order to table or customer
- [ ] Quick actions: Clear cart, Save order, Send to kitchen

**API Endpoints:**
- `order.create` (mutation)
- `menu.listItems` (query)

**UI Components:**
- POSTerminal (layout)
- MenuGrid
- CartPanel
- CategoryTabs
- OrderTypeSelector

**Definition of Done:**
- Server can add items to cart
- Cart updates correctly
- Order can be assigned to table
- Interface responsive and fast

---

### Story E4.2: Menu Item Modifiers & Special Instructions

**Story ID:** E4.2
**Type:** Feature
**Priority:** P1
**Effort:** 5 points
**Sprint:** Sprint 4
**FR:** FR30, FR33

**As a** server
**I want to** add modifiers and special instructions to items
**So that** I can customize orders

**Acceptance Criteria:**
- [ ] Click item in cart to open modifier modal
- [ ] Display available modifier groups (e.g., "Size", "Add-ons", "Remove")
- [ ] Select modifiers (checkboxes for multiple, radio for single-select)
- [ ] Modifiers adjust price (free, upcharge, or discount)
- [ ] Text field for special instructions
- [ ] Modifiers display in cart with item
- [ ] Modifiers included in kitchen display
- [ ] Modifiers itemized on receipt

**API Endpoints:**
- `menu.getItemModifiers` (query)

**UI Components:**
- ModifierModal
- ModifierGroupSelector
- SpecialInstructionsInput

**Definition of Done:**
- Modifiers can be added to items
- Prices adjust correctly
- Modifiers visible in cart and KDS
- Special instructions saved

---

### Story E4.3: Order Modification & Cancellation

**Story ID:** E4.3
**Type:** Feature
**Priority:** P1
**Effort:** 3 points
**Sprint:** Sprint 4
**FR:** FR33

**As a** server
**I want to** modify or cancel orders before sending to kitchen
**So that** I can correct mistakes

**Acceptance Criteria:**
- [ ] Remove item from cart (before sent to kitchen)
- [ ] Change item quantity
- [ ] Edit modifiers
- [ ] Clear entire cart
- [ ] Void order (after sent to kitchen, requires manager approval)
- [ ] Log all modifications for audit
- [ ] Display modification history on receipt

**API Endpoints:**
- `order.modify` (mutation)
- `order.void` (mutation, requires manager role)

**UI Components:**
- EditOrderItemModal
- VoidOrderConfirmation

**Business Rules:**
- Items can be freely modified before sent to kitchen
- After sent to kitchen, voids require manager approval
- Voided items appear in reports with reason

**Definition of Done:**
- Orders can be modified freely before submit
- Voids require approval
- Changes logged for audit
- Receipt shows modifications

---

### Story E4.4: Tax Calculation

**Story ID:** E4.4
**Type:** Feature
**Priority:** P0
**Effort:** 3 points
**Sprint:** Sprint 4
**FR:** FR34

**As a** venue owner
**I want** tax calculated correctly on all sales
**So that** I comply with tax regulations

**Acceptance Criteria:**
- [ ] Venue settings include tax rate configuration
- [ ] Support multiple tax rates (e.g., food vs alcohol)
- [ ] Tax calculated on subtotal
- [ ] Display tax amount separately on receipt
- [ ] Tax included in total
- [ ] Support tax-exempt items
- [ ] Tax rate can vary by location (multi-venue)

**API Endpoints:**
- `venue.configureTax` (mutation)

**Business Logic:**
```typescript
calculateTax(items, taxRates) {
  let taxAmount = 0;
  items.forEach(item => {
    const rate = taxRates[item.taxCategory] || 0;
    taxAmount += item.price * item.quantity * rate;
  });
  return Math.round(taxAmount); // Round to cents
}
```

**Definition of Done:**
- Tax rates configurable per venue
- Tax calculated correctly
- Tax itemized on receipt
- Supports multiple rates

---

### Story E4.5: Discounts & Comps

**Story ID:** E4.5
**Type:** Feature
**Priority:** P1
**Effort:** 5 points
**Sprint:** Sprint 4
**FR:** FR35

**As a** server or manager
**I want to** apply discounts or comp items
**So that** I can handle special situations

**Acceptance Criteria:**
- [ ] Apply discount to entire order (%, fixed amount)
- [ ] Apply discount to specific item
- [ ] Comp (100% discount) specific item
- [ ] Discounts require reason code
- [ ] Discounts may require manager approval based on amount
- [ ] Discounts displayed on receipt
- [ ] Discounts tracked in analytics
- [ ] Log discount actions for audit

**API Endpoints:**
- `order.applyDiscount` (mutation)
- `order.compItem` (mutation)

**UI Components:**
- DiscountModal
- ReasonCodeSelector
- ManagerApprovalPrompt

**Business Rules:**
- Discounts >20% require manager approval
- Comps always require manager approval
- Common reason codes: "Manager comp", "Service recovery", "Promotion", "Staff meal"

**Definition of Done:**
- Discounts can be applied
- Manager approval works
- Reasons logged
- Analytics track discounts

---

### Story E4.6: Split Payment (Multiple Methods)

**Story ID:** E4.6
**Type:** Feature
**Priority:** P1
**Effort:** 5 points
**Sprint:** Sprint 5
**FR:** FR36

**As a** server
**I want to** process payment across multiple payment methods
**So that** I can accommodate customer preferences

**Acceptance Criteria:**
- [ ] Split payment option at checkout
- [ ] Specify amount for each payment method
- [ ] Support: Card, Cash, Gift Card
- [ ] Process payments sequentially
- [ ] If one payment fails, reverse others and retry
- [ ] Display remaining balance after each payment
- [ ] Receipt shows all payment methods used

**API Endpoints:**
- `payment.processSplit` (mutation)

**UI Components:**
- SplitPaymentModal
- PaymentMethodSelector
- AmountInput

**Payment Flow:**
1. Calculate total
2. Collect payment 1 → process
3. If balance remains → collect payment 2 → process
4. Continue until balance = $0
5. If any fail → reverse all, start over

**Definition of Done:**
- Multiple payment methods work
- Partial payments process
- Failures handled gracefully
- Receipt shows all methods

---

### Story E4.7: Check Splitting (Even, By Item, By Seat)

**Story ID:** E4.7
**Type:** Feature
**Priority:** P1
**Effort:** 8 points
**Sprint:** Sprint 5
**FR:** FR37

**As a** server
**I want to** split checks multiple ways
**So that** customers can pay separately

**Acceptance Criteria:**
- [ ] Split check option before closing tab
- [ ] Three split methods:
  - Even split (divide total by N people)
  - By item (assign items to people)
  - By seat (if seats tracked during order)
- [ ] Create separate tabs for each split
- [ ] Each split has its own payment
- [ ] Splits inherit Express Checkout if original tab used it
- [ ] Option to split items proportionally (shared appetizer)

**API Endpoints:**
- `tab.splitEven` (mutation)
- `tab.splitByItem` (mutation)
- `tab.splitBySeat` (mutation)

**UI Components:**
- SplitCheckModal
- SplitMethodSelector
- ItemAssignment (drag-drop interface)

**Business Logic:**
```typescript
splitEven(tab, numPeople) {
  const amountPerPerson = Math.ceil(tab.totalCents / numPeople);
  return createNSubTabs(numPeople, amountPerPerson);
}

splitByItem(tab, itemAssignments) {
  // itemAssignments: { personId: [itemIds] }
  // Calculate subtotal per person
  // Distribute tax proportionally
}
```

**Definition of Done:**
- All three split methods work
- Tax distributed correctly
- Each person can pay separately
- Receipt shows split clearly

---

### Story E4.8: Card-Present Payment Processing

**Story ID:** E4.8
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 5
**FR:** FR38

**As a** server
**I want to** process card payments at the terminal
**So that** customers can pay with cards

**Acceptance Criteria:**
- [ ] Integrate Stripe Terminal SDK
- [ ] Support card readers (Stripe Reader, WisePad 3)
- [ ] Collect payment via terminal
- [ ] Display "Processing..." indicator
- [ ] Handle approved payments
- [ ] Handle declined payments with error message
- [ ] Print receipt option
- [ ] Support contactless (tap), chip, and swipe

**API Endpoints:**
- `payment.processCardPresent` (mutation)

**Hardware:**
- Stripe Terminal hardware
- Bluetooth or USB connection

**Technical Notes:**
- Use Stripe Terminal SDK (JavaScript)
- Implement PCI-compliant flow (P2PE)
- Never log full card numbers

**Definition of Done:**
- Card reader connects
- Payments process successfully
- Declines handled gracefully
- Receipt prints

---

### Story E4.9: Cash Payment Processing

**Story ID:** E4.9
**Type:** Feature
**Priority:** P1
**Effort:** 3 points
**Sprint:** Sprint 5
**FR:** FR40

**As a** cashier
**I want to** accept cash payments
**So that** I can serve customers who pay with cash

**Acceptance Criteria:**
- [ ] Cash payment option at checkout
- [ ] Enter amount tendered
- [ ] Calculate and display change due
- [ ] Record cash payment in database
- [ ] Track cash drawer balance
- [ ] Option to print receipt
- [ ] Cash sales included in daily reports

**API Endpoints:**
- `payment.processCash` (mutation)

**UI Components:**
- CashPaymentModal
- TenderAmountInput
- ChangeDueDisplay

**Business Logic:**
```typescript
processCashPayment(totalCents, tenderedCents) {
  if (tenderedCents < totalCents) {
    throw new Error('Insufficient payment');
  }
  const changeCents = tenderedCents - totalCents;
  return { changeCents, success: true };
}
```

**Definition of Done:**
- Cash payments process
- Change calculated correctly
- Drawer balance updates
- Reports include cash sales

---

### Story E4.10: Cash Drawer Management

**Story ID:** E4.10
**Type:** Feature
**Priority:** P1
**Effort:** 3 points
**Sprint:** Sprint 5
**FR:** FR40

**As a** cashier
**I want to** manage the cash drawer
**So that** I can track cash accurately

**Acceptance Criteria:**
- [ ] Open cash drawer with starting balance
- [ ] Record cash in (sales)
- [ ] Record cash out (change, payouts)
- [ ] Close cash drawer with ending count
- [ ] Calculate expected vs actual balance
- [ ] Report overage/shortage
- [ ] Manager approval for large discrepancies
- [ ] Print cash drawer report

**API Endpoints:**
- `cashDrawer.open` (mutation)
- `cashDrawer.close` (mutation)
- `cashDrawer.recordTransaction` (mutation)

**UI Components:**
- OpenDrawerModal
- CloseDrawerModal
- CashCountForm

**Definition of Done:**
- Drawer can be opened/closed
- Transactions recorded
- Overages/shortages tracked
- Reports generated

---

### Story E4.11: Daily Sales Reports

**Story ID:** E4.11
**Type:** Feature
**Priority:** P1
**Effort:** 5 points
**Sprint:** Sprint 5
**FR:** FR41

**As a** manager
**I want to** generate daily sales reports
**So that** I can track revenue and reconcile payments

**Acceptance Criteria:**
- [ ] Generate end-of-day report
- [ ] Include: total sales, payment method breakdown, tax collected, discounts given, voids, comps
- [ ] Display: sales by category, top-selling items, average check size
- [ ] Export as PDF or CSV
- [ ] Historical reports accessible
- [ ] Compare to previous day/week
- [ ] Schedule automatic generation (daily at close)

**API Endpoints:**
- `analytics.getDailySalesReport` (query)

**UI Components:**
- DailySalesReport
- ReportFilters (date range)
- ExportButton

**Report Sections:**
1. Revenue Summary
2. Payment Methods Breakdown
3. Sales by Category
4. Top Items
5. Discounts & Comps
6. Voids & Refunds

**Definition of Done:**
- Report generates with all sections
- Data accurate
- Export works
- Historical access available

---

### Story E4.12: POS Order Type Support

**Story ID:** E4.12
**Type:** Feature
**Priority:** P1
**Effort:** 3 points
**Sprint:** Sprint 4
**FR:** FR31

**As a** server
**I want to** specify order type (dine-in, takeout, delivery)
**So that** operations are handled appropriately

**Acceptance Criteria:**
- [ ] Order type selector on POS
- [ ] Three types: Dine-in, Takeout, Delivery
- [ ] Dine-in requires table assignment
- [ ] Takeout prompts for customer name/phone
- [ ] Delivery prompts for address
- [ ] Order type displayed on kitchen display
- [ ] Order type affects tax calculation (if applicable)
- [ ] Analytics track orders by type

**API Endpoints:**
- `order.create` (includes orderType field)

**UI Components:**
- OrderTypeSelector
- CustomerInfoForm (for takeout/delivery)

**Definition of Done:**
- Order type selectable
- Appropriate fields collected
- KDS shows order type
- Analytics track by type

---

## EPIC 5: Menu Management

**Epic ID:** E5
**Priority:** P1 - High
**Sprint:** Sprint 6
**Estimated Effort:** 2 weeks
**FR Count:** 7 (FR42-FR48)

### Epic Description
Build comprehensive menu management capabilities allowing managers to create, organize, and maintain menus with items, categories, modifiers, pricing, and availability controls. This is foundational for POS and ordering operations.

### Success Criteria
- Managers can create and organize menu structure
- Items can be configured with prices and modifiers
- Availability controls work (86'd items, seasonal menus)
- Menu performance tracked
- Multi-venue menu copying supported

### Related FRs
FR42-FR48

---

### Story E5.1: Menu & Category Structure

**Story ID:** E5.1
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 6
**FR:** FR42

**As a** manager
**I want to** create and organize menu categories
**So that** items are logically grouped

**Acceptance Criteria:**
- [ ] Menu management page (`/dashboard/menu`)
- [ ] Create menu (e.g., "Lunch Menu", "Dinner Menu", "Brunch")
- [ ] Create categories within menu (e.g., "Appetizers", "Entrees", "Desserts")
- [ ] Drag-and-drop reordering of categories
- [ ] Set category display order
- [ ] Set category visibility (active/inactive)
- [ ] Nested subcategories (optional, e.g., "Drinks" → "Beer", "Wine", "Cocktails")
- [ ] Category images for visual appeal

**API Endpoints:**
- `menu.create` (mutation)
- `menu.createCategory` (mutation)
- `menu.reorderCategories` (mutation)
- `menu.list` (query)

**UI Components:**
- MenuList
- CategoryEditor
- DragDropReorder

**Definition of Done:**
- Menus and categories can be created
- Reordering works smoothly
- Structure displays on POS
- Changes persist correctly

---

### Story E5.2: Menu Item Creation & Configuration

**Story ID:** E5.2
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 6
**FR:** FR43

**As a** manager
**I want to** create menu items with details
**So that** they display correctly on POS and for customers

**Acceptance Criteria:**
- [ ] Create item form with fields:
  - Name, description
  - Price (in cents)
  - Category assignment
  - Image upload (S3)
  - SKU/item code
  - Tax category (food, alcohol, non-taxable)
- [ ] Rich text editor for description
- [ ] Multiple images per item
- [ ] Set featured/popular flag
- [ ] Allergen information
- [ ] Nutritional information (optional)
- [ ] Calorie count display

**API Endpoints:**
- `menu.createItem` (mutation)
- `menu.updateItem` (mutation)
- `menu.uploadImage` (mutation)

**UI Components:**
- ItemEditor
- ImageUploader
- RichTextEditor
- AllergenSelector

**Definition of Done:**
- Items can be created with all fields
- Images upload and display
- Items appear in correct category
- Data validates correctly

---

### Story E5.3: Modifier Groups & Options

**Story ID:** E5.3
**Type:** Feature
**Priority:** P0
**Effort:** 8 points
**Sprint:** Sprint 6
**FR:** FR44

**As a** manager
**I want to** configure modifiers for menu items
**So that** customers can customize their orders

**Acceptance Criteria:**
- [ ] Create modifier group (e.g., "Size", "Temperature", "Add-ons")
- [ ] Set group type: single-select (radio) or multi-select (checkbox)
- [ ] Add modifier options to group (e.g., "Small", "Medium", "Large")
- [ ] Set price adjustment per option (+$2.00, -$0.50, $0.00)
- [ ] Set min/max selections (e.g., "Choose 1", "Choose up to 3")
- [ ] Assign modifier groups to items
- [ ] Default selections
- [ ] Conditional modifiers (e.g., only show "Add Cheese" for burgers)

**API Endpoints:**
- `menu.createModifierGroup` (mutation)
- `menu.addModifierOption` (mutation)
- `menu.assignModifiersToItem` (mutation)

**UI Components:**
- ModifierGroupEditor
- ModifierOptionForm
- ItemModifierAssignment

**Database Schema:**
```prisma
model ModifierGroup {
  id, name, type (SINGLE/MULTI)
  minSelections, maxSelections
  items (relation)
  options (relation)
}

model ModifierOption {
  id, name, priceAdjustmentCents
  groupId
}
```

**Definition of Done:**
- Modifier groups created
- Options configurable
- Price adjustments work
- POS shows modifiers correctly

---

### Story E5.4: Item Availability Controls

**Story ID:** E5.4
**Type:** Feature
**Priority:** P1
**Effort:** 3 points
**Sprint:** Sprint 6
**FR:** FR45

**As a** manager
**I want to** control item availability
**So that** customers don't order unavailable items

**Acceptance Criteria:**
- [ ] Set item status: Available, 86'd (out of stock), Seasonal
- [ ] "86 Item" quick action from POS or menu page
- [ ] Automatic un-86 at specified time (e.g., next day at open)
- [ ] Seasonal items: set available date range
- [ ] Unavailable items hidden from POS and customer menus
- [ ] Manager can view 86'd items list
- [ ] Notification when item 86'd (to all staff)
- [ ] Bulk availability updates

**API Endpoints:**
- `menu.updateItemAvailability` (mutation)
- `menu.markItem86ed` (mutation)
- `menu.list86edItems` (query)

**UI Components:**
- AvailabilityToggle
- EightySixButton
- SeasonalDatePicker
- EightySixedItemsList

**Definition of Done:**
- Items can be marked 86'd
- Unavailable items hidden
- Auto-restore works
- Seasonal dates enforced

---

### Story E5.5: Time-Based Menu Availability

**Story ID:** E5.5
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 6
**FR:** FR46

**As a** manager
**I want to** set time-based menu availability
**So that** lunch/dinner/brunch menus show at appropriate times

**Acceptance Criteria:**
- [ ] Set menu availability schedule (days of week, time range)
- [ ] Example: "Lunch Menu" available Mon-Fri 11am-3pm
- [ ] Multiple time blocks per menu
- [ ] Override schedule (manually activate menu)
- [ ] POS automatically switches to correct menu based on time
- [ ] Display current active menus
- [ ] Preview menus regardless of time (for manager)

**API Endpoints:**
- `menu.setAvailabilitySchedule` (mutation)
- `menu.getActiveMenus` (query)

**UI Components:**
- MenuScheduleEditor
- TimeRangePicker
- ActiveMenuIndicator

**Business Logic:**
```typescript
getActiveMenus(venue, currentTime) {
  return venue.menus.filter(menu => 
    menu.schedule.some(block => 
      isWithinTimeRange(currentTime, block) &&
      isDayOfWeek(currentTime, block.daysOfWeek)
    )
  );
}
```

**Definition of Done:**
- Schedules configurable
- Menus auto-switch by time
- Multiple schedules work
- Override capability exists

---

### Story E5.6: Menu Duplication for Multi-Venue

**Story ID:** E5.6
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 6
**FR:** FR47

**As a** multi-venue operator
**I want to** copy menus between venues
**So that** I don't recreate the same menu multiple times

**Acceptance Criteria:**
- [ ] "Duplicate Menu" action on menu list
- [ ] Select target venue(s) for duplication
- [ ] Option to duplicate: structure only, or structure + items + modifiers
- [ ] Option to link items (changes to source propagate to copies)
- [ ] Local overrides (venue can modify copied items independently)
- [ ] Bulk price adjustment (increase/decrease all by %)
- [ ] Review changes before applying

**API Endpoints:**
- `menu.duplicate` (mutation)
- `menu.linkAcrossVenues` (mutation)
- `menu.applyBulkPriceChange` (mutation)

**UI Components:**
- DuplicateMenuWizard
- VenueSelector
- PriceAdjustmentForm

**Business Logic:**
- Deep copy all categories, items, modifiers
- Generate new IDs for target venue
- Maintain link table for propagation

**Definition of Done:**
- Menu can be duplicated to other venues
- Local overrides work
- Linked items update together
- Price adjustments apply correctly

---

### Story E5.7: Menu Performance Analytics

**Story ID:** E5.7
**Type:** Feature
**Priority:** P2
**Effort:** 3 points
**Sprint:** Sprint 6
**FR:** FR48

**As a** manager
**I want to** see item performance metrics
**So that** I can optimize my menu

**Acceptance Criteria:**
- [ ] Item performance report with metrics:
  - Units sold (count)
  - Revenue generated
  - Contribution margin (if cost data available)
  - Popularity ranking
- [ ] Filter by date range
- [ ] Sort by any metric
- [ ] Menu engineering matrix (high/low popularity × high/low profit)
- [ ] Identify: Stars, Plowhorses, Puzzles, Dogs
- [ ] Recommendations (promote, reprice, remove)
- [ ] Export report

**API Endpoints:**
- `analytics.getItemPerformance` (query)

**UI Components:**
- ItemPerformanceTable
- MenuEngineeringMatrix (quadrant chart)
- PerformanceFilters

**Menu Engineering Quadrants:**
```
High Profit ─────────────────────────
│ Puzzles │  Stars   │
│ (promote)│ (maintain)│
├─────────┼──────────┤
│  Dogs   │Plowhorses│
│ (remove)│ (monitor)│
Low Profit ─────────────────────────
   Low         High
   Popularity
```

**Definition of Done:**
- Performance metrics display
- Matrix visualization works
- Recommendations helpful
- Export functional

---

## EPIC 6: Kitchen Display System

**Epic ID:** E6
**Priority:** P1 - High
**Sprint:** Sprint 7
**Estimated Effort:** 2 weeks
**FR Count:** 8 (FR55-FR62)

### Epic Description
Implement the Kitchen Display System (KDS) that receives orders in real-time, allows kitchen staff to manage order flow, and communicates status back to servers. Critical for operational efficiency.

### Success Criteria
- Kitchen receives orders immediately
- Orders can be marked at different stages
- Allergies and special instructions highlighted
- Station filtering works
- Timing alerts functional
- Communication with servers enabled

### Related FRs
FR55-FR62

---

### Story E6.1: Kitchen Display Layout & Order Queue

**Story ID:** E6.1
**Type:** Feature
**Priority:** P0
**Effort:** 8 points
**Sprint:** Sprint 7
**FR:** FR55, FR56

**As a** kitchen staff member
**I want to** see incoming orders on a display
**So that** I know what to prepare

**Acceptance Criteria:**
- [ ] Kitchen display view (`/dashboard/kitchen`)
- [ ] Full-screen layout optimized for glanceable viewing
- [ ] Order cards in queue (FIFO order)
- [ ] Each card shows:
  - Order number
  - Table/customer name
  - Items with quantities
  - Time since order placed (elapsed timer)
  - Special instructions
  - Order type icon (dine-in, takeout, delivery)
- [ ] Color coding by urgency (green < 10min, yellow 10-20min, red > 20min)
- [ ] Auto-refresh (Socket.io real-time updates)
- [ ] Large text readable from distance

**API Endpoints:**
- `kitchen.getOrderQueue` (query)
- Socket.io: `kitchen:new-order`, `kitchen:order-update`

**UI Components:**
- KitchenDisplay (layout)
- OrderQueue
- OrderCard
- ElapsedTimer

**Definition of Done:**
- Orders display in real-time
- Queue updates automatically
- Layout readable from 10 feet away
- Timers accurate

---

### Story E6.2: Order Status Management (Bump System)

**Story ID:** E6.2
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 7
**FR:** FR57

**As a** kitchen staff member
**I want to** update order status as I work
**So that** servers know when food is ready

**Acceptance Criteria:**
- [ ] Three status stages: Received → Preparing → Ready
- [ ] Tap order card to advance status
- [ ] "Bump" button to mark entire order complete (removes from display)
- [ ] Individual item status (mark items ready separately)
- [ ] Bump bar hardware support (optional, USB button)
- [ ] Confirmation prompt before bumping
- [ ] Bumped orders archived (not deleted)
- [ ] Server receives notification when order ready

**API Endpoints:**
- `kitchen.updateOrderStatus` (mutation)
- `kitchen.bumpOrder` (mutation)
- Socket.io: `order:status-changed`

**UI Components:**
- StatusBadge
- BumpButton
- ItemStatusCheckbox

**Status Flow:**
```
RECEIVED (white) → PREPARING (yellow) → READY (green) → BUMPED (archived)
```

**Definition of Done:**
- Status can be updated with tap
- Bump removes from display
- Servers notified
- Bump bar works if connected

---

### Story E6.3: Allergy & Special Instruction Highlighting

**Story ID:** E6.3
**Type:** Feature
**Priority:** P0
**Effort:** 3 points
**Sprint:** Sprint 7
**FR:** FR58

**As a** kitchen staff member
**I want** allergies and special instructions prominently displayed
**So that** I don't miss critical information

**Acceptance Criteria:**
- [ ] Allergy warnings in bold red with icon (⚠️)
- [ ] Common allergies auto-detected (peanut, gluten, dairy, shellfish, etc.)
- [ ] Special instructions in yellow highlight box
- [ ] Allergies appear at top of order card
- [ ] Audio/visual alert for allergy orders (optional)
- [ ] "Acknowledge Allergy" button (prevents accidental dismissal)

**UI Components:**
- AllergyBadge
- SpecialInstructionsBox
- AllergyAcknowledgementModal

**Business Rules:**
- Allergy orders cannot be bumped without acknowledgement
- Allergy list configurable per venue

**Definition of Done:**
- Allergies visually prominent
- Special instructions highlighted
- Acknowledgement required
- Audio alert works (optional)

---

### Story E6.4: Station-Based Order Filtering

**Story ID:** E6.4
**Type:** Feature
**Priority:** P1
**Effort:** 5 points
**Sprint:** Sprint 7
**FR:** FR59

**As a** kitchen staff member
**I want to** filter orders by my station
**So that** I only see relevant items

**Acceptance Criteria:**
- [ ] Station selector dropdown (Grill, Fryer, Salad, Expo, Bar, etc.)
- [ ] Menu items tagged with station during setup
- [ ] Filter displays only orders with items for selected station
- [ ] Show item count per station on order card
- [ ] "All Stations" view for expo/manager
- [ ] Multi-station selection (e.g., Grill + Fryer)
- [ ] Station filter persists per device

**API Endpoints:**
- `kitchen.filterByStation` (query parameter)
- `menu.assignItemStation` (mutation)

**UI Components:**
- StationFilter
- StationBadge

**Example:**
- Grill sees: Burger, Steak, Chicken
- Fryer sees: Fries, Wings, Onion Rings
- Salad sees: Caesar Salad, Side Salad

**Definition of Done:**
- Station filtering works
- Items properly tagged
- Filter persists
- Multi-select functional

---

### Story E6.5: Order Timing & Estimated Completion

**Story ID:** E6.5
**Type:** Feature
**Priority:** P1
**Effort:** 5 points
**Sprint:** Sprint 7
**FR:** FR60

**As a** kitchen manager
**I want to** see estimated completion times
**So that** I can manage kitchen flow

**Acceptance Criteria:**
- [ ] Display estimated completion time per order
- [ ] Calculation based on:
  - Item prep times (configured per item)
  - Current queue length
  - Historical average prep times
- [ ] Update estimates as orders progress
- [ ] Display average ticket time (all orders)
- [ ] Display longest waiting order
- [ ] Predictive alerts ("kitchen behind pace")

**API Endpoints:**
- `kitchen.getEstimatedTimes` (query)
- `menu.setItemPrepTime` (mutation)

**UI Components:**
- EstimatedTimeDisplay
- AverageTimeIndicator
- KitchenPaceAlert

**Business Logic:**
```typescript
estimateCompletionTime(order, queue) {
  const prepTime = order.items.reduce((sum, item) => 
    sum + item.prepTimeMinutes, 0
  );
  const queueDelay = queue.length * avgPrepTime;
  return currentTime + prepTime + queueDelay;
}
```

**Definition of Done:**
- Estimates display accurately
- Updates in real-time
- Alerts trigger correctly
- Historical data improves accuracy

---

### Story E6.6: Late Order Alerts

**Story ID:** E6.6
**Type:** Feature
**Priority:** P1
**Effort:** 3 points
**Sprint:** Sprint 7
**FR:** FR61

**As a** kitchen manager
**I want** alerts when orders are taking too long
**So that** I can address delays proactively

**Acceptance Criteria:**
- [ ] Set alert threshold per order type (e.g., 15min for dine-in, 20min for takeout)
- [ ] Visual alert on order card (pulsing red border)
- [ ] Audio alert (configurable, can be disabled)
- [ ] Desktop notification (if permissions granted)
- [ ] Manager dashboard shows late orders count
- [ ] Late order report (for performance tracking)

**API Endpoints:**
- `kitchen.getLateOrders` (query)
- `venue.setAlertThresholds` (mutation)

**UI Components:**
- LateOrderAlert
- AlertThresholdSettings

**Alert Levels:**
- Yellow warning: 80% of threshold
- Red alert: 100% of threshold
- Critical: 150% of threshold

**Definition of Done:**
- Alerts trigger at thresholds
- Visual and audio cues work
- Thresholds configurable
- Reports track late orders

---

### Story E6.7: Kitchen-to-Server Communication

**Story ID:** E6.7
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 7
**FR:** FR62

**As a** kitchen staff member
**I want to** communicate with servers about orders
**So that** we can resolve issues quickly

**Acceptance Criteria:**
- [ ] "Send Message" button on order card
- [ ] Quick messages: "Item delayed", "Ingredient substitution", "Need clarification"
- [ ] Custom message input
- [ ] Server receives notification (push + in-app)
- [ ] Server can reply
- [ ] Message thread attached to order
- [ ] Mark issue resolved
- [ ] Message history viewable

**API Endpoints:**
- `kitchen.sendMessageToServer` (mutation)
- `order.getMessages` (query)

**UI Components:**
- MessageButton
- QuickMessageSelector
- MessageThread
- NotificationBadge

**Common Messages:**
- "86'd this item - substitute OK?"
- "Need clarification on special instructions"
- "Extra 5 minutes on this order"

**Definition of Done:**
- Messages send to correct server
- Notifications received
- Thread displays correctly
- Quick messages fast to send

---

### Story E6.8: KDS Configuration & Display Settings

**Story ID:** E6.8
**Type:** Feature
**Priority:** P2
**Effort:** 3 points
**Sprint:** Sprint 7
**FR:** Supporting infrastructure

**As a** kitchen manager
**I want to** configure KDS display settings
**So that** it works best for my kitchen

**Acceptance Criteria:**
- [ ] Settings page for KDS (`/dashboard/kitchen/settings`)
- [ ] Configure:
  - Font size (small, medium, large, extra-large)
  - Color scheme (light, dark, high-contrast)
  - Order card size
  - Auto-bump time (optional, auto-clear after X minutes)
  - Station list
  - Alert thresholds
  - Audio alert on/off
- [ ] Test display button
- [ ] Save settings per device/station
- [ ] Default venue-wide settings

**API Endpoints:**
- `kitchen.getSettings` (query)
- `kitchen.updateSettings` (mutation)

**UI Components:**
- KDSSettingsForm
- PreviewDisplay

**Definition of Done:**
- All settings configurable
- Changes apply immediately
- Per-device settings work
- Defaults set appropriately

---

## EPIC 7: Trust & Reputation Engine

**Epic ID:** E7
**Priority:** P2 - Medium
**Sprint:** Sprint 8
**Estimated Effort:** 2 weeks
**FR Count:** 7 (FR23-FR29)

### Epic Description
Implement the trust scoring system that enables progressive friction reduction for repeat customers. This is a key innovation that allows trusted customers to experience reduced pre-authorization requirements and eventually "Just Walk Out" dining.

### Success Criteria
- Trust scores calculate based on behavior
- Customers progress through trust levels
- Trust transfers across venues (configurable)
- Pre-auth amounts adjust based on trust
- VIP nomination system works
- Negative events properly handled

### Related FRs
FR23-FR29

---

### Story E7.1: Trust Score Calculation Engine

**Story ID:** E7.1
**Type:** Feature
**Priority:** P0
**Effort:** 8 points
**Sprint:** Sprint 8
**FR:** FR23, FR24

**As a** system
**I want to** calculate customer trust scores based on behavior
**So that** we can offer reduced friction to good customers

**Acceptance Criteria:**
- [ ] Implement trust scoring algorithm in `lib/trust-calculator.ts`
- [ ] Track trust events:
  - Successful payment (+10 points)
  - Generous tip >20% (+5 points)
  - On-time payment (+2 points)
  - Walk-away recovered (-5 points)
  - Chargeback (-50 points)
  - Dispute (-25 points)
  - Account verified (+5 points)
- [ ] Calculate local score (per venue)
- [ ] Calculate network score (across all venues)
- [ ] Map score to trust level (0-4):
  - Level 0 (NEW): 0-10 points
  - Level 1 (FAMILIAR): 11-50 points
  - Level 2 (REGULAR): 51-150 points
  - Level 3 (TRUSTED): 151-300 points
  - Level 4 (VIP): Manual nomination
- [ ] Decay score over time (slight decrease for inactivity)
- [ ] Recalculate score after each transaction

**API Endpoints:**
- `trust.calculateScore` (mutation)
- `trust.getScore` (query)

**Implementation:**
```typescript
interface TrustCalculator {
  calculateScore(events: TrustEvent[]): number;
  determineLevel(score: number): TrustLevel;
  applyDecay(score: number, lastActivity: Date): number;
}
```

**Definition of Done:**
- Algorithm implemented and tested
- Scores calculate correctly
- Levels assigned properly
- Decay function works

---

### Story E7.2: Trust Level Progression & Display

**Story ID:** E7.2
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 8
**FR:** FR24, FR25

**As a** customer
**I want to** see my trust level and benefits
**So that** I understand the rewards of being a good customer

**Acceptance Criteria:**
- [ ] Trust level badge on customer profile
- [ ] Display current level (0-4) with label
- [ ] Show points toward next level
- [ ] Display benefits per level:
  - Level 0: Standard pre-auth
  - Level 1: Faster checkout
  - Level 2: Reduced pre-auth (50%)
  - Level 3: Minimal pre-auth (20%)
  - Level 4: No pre-auth (VIP)
- [ ] Progress bar showing advancement
- [ ] Celebration animation on level-up
- [ ] Email notification when leveling up
- [ ] Explain how to earn points

**API Endpoints:**
- `trust.getCustomerLevel` (query)
- `trust.getLevelBenefits` (query)

**UI Components:**
- TrustLevelBadge
- TrustProgressBar
- LevelUpAnimation
- BenefitsExplainer

**Definition of Done:**
- Trust level visible to customer
- Progress clearly shown
- Benefits explained
- Level-up celebrated

---

### Story E7.3: Pre-Auth Amount Adjustment Based on Trust

**Story ID:** E7.3
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 8
**FR:** FR25

**As a** system
**I want to** reduce pre-auth requirements for trusted customers
**So that** they experience less friction

**Acceptance Criteria:**
- [ ] Modify `tab.openWithExpressCheckout` to check trust level
- [ ] Adjust pre-auth amount based on level:
  - Level 0: 100% of configured amount
  - Level 1: 100% of configured amount
  - Level 2: 50% of configured amount
  - Level 3: 20% of configured amount
  - Level 4: $0 (no pre-auth)
- [ ] Display adjusted amount to server
- [ ] Display trust benefit to customer
- [ ] Server can override (requires manager approval)
- [ ] Log trust-based adjustments

**API Endpoints:**
- `trust.getPreAuthAmount` (query)

**Business Logic:**
```typescript
calculatePreAuthAmount(venue, customer) {
  const baseAmount = venue.preAuthAmountCents;
  const trustLevel = customer.trustLevel;
  
  const reductions = {
    0: 1.0,   // 100%
    1: 1.0,   // 100%
    2: 0.5,   // 50%
    3: 0.2,   // 20%
    4: 0.0    // 0%
  };
  
  return Math.ceil(baseAmount * reductions[trustLevel]);
}
```

**Definition of Done:**
- Pre-auth amounts adjust correctly
- Reductions apply at tab open
- Customer sees benefit
- Overrides require approval

---

### Story E7.4: Cross-Venue Trust Transfer

**Story ID:** E7.4
**Type:** Feature
**Priority:** P1
**Effort:** 8 points
**Sprint:** Sprint 8
**FR:** FR26, FR27

**As a** customer
**I want** my trust to transfer to new venues
**So that** I don't start over each time

**Acceptance Criteria:**
- [ ] Calculate network trust score (aggregate across venues)
- [ ] Venue configures trust inheritance rate (0-100%)
- [ ] Default: 50% of network trust transfers to new venue
- [ ] First visit at new venue: use networkScore * inheritanceRate
- [ ] Local score builds independently after first visit
- [ ] Display: "You're Level 2 at Joe's Pizza. Starting as Level 1 here based on your network reputation."
- [ ] Venue can opt-out of trust transfer (require fresh start)
- [ ] Trust transfer logged for transparency

**API Endpoints:**
- `trust.getNetworkScore` (query)
- `trust.calculateInheritedScore` (query)
- `venue.configureTrustInheritance` (mutation)

**Business Logic:**
```typescript
calculateInheritedTrust(customer, newVenue) {
  const networkScore = customer.networkTrustScore;
  const inheritanceRate = newVenue.trustInheritanceRate; // 0.0 - 1.0
  const inheritedScore = networkScore * inheritanceRate;
  
  return {
    initialLocalScore: inheritedScore,
    fromVenues: customer.topVenues // attribution
  };
}
```

**Definition of Done:**
- Network score calculates correctly
- Inheritance rate configurable
- Customer sees transfer explanation
- Local score independent after first visit

---

### Story E7.5: Trust Event Logging

**Story ID:** E7.5
**Type:** Feature
**Priority:** P1
**Effort:** 3 points
**Sprint:** Sprint 8
**FR:** FR28

**As a** system
**I want to** log all trust-affecting events
**So that** scores are auditable and explainable

**Acceptance Criteria:**
- [ ] Create TrustEvent table
- [ ] Log event on:
  - Successful payment
  - Generous tip
  - Walk-away (recovered or lost)
  - Chargeback
  - Dispute
  - Account verification
  - VIP nomination
- [ ] Store: event type, points change, timestamp, venueId, related transaction
- [ ] Customer can view their trust history
- [ ] Manager can view customer's trust events
- [ ] Events immutable (append-only log)

**API Endpoints:**
- `trust.logEvent` (mutation)
- `trust.getEventHistory` (query)

**UI Components:**
- TrustEventHistory
- EventTimeline

**Database Schema:**
```prisma
model TrustEvent {
  id, customerId, venueId
  eventType (enum)
  pointsChange (int)
  relatedTransactionId
  metadata (json)
  createdAt
}
```

**Definition of Done:**
- All events logged
- History viewable
- Events immutable
- Audit trail complete

---

### Story E7.6: Negative Event Handling (Chargebacks, Disputes)

**Story ID:** E7.6
**Type:** Feature
**Priority:** P1
**Effort:** 5 points
**Sprint:** Sprint 8
**FR:** FR28

**As a** system
**I want to** handle negative trust events appropriately
**So that** bad actors are identified and penalized

**Acceptance Criteria:**
- [ ] Detect chargeback via Stripe webhook
- [ ] Log chargeback as trust event (-50 points)
- [ ] Email customer: "We noticed a chargeback. Please contact us."
- [ ] Flag account for review
- [ ] Manager can review and contest
- [ ] If resolved in venue's favor, restore points
- [ ] Detect dispute (customer claims incorrect charge)
- [ ] Log dispute as trust event (-25 points)
- [ ] Multiple negative events = auto-ban from Express Checkout
- [ ] Ban requires 3+ chargebacks or 5+ walk-aways

**API Endpoints:**
- `trust.handleChargeback` (mutation)
- `trust.handleDispute` (mutation)
- `trust.reviewNegativeEvent` (mutation)
- `/api/webhooks/stripe` (POST, handles chargeback events)

**Webhook Handling:**
```typescript
handleStripeWebhook(event) {
  if (event.type === 'charge.dispute.created') {
    logTrustEvent({
      type: 'CHARGEBACK',
      pointsChange: -50,
      customerId: getCustomerFromCharge(event)
    });
  }
}
```

**Definition of Done:**
- Chargebacks detected automatically
- Points deducted
- Customer notified
- Manager can review
- Auto-ban threshold works

---

### Story E7.7: VIP Nomination System

**Story ID:** E7.7
**Type:** Feature
**Priority:** P2
**Effort:** 3 points
**Sprint:** Sprint 8
**FR:** FR29

**As a** venue owner or manager
**I want to** nominate customers for VIP status
**So that** my best customers get premium treatment

**Acceptance Criteria:**
- [ ] "Nominate VIP" action on customer profile
- [ ] Require reason for nomination
- [ ] Owner/Manager approval required
- [ ] VIP status grants Level 4 benefits immediately
- [ ] VIP badge on customer profile
- [ ] VIP list page showing all venue VIPs
- [ ] Option to revoke VIP status
- [ ] VIP-only special: "Just Walk Out" (no payment interaction)
- [ ] Notify customer of VIP status

**API Endpoints:**
- `trust.nominateVIP` (mutation, requires manager role)
- `trust.listVIPs` (query)
- `trust.revokeVIP` (mutation)

**UI Components:**
- NominateVIPButton
- VIPBadge
- VIPList

**Business Rules:**
- VIP status is venue-specific (not network-wide)
- VIP cannot be auto-generated by score alone
- Revoked VIPs return to their calculated level

**Definition of Done:**
- Managers can nominate VIPs
- VIP status grants Level 4 benefits
- VIP list displays correctly
- Revocation works

---

## EPIC 8: Table & Floor Management

**Epic ID:** E8
**Priority:** P2 - Medium
**Sprint:** Sprint 9
**Estimated Effort:** 2 weeks
**FR Count:** 6 (FR49-FR54)

### Epic Description
Implement table and floor plan management for efficient seating, server assignment, and occupancy tracking. This enables hosts and managers to optimize table turns and server workload.

### Success Criteria
- Floor plans can be created and configured
- Table status updates in real-time
- Hosts can seat parties efficiently
- Table metrics tracked
- Server transfers work
- Table combining supported

### Related FRs
FR49-FR54

---

### Story E8.1: Floor Plan Configuration

**Story ID:** E8.1
**Type:** Feature
**Priority:** P1
**Effort:** 8 points
**Sprint:** Sprint 9
**FR:** FR49

**As a** manager
**I want to** configure my venue's floor plan
**So that** hosts know table locations and capacities

**Acceptance Criteria:**
- [ ] Floor plan editor (`/dashboard/tables/floor-plan`)
- [ ] Drag-and-drop table placement on canvas
- [ ] Table shapes: round, square, rectangle
- [ ] Set table properties:
  - Table number/name
  - Capacity (number of seats)
  - Section (for server assignment)
  - Type (booth, high-top, patio, bar)
- [ ] Multiple floor plan layouts (indoor, outdoor, event)
- [ ] Save and activate floor plans
- [ ] Print floor plan for staff reference

**API Endpoints:**
- `table.createFloorPlan` (mutation)
- `table.updateFloorPlan` (mutation)
- `table.addTable` (mutation)

**UI Components:**
- FloorPlanEditor (canvas-based)
- TablePropertiesForm
- FloorPlanSelector

**Technical Notes:**
- Use HTML5 Canvas or SVG for floor plan
- Store table coordinates and dimensions
- Support zoom and pan

**Definition of Done:**
- Floor plan can be created
- Tables draggable and configurable
- Multiple layouts supported
- Floor plan displays correctly

---

### Story E8.2: Real-Time Table Status Display

**Story ID:** E8.2
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 9
**FR:** FR50, FR51

**As a** host
**I want to** see real-time table status
**So that** I can seat guests efficiently

**Acceptance Criteria:**
- [ ] Table management view (`/dashboard/tables`)
- [ ] Display floor plan with color-coded tables:
  - Green: Available
  - Yellow: Occupied
  - Red: Reserved
  - Grey: Dirty (needs cleaning)
  - Blue: Server assigned
- [ ] Table status updates in real-time (Socket.io)
- [ ] Show party size at occupied tables
- [ ] Show time since seated (elapsed)
- [ ] Show assigned server
- [ ] Click table to view details
- [ ] Quick actions: Seat party, Clear table, Reserve

**API Endpoints:**
- `table.getStatus` (query)
- `table.seatParty` (mutation)
- Socket.io: `table:status-changed`

**UI Components:**
- FloorPlanViewer
- TableStatusIndicator
- TableDetailsModal

**Definition of Done:**
- Table status displays accurately
- Real-time updates work
- Color coding clear
- Quick actions functional

---

### Story E8.3: Seating Parties

**Story ID:** E8.3
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 9
**FR:** FR51

**As a** host
**I want to** seat parties at tables
**So that** I can manage restaurant flow

**Acceptance Criteria:**
- [ ] Click available table to seat party
- [ ] Prompt for party size
- [ ] Prompt for customer name (optional)
- [ ] Assign server (auto-assign by section or manual)
- [ ] Mark table as occupied
- [ ] Start table timer
- [ ] Send notification to assigned server
- [ ] Link table to new or existing tab
- [ ] Handle walk-ins and reservations differently

**API Endpoints:**
- `table.seatParty` (mutation)
- `table.assignServer` (mutation)

**UI Components:**
- SeatPartyModal
- PartySizeSelector
- ServerAssignmentDropdown

**Business Logic:**
```typescript
seatParty(table, partySize, serverId?) {
  // 1. Check table capacity
  if (partySize > table.capacity) {
    throw new Error('Party too large for table');
  }
  
  // 2. Auto-assign server if not specified
  if (!serverId) {
    serverId = getNextServerInRotation(table.section);
  }
  
  // 3. Update table status
  table.status = 'OCCUPIED';
  table.seatedAt = new Date();
  table.partySize = partySize;
  table.serverId = serverId;
  
  // 4. Notify server
  notifyServer(serverId, table);
}
```

**Definition of Done:**
- Parties can be seated
- Server assignment works
- Table status updates
- Notifications sent

---

### Story E8.4: Table Turn Time Tracking

**Story ID:** E8.4
**Type:** Feature
**Priority:** P2
**Effort:** 3 points
**Sprint:** Sprint 9
**FR:** FR52

**As a** manager
**I want to** track table turn times
**So that** I can optimize seating and identify bottlenecks

**Acceptance Criteria:**
- [ ] Record time party seated
- [ ] Record time party leaves (table cleared)
- [ ] Calculate turn time (duration)
- [ ] Display average turn time per table
- [ ] Display average turn time for venue
- [ ] Track turns per day per table
- [ ] Occupancy rate calculation (% of time occupied)
- [ ] Report showing: slowest/fastest tables, peak hours

**API Endpoints:**
- `table.getMetrics` (query)
- `analytics.getTableTurnReport` (query)

**UI Components:**
- TableMetricsWidget
- TurnTimeChart

**Metrics:**
```typescript
interface TableMetrics {
  avgTurnTimeMinutes: number;
  turnsToday: number;
  occupancyRate: number; // 0.0 - 1.0
  revenuePerTurn: number;
}
```

**Definition of Done:**
- Turn times recorded
- Averages calculated
- Occupancy tracked
- Report displays correctly

---

### Story E8.5: Server Table Transfers

**Story ID:** E8.5
**Type:** Feature
**Priority:** P2
**Effort:** 3 points
**Sprint:** Sprint 9
**FR:** FR53

**As a** manager or server
**I want to** transfer tables between servers
**So that** we can balance workload

**Acceptance Criteria:**
- [ ] "Transfer Table" action on table details
- [ ] Select new server from dropdown
- [ ] Confirm transfer
- [ ] Update table assignment
- [ ] Transfer open tab to new server
- [ ] Notify both servers (old and new)
- [ ] Log transfer for audit
- [ ] Manager approval required (configurable)

**API Endpoints:**
- `table.transferServer` (mutation)

**UI Components:**
- TransferTableModal
- ServerSelector

**Business Rules:**
- Transfer inherits open tab
- Tips on tab remain with new server
- Original server notified of transfer

**Definition of Done:**
- Tables can be transferred
- Tab ownership updates
- Both servers notified
- Audit logged

---

### Story E8.6: Table Combining for Large Parties

**Story ID:** E8.6
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 9
**FR:** FR54

**As a** host
**I want to** combine tables for large parties
**So that** I can accommodate groups

**Acceptance Criteria:**
- [ ] "Combine Tables" action
- [ ] Select multiple adjacent tables
- [ ] Create combined table group
- [ ] Combined group shows as single entity
- [ ] Total capacity = sum of individual tables
- [ ] Assign single server to combined group
- [ ] Split tables back to individuals when party leaves
- [ ] Visual indicator of combined tables

**API Endpoints:**
- `table.combine` (mutation)
- `table.split` (mutation)

**UI Components:**
- CombineTablesModal
- CombinedTableIndicator

**Business Logic:**
```typescript
combineTables(tableIds) {
  // 1. Verify all tables available
  // 2. Create table group
  // 3. Mark individual tables as part of group
  // 4. Calculate combined capacity
  // 5. Return group ID
}
```

**Definition of Done:**
- Tables can be combined
- Combined capacity correct
- Visual indicator clear
- Tables can be split back

---

## EPIC 9: Customer Communication

**Epic ID:** E9
**Priority:** P2 - Medium
**Sprint:** Sprint 10
**Estimated Effort:** 2 weeks
**FR Count:** 6 (FR63-FR68)

### Epic Description
Implement automated customer communication system for SMS and email notifications throughout the customer journey. This includes Express Checkout confirmations, receipts, feedback requests, and marketing communications.

### Success Criteria
- SMS notifications send reliably
- Email templates professional and branded
- Customers can opt in/out
- Feedback system functional
- Marketing communications compliant

### Related FRs
FR63-FR68

---

### Story E9.1: SMS Notification Infrastructure

**Story ID:** E9.1
**Type:** Technical Task
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 10
**FR:** FR63, FR65

**As a** developer
**I want to** integrate Twilio for SMS sending
**So that** we can send automated notifications

**Acceptance Criteria:**
- [ ] Set up Twilio account and phone number
- [ ] Configure Twilio SDK in project
- [ ] Create SMS service wrapper (`lib/sms.ts`)
- [ ] Implement rate limiting (prevent spam)
- [ ] Handle delivery failures and retries
- [ ] Support two-way messaging (receive replies)
- [ ] Log all SMS sends for audit
- [ ] Test in development with Twilio sandbox

**API Endpoints:**
- `notification.sendSMS` (mutation)
- `/api/webhooks/twilio` (POST, receives replies)

**Technical Implementation:**
```typescript
interface SMSService {
  send(params: {
    to: string;
    message: string;
    type: NotificationType;
  }): Promise<MessageSid>;
  
  handleIncomingMessage(body: string, from: string): Promise<void>;
}
```

**Definition of Done:**
- Twilio integrated
- SMS sends successfully
- Delivery tracking works
- Rate limiting active
- Webhook receives replies

---

### Story E9.2: Express Checkout SMS Confirmations

**Story ID:** E9.2
**Type:** Feature
**Priority:** P0
**Effort:** 3 points
**Sprint:** Sprint 10
**FR:** FR63

**As a** customer
**I want to** receive SMS confirmation when my tab is opened
**So that** I know Express Checkout is active

**Acceptance Criteria:**
- [ ] Send SMS immediately after tab opened
- [ ] Message template:
  ```
  Hi [Name]! Your tab at [Venue] is open. 
  View anytime: [URL]
  Leave when ready - no need to wait for the check!
  ```
- [ ] Include shortened URL to tab view
- [ ] Track SMS delivery status
- [ ] Retry once if delivery fails
- [ ] Only send if customer provided phone number
- [ ] Customer can opt-out of future SMS

**API Endpoints:**
- Triggered by `tab.openWithExpressCheckout`

**Message Template Variables:**
- customerName
- venueName
- tabViewUrl

**Definition of Done:**
- SMS sends on tab open
- Template renders correctly
- URL shortening works
- Opt-out respected

---

### Story E9.3: Receipt Delivery via SMS & Email

**Story ID:** E9.3
**Type:** Feature
**Priority:** P0
**Effort:** 5 points
**Sprint:** Sprint 10
**FR:** FR65

**As a** customer
**I want to** receive my receipt via SMS and email
**So that** I have a digital record

**Acceptance Criteria:**
- [ ] Send receipt after tab closed
- [ ] SMS message:
  ```
  Thanks for dining at [Venue]! 
  Your receipt: [URL]
  Total: $[Amount]
  ```
- [ ] Email includes:
  - Subject: "Receipt from [Venue]"
  - Branded HTML template
  - Itemized receipt
  - PDF attachment
  - Link to view online
- [ ] Prefer email if both provided
- [ ] Fallback to SMS only if no email
- [ ] Track open rates (email)

**API Endpoints:**
- `receipt.send` (mutation)

**Email Template:**
- Header with venue logo
- Thank you message
- Itemized list
- Payment method (last 4 digits)
- Footer with venue info

**Definition of Done:**
- Receipt sends via both channels
- Email template branded
- PDF attachment works
- SMS fallback functional

---

### Story E9.4: Feedback Request System

**Story ID:** E9.4
**Type:** Feature
**Priority:** P1
**Effort:** 5 points
**Sprint:** Sprint 10
**FR:** FR66, FR68

**As a** venue owner
**I want to** request feedback from customers post-visit
**So that** I can improve service

**Acceptance Criteria:**
- [ ] Send feedback request 2 hours after visit
- [ ] SMS/Email with short survey link
- [ ] Survey questions:
  - Overall rating (1-5 stars)
  - Food quality (1-5 stars)
  - Service quality (1-5 stars)
  - Express Checkout experience (1-5 stars)
  - Open comment (optional)
- [ ] One-click response (tap star rating, no login)
- [ ] Thank you page after submission
- [ ] Aggregate feedback in analytics
- [ ] Alert manager for ratings < 3 stars
- [ ] Customer can skip/opt-out

**API Endpoints:**
- `feedback.request` (mutation)
- `feedback.submit` (public mutation)
- `feedback.getSummary` (query)

**UI Components:**
- FeedbackSurvey (public page)
- StarRating
- FeedbackDashboard

**Definition of Done:**
- Feedback requests send
- Survey easy to complete
- Responses recorded
- Manager alerts work

---

### Story E9.5: Marketing Communications & Opt-In

**Story ID:** E9.5
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 10
**FR:** FR67

**As a** venue owner
**I want to** send marketing messages to opted-in customers
**So that** I can promote specials and drive repeat visits

**Acceptance Criteria:**
- [ ] Customer opt-in during account creation
- [ ] Explicit consent required (TCPA compliance)
- [ ] Opt-in separately for SMS and email
- [ ] Unsubscribe link in all marketing emails
- [ ] "STOP" keyword support for SMS
- [ ] Venue can create marketing campaigns
- [ ] Campaign types: Special offer, Event announcement, New menu item
- [ ] Schedule campaigns for future delivery
- [ ] Segment customers (e.g., VIPs only, frequent diners)
- [ ] Track campaign performance (open rate, click rate)

**API Endpoints:**
- `marketing.createCampaign` (mutation)
- `marketing.sendCampaign` (mutation)
- `customer.updateMarketingPreferences` (mutation)

**UI Components:**
- CampaignComposer
- AudienceSelector
- CampaignScheduler
- UnsubscribePage

**Compliance:**
- TCPA (Telephone Consumer Protection Act)
- CAN-SPAM Act
- GDPR (for EU customers)

**Definition of Done:**
- Opt-in flow works
- Campaigns can be created
- Segmentation functional
- Unsubscribe works
- Compliance requirements met

---

### Story E9.6: Notification Preferences Management

**Story ID:** E9.6
**Type:** Feature
**Priority:** P1
**Effort:** 3 points
**Sprint:** Sprint 10
**FR:** Supporting infrastructure

**As a** customer
**I want to** manage my notification preferences
**So that** I control what messages I receive

**Acceptance Criteria:**
- [ ] Notification preferences page (`/customer/preferences`)
- [ ] Toggle options:
  - Express Checkout confirmations (SMS/Email)
  - Receipts (SMS/Email)
  - Feedback requests (SMS/Email)
  - Marketing messages (SMS/Email)
  - Loyalty updates (SMS/Email)
- [ ] Save preferences
- [ ] Preferences apply across all venues
- [ ] Unsubscribe from all (global opt-out)
- [ ] Re-subscribe option
- [ ] Log preference changes for audit

**API Endpoints:**
- `customer.getNotificationPreferences` (query)
- `customer.updateNotificationPreferences` (mutation)

**UI Components:**
- NotificationPreferencesForm
- ToggleSwitch

**Business Rules:**
- Transactional messages (receipts) cannot be fully disabled
- Marketing messages can be fully disabled
- Preferences honored within 24 hours

**Definition of Done:**
- Preferences page accessible
- Toggles save correctly
- Preferences respected
- Global opt-out works

---

## EPIC 10: Analytics & Reporting

**Epic ID:** E10
**Priority:** P3 - Low
**Sprint:** Sprint 11
**Estimated Effort:** 2 weeks
**FR Count:** 7 (FR80-FR86)

### Epic Description
Build comprehensive analytics and reporting capabilities for venue owners and managers to track performance, identify trends, and make data-driven decisions. This includes dashboards, custom reports, and multi-venue comparisons.

### Success Criteria
- Real-time dashboard displays key metrics
- Historical reports accessible
- Express Checkout metrics tracked
- Labor cost analysis available
- Menu engineering insights provided
- Multi-venue comparison works

### Related FRs
FR80-FR86

---

### Story E10.1: Real-Time Dashboard

**Story ID:** E10.1
**Type:** Feature
**Priority:** P1
**Effort:** 8 points
**Sprint:** Sprint 11
**FR:** FR80

**As a** manager
**I want to** see real-time key metrics on a dashboard
**So that** I can monitor performance at a glance

**Acceptance Criteria:**
- [ ] Dashboard page (`/dashboard/overview`)
- [ ] Key metrics widgets:
  - Today's revenue (vs. yesterday, vs. last week)
  - Open tabs count
  - Average check size
  - Orders in kitchen (current)
  - Table occupancy rate
  - Staff on duty
  - Top-selling items today
  - Express Checkout adoption rate
- [ ] Auto-refresh every 30 seconds
- [ ] Visual indicators: ↑ positive, ↓ negative
- [ ] Date range selector (today, week, month, custom)
- [ ] Export dashboard as PDF
- [ ] Mobile-responsive layout

**API Endpoints:**
- `analytics.getDashboardMetrics` (query)

**UI Components:**
- DashboardLayout
- MetricWidget
- TrendIndicator
- TimeRangeSelector

**Metrics Calculations:**
```typescript
interface DashboardMetrics {
  revenue: {
    today: number;
    change: number; // % vs yesterday
  };
  openTabs: number;
  avgCheckSize: number;
  kitchenOrders: number;
  occupancyRate: number;
  expressCheckoutRate: number;
}
```

**Definition of Done:**
- Dashboard displays all metrics
- Auto-refresh works
- Trends calculated correctly
- Mobile responsive

---

### Story E10.2: Historical Sales Reports

**Story ID:** E10.2
**Type:** Feature
**Priority:** P1
**Effort:** 5 points
**Sprint:** Sprint 11
**FR:** FR81

**As a** manager
**I want to** generate historical sales reports
**So that** I can analyze trends over time

**Acceptance Criteria:**
- [ ] Reports page (`/dashboard/reports`)
- [ ] Report types:
  - Daily sales summary
  - Weekly sales summary
  - Monthly sales summary
  - Custom date range
- [ ] Metrics included:
  - Gross revenue
  - Net revenue (after discounts/voids)
  - Transaction count
  - Average transaction size
  - Payment method breakdown
  - Tax collected
  - Tips collected
  - Refunds/voids
- [ ] Visualizations: line charts, bar charts, pie charts
- [ ] Compare periods (this month vs last month)
- [ ] Export as CSV, PDF, Excel
- [ ] Schedule automatic reports (daily email)

**API Endpoints:**
- `analytics.getSalesReport` (query)
- `analytics.scheduleReport` (mutation)

**UI Components:**
- ReportGenerator
- DateRangePicker
- SalesChart (Chart.js or Recharts)
- ExportButtons

**Definition of Done:**
- Reports generate with all data
- Visualizations render
- Export works
- Scheduled reports send

---

### Story E10.3: Express Checkout Analytics

**Story ID:** E10.3
**Type:** Feature
**Priority:** P1
**Effort:** 5 points
**Sprint:** Sprint 11
**FR:** FR82, FR83

**As a** venue owner
**I want to** track Express Checkout performance
**So that** I understand the feature's impact

**Acceptance Criteria:**
- [ ] Express Checkout dashboard section
- [ ] Metrics:
  - Adoption rate (% of tabs using Express Checkout)
  - Customer self-close rate
  - Average close time (with Express vs without)
  - Walk-away recovery amount
  - Walk-away incidents (count)
  - Pre-auth success rate
  - Customer satisfaction rating (from feedback)
- [ ] Trend charts over time
- [ ] Comparison: Express Checkout tabs vs traditional tabs
- [ ] Financial impact: time saved, revenue protected
- [ ] Customer retention rate (return visitors)

**API Endpoints:**
- `analytics.getExpressCheckoutStats` (query)

**UI Components:**
- ExpressCheckoutDashboard
- AdoptionChart
- RecoveryMetrics

**Key Insights:**
- "Express Checkout saved $5,432 in walk-aways this month"
- "Average close time reduced from 8min to 2min"
- "70% adoption rate (target: 70%+)"

**Definition of Done:**
- All metrics display
- Charts visualize trends
- Financial impact clear
- Insights actionable

---

### Story E10.4: Labor Cost Analysis

**Story ID:** E10.4
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 11
**FR:** FR84

**As a** manager
**I want to** analyze labor costs
**So that** I can optimize scheduling

**Acceptance Criteria:**
- [ ] Labor report with metrics:
  - Total labor cost (by period)
  - Labor as % of revenue
  - Hours worked per employee
  - Overtime hours
  - Sales per labor hour
  - Cost per employee role
- [ ] Compare scheduled vs actual hours
- [ ] Identify overstaffing/understaffing periods
- [ ] Forecast labor needs based on historical data
- [ ] Optimal labor % recommendation (typically 25-35%)
- [ ] Alert when labor % exceeds threshold

**API Endpoints:**
- `analytics.getLaborCostReport` (query)

**UI Components:**
- LaborCostDashboard
- LaborChart
- StaffingRecommendations

**Calculations:**
```typescript
laborCostPercentage = (totalLaborCost / totalRevenue) * 100;
salesPerLaborHour = totalRevenue / totalLaborHours;
```

**Definition of Done:**
- Labor costs tracked
- Percentages calculated
- Recommendations provided
- Alerts trigger correctly

---

### Story E10.5: Menu Engineering Report

**Story ID:** E10.5
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 11
**FR:** FR85

**As a** manager
**I want to** analyze menu item profitability
**So that** I can optimize my menu

**Acceptance Criteria:**
- [ ] Menu engineering report page
- [ ] Four quadrant analysis:
  - **Stars:** High profit, High popularity (promote)
  - **Plowhorses:** Low profit, High popularity (increase price or reduce cost)
  - **Puzzles:** High profit, Low popularity (promote or improve)
  - **Dogs:** Low profit, Low popularity (remove or revise)
- [ ] Metrics per item:
  - Units sold
  - Revenue
  - Cost (if tracked)
  - Contribution margin
  - Popularity rank
- [ ] Recommendations for each item
- [ ] Simulate price changes (what-if analysis)
- [ ] Identify underperforming items

**API Endpoints:**
- `analytics.getMenuEngineeringReport` (query)

**UI Components:**
- MenuEngineeringMatrix
- ItemPerformanceTable
- PriceSimulator

**Classification Logic:**
```typescript
classifyItem(item, avgProfit, avgPopularity) {
  const isHighProfit = item.profit >= avgProfit;
  const isHighPopularity = item.salesCount >= avgPopularity;
  
  if (isHighProfit && isHighPopularity) return 'STAR';
  if (!isHighProfit && isHighPopularity) return 'PLOWHORSE';
  if (isHighProfit && !isHighPopularity) return 'PUZZLE';
  return 'DOG';
}
```

**Definition of Done:**
- Matrix displays correctly
- Items classified accurately
- Recommendations actionable
- What-if analysis works

---

### Story E10.6: Multi-Venue Performance Comparison

**Story ID:** E10.6
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 11
**FR:** FR86

**As a** multi-venue operator
**I want to** compare performance across my venues
**So that** I can identify best practices and issues

**Acceptance Criteria:**
- [ ] Multi-venue dashboard (`/dashboard/multi-venue`)
- [ ] Comparison metrics:
  - Revenue by venue
  - Average check size
  - Table turn time
  - Express Checkout adoption
  - Customer satisfaction scores
  - Labor cost percentage
- [ ] Side-by-side comparison table
- [ ] Rankings (best to worst)
- [ ] Benchmarking against network averages
- [ ] Identify outliers (high/low performers)
- [ ] Drill down into individual venue

**API Endpoints:**
- `analytics.getMultiVenueComparison` (query)

**UI Components:**
- MultiVenueComparison
- VenueRankingTable
- BenchmarkChart

**Access Control:**
- Only accessible to users with multiple venue access
- Requires Owner or Corporate role

**Definition of Done:**
- Comparison displays all venues
- Rankings accurate
- Benchmarks calculated
- Drill-down works

---

### Story E10.7: Custom Report Builder

**Story ID:** E10.7
**Type:** Feature
**Priority:** P3
**Effort:** 8 points
**Sprint:** Sprint 11
**FR:** Supporting infrastructure

**As a** manager
**I want to** create custom reports
**So that** I can analyze specific metrics

**Acceptance Criteria:**
- [ ] Report builder interface
- [ ] Select data source (sales, orders, items, customers, etc.)
- [ ] Choose metrics to include
- [ ] Apply filters (date range, categories, etc.)
- [ ] Choose visualization (table, chart, graph)
- [ ] Group by dimensions (day, category, server, etc.)
- [ ] Save custom reports for reuse
- [ ] Share reports with team
- [ ] Schedule automatic generation

**API Endpoints:**
- `analytics.createCustomReport` (mutation)
- `analytics.runCustomReport` (query)
- `analytics.saveReport` (mutation)

**UI Components:**
- ReportBuilder (drag-drop interface)
- MetricSelector
- FilterBuilder
- VisualizationPicker

**Definition of Done:**
- Reports can be built
- All data sources accessible
- Visualizations render
- Reports saveable/shareable

---

## EPIC 11: Reservation System

**Epic ID:** E11
**Priority:** P3 - Low (Growth Feature)
**Sprint:** Sprint 12
**Estimated Effort:** 2 weeks
**FR Count:** 6 (FR69-FR74)

### Epic Description
Implement online reservation system with no-show protection, waitlist management, and automated reminders. This enables venues to optimize seating and reduce no-shows while providing convenient booking for customers.

### Success Criteria
- Customers can book reservations online
- Card held for no-show policy
- Hosts can manage reservations
- Automated reminders sent
- Wait time predictions accurate
- No-show penalties enforced

### Related FRs
FR69-FR74

---

### Story E11.1: Online Reservation Booking

**Story ID:** E11.1
**Type:** Feature
**Priority:** P2
**Effort:** 8 points
**Sprint:** Sprint 12
**FR:** FR69

**As a** customer
**I want to** make a reservation online
**So that** I can secure a table in advance

**Acceptance Criteria:**
- [ ] Public reservation page (`/reserve/[venueSlug]`)
- [ ] Reservation form:
  - Date picker
  - Time selector (available slots only)
  - Party size
  - Customer name, phone, email
  - Special requests (optional)
- [ ] Check real-time table availability
- [ ] Display available time slots
- [ ] Suggest alternative times if requested slot unavailable
- [ ] Confirmation page with reservation details
- [ ] Add to calendar (iCal/Google Calendar)
- [ ] Customer receives confirmation email/SMS
- [ ] No login required for booking

**API Endpoints:**
- `reservation.getAvailability` (public query)
- `reservation.create` (public mutation)

**UI Components:**
- ReservationForm
- AvailabilityCalendar
- TimeSlotPicker
- ConfirmationPage

**Business Logic:**
```typescript
getAvailableSlots(date, partySize) {
  // Consider:
  // - Venue hours
  // - Existing reservations
  // - Table capacity
  // - Average turn time
  // - Buffer between reservations (15min)
  
  return availableSlots;
}
```

**Definition of Done:**
- Reservations can be made online
- Availability accurate
- Confirmations sent
- Calendar export works

---

### Story E11.2: No-Show Protection (Card Hold)

**Story ID:** E11.2
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 12
**FR:** FR70, FR74

**As a** venue owner
**I want to** hold a card for reservations
**So that** I can reduce no-shows

**Acceptance Criteria:**
- [ ] Collect payment method during reservation
- [ ] Hold card (pre-authorization, not charged)
- [ ] Display no-show policy clearly:
  - "A $25 per person fee will be charged if you don't show or cancel within 2 hours"
- [ ] Customer must accept policy to complete reservation
- [ ] If customer shows up, release hold
- [ ] If customer no-shows, charge fee automatically
- [ ] Send notification before charging
- [ ] Customer can dispute charge
- [ ] Configurable no-show fee per venue
- [ ] Configurable cancellation window

**API Endpoints:**
- `reservation.holdCard` (mutation)
- `reservation.chargeNoShow` (mutation)
- `reservation.releaseHold` (mutation)

**UI Components:**
- NoShowPolicyDisplay
- CardCollectionForm (Stripe Elements)

**No-Show Flow:**
1. Reservation time passes + grace period (15min)
2. Check if customer checked in → No
3. Send "You missed your reservation" notification
4. Wait 1 hour
5. Charge no-show fee
6. Send receipt

**Definition of Done:**
- Card held during reservation
- No-show policy displayed
- Fees charged automatically
- Disputes handled

---

### Story E11.3: Reservation Management for Hosts

**Story ID:** E11.3
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 12
**FR:** FR71

**As a** host
**I want to** manage reservations and waitlist
**So that** I can coordinate seating efficiently

**Acceptance Criteria:**
- [ ] Reservation management page (`/dashboard/reservations`)
- [ ] List view of today's reservations (chronological)
- [ ] Calendar view of upcoming reservations
- [ ] Status indicators: Confirmed, Arrived, Seated, No-Show, Cancelled
- [ ] Mark customer as arrived
- [ ] Seat reservation (assign table)
- [ ] Modify reservation (time, party size)
- [ ] Cancel reservation
- [ ] Add walk-in to waitlist
- [ ] Call ahead seating (reserve for soon arrival)
- [ ] Notes field for special requests

**API Endpoints:**
- `reservation.list` (query)
- `reservation.updateStatus` (mutation)
- `reservation.modify` (mutation)
- `reservation.cancel` (mutation)

**UI Components:**
- ReservationList
- ReservationCalendar
- StatusBadge
- QuickActions

**Definition of Done:**
- Hosts can view all reservations
- Status updates work
- Modifications save correctly
- Notes accessible

---

### Story E11.4: Automated Reservation Reminders

**Story ID:** E11.4
**Type:** Feature
**Priority:** P2
**Effort:** 3 points
**Sprint:** Sprint 12
**FR:** FR72

**As a** venue owner
**I want** customers to receive reservation reminders
**So that** no-shows are reduced

**Acceptance Criteria:**
- [ ] Send confirmation immediately after booking
- [ ] Send reminder 24 hours before reservation
- [ ] Send reminder 2 hours before reservation
- [ ] SMS and/or Email (based on customer preference)
- [ ] Reminder includes:
  - Venue name, date, time
  - Party size
  - Cancellation link
  - "Reply CONFIRM to confirm"
- [ ] Track confirmation responses
- [ ] Configurable reminder schedule per venue

**API Endpoints:**
- Worker: `reservation-reminder-worker.ts`

**Message Templates:**
```
24hr reminder:
"Hi [Name]! Reminder: You have a reservation tomorrow at [Venue] for [Party Size] at [Time]. Reply CONFIRM or cancel here: [Link]"

2hr reminder:
"Your table at [Venue] is ready in 2 hours ([Time]). See you soon! Cancel: [Link]"
```

**Definition of Done:**
- Reminders send at correct times
- Templates render correctly
- Customers can confirm
- Cancellation links work

---

### Story E11.5: Wait Time Prediction

**Story ID:** E11.5
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 12
**FR:** FR73

**As a** host
**I want** accurate wait time predictions
**So that** I can set customer expectations

**Acceptance Criteria:**
- [ ] Calculate predicted wait time based on:
  - Current occupancy
  - Average turn time (by time of day)
  - Party size
  - Upcoming reservations
- [ ] Display wait time on waitlist
- [ ] Update wait time as parties seated
- [ ] SMS customers when table ready (optional)
- [ ] Historical accuracy tracking
- [ ] Improve predictions over time (ML optional)

**API Endpoints:**
- `reservation.getPredictedWait` (query)

**UI Components:**
- WaitTimeDisplay
- WaitlistQueue

**Prediction Algorithm:**
```typescript
predictWaitTime(partySize, currentOccupancy, avgTurnTime) {
  const suitableTables = getTablesForPartySize(partySize);
  const nextAvailable = suitableTables
    .map(t => t.seatedAt + avgTurnTime)
    .sort()[0];
  
  return Math.max(0, nextAvailable - Date.now());
}
```

**Definition of Done:**
- Wait times calculated
- Updates in real-time
- SMS notifications work
- Predictions reasonably accurate

---

### Story E11.6: Waitlist Management

**Story ID:** E11.6
**Type:** Feature
**Priority:** P2
**Effort:** 3 points
**Sprint:** Sprint 12
**FR:** FR71

**As a** host
**I want to** manage a waitlist
**So that** walk-ins can wait for tables

**Acceptance Criteria:**
- [ ] Add party to waitlist (name, phone, party size)
- [ ] Display waitlist with estimated wait times
- [ ] Drag-and-drop to reorder (priority management)
- [ ] Mark party as ready (table available)
- [ ] SMS notification to customer "Your table is ready!"
- [ ] Customer has 10 minutes to respond
- [ ] If no response, mark as no-show and move to next
- [ ] Remove from waitlist when seated
- [ ] Waitlist history

**API Endpoints:**
- `waitlist.add` (mutation)
- `waitlist.get` (query)
- `waitlist.notify` (mutation)
- `waitlist.remove` (mutation)

**UI Components:**
- WaitlistQueue
- AddToWaitlistModal
- NotifyButton

**Definition of Done:**
- Waitlist functional
- SMS notifications send
- Reordering works
- No-show handling automatic

---

## EPIC 12: Loyalty Program

**Epic ID:** E12
**Priority:** P3 - Low (Growth Feature)
**Sprint:** Sprint 13
**Estimated Effort:** 2 weeks
**FR Count:** 5 (FR75-FR79)

### Epic Description
Implement a points-based loyalty program to drive repeat visits and increase customer lifetime value. Customers earn points on purchases and can redeem for rewards defined by the venue.

### Success Criteria
- Customers earn points on spending
- Multiple loyalty tiers supported
- Points redeemable for rewards
- Venues can customize rewards
- ROI tracked

### Related FRs
FR75-FR79

---

### Story E12.1: Points Earning System

**Story ID:** E12.1
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 13
**FR:** FR75, FR76

**As a** customer
**I want to** earn points on my purchases
**So that** I can redeem for rewards

**Acceptance Criteria:**
- [ ] Automatically award points after payment
- [ ] Default: 1 point per dollar spent (configurable)
- [ ] Bonus points on first visit (e.g., +50 points)
- [ ] Bonus points on birthday (if known)
- [ ] Display points earned on receipt
- [ ] Display total points balance on customer profile
- [ ] Points post 24 hours after visit (prevent fraud)
- [ ] Points never expire (or long expiry, e.g., 12 months)

**API Endpoints:**
- `loyalty.awardPoints` (mutation)
- `loyalty.getBalance` (query)

**UI Components:**
- PointsBalance
- PointsEarnedNotification

**Business Logic:**
```typescript
awardPoints(transaction) {
  const basePoints = Math.floor(transaction.totalCents / 100);
  let points = basePoints;
  
  // Apply tier multiplier
  if (customer.loyaltyTier === 'GOLD') points *= 1.5;
  if (customer.loyaltyTier === 'PLATINUM') points *= 2.0;
  
  // Bonus for birthday month
  if (isBirthdayMonth(customer)) points += 50;
  
  return points;
}
```

**Definition of Done:**
- Points awarded automatically
- Balance displays correctly
- Bonuses apply
- Tier multipliers work

---

### Story E12.2: Loyalty Tiers

**Story ID:** E12.2
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 13
**FR:** FR76

**As a** venue owner
**I want** multiple loyalty tiers
**So that** I can reward my best customers

**Acceptance Criteria:**
- [ ] Three default tiers: Silver, Gold, Platinum
- [ ] Tier thresholds based on:
  - Total points earned (lifetime)
  - OR Total spend (lifetime)
  - OR Number of visits
- [ ] Default thresholds:
  - Silver: 0-500 points
  - Gold: 501-1500 points (1.5x points multiplier)
  - Platinum: 1501+ points (2x points multiplier)
- [ ] Tier benefits configurable per venue
- [ ] Display tier status on customer profile
- [ ] Tier badge in POS (server sees customer tier)
- [ ] Automatic tier upgrade
- [ ] Celebration message on tier change
- [ ] Tier-specific perks (e.g., free dessert on birthday)

**API Endpoints:**
- `loyalty.getTiers` (query)
- `loyalty.configureTiers` (mutation)
- `loyalty.getCustomerTier` (query)

**UI Components:**
- TierBadge
- TierProgressBar
- TierBenefitsDisplay

**Definition of Done:**
- Tiers configurable
- Automatic upgrades work
- Tier displays correctly
- Benefits apply

---

### Story E12.3: Rewards Catalog & Redemption

**Story ID:** E12.3
**Type:** Feature
**Priority:** P2
**Effort:** 8 points
**Sprint:** Sprint 13
**FR:** FR77, FR78

**As a** customer
**I want to** redeem points for rewards
**So that** I benefit from my loyalty

**Acceptance Criteria:**
- [ ] Rewards catalog page (`/customer/rewards`)
- [ ] Venue creates rewards:
  - Name (e.g., "Free Appetizer")
  - Description
  - Points cost (e.g., 500 points)
  - Image
  - Terms/restrictions
  - Available quantity (limited offers)
- [ ] Customer browses rewards
- [ ] "Redeem" button (requires sufficient points)
- [ ] Confirmation: "Spend 500 points for Free Appetizer?"
- [ ] Generate redemption code (QR or numeric)
- [ ] Server validates and applies redemption at POS
- [ ] Points deducted after redemption
- [ ] Redemption history tracked

**API Endpoints:**
- `loyalty.listRewards` (query)
- `loyalty.createReward` (mutation)
- `loyalty.redeemReward` (mutation)
- `loyalty.validateRedemption` (query)

**UI Components:**
- RewardsCatalog
- RewardCard
- RedeemButton
- RedemptionCodeDisplay

**Definition of Done:**
- Rewards catalog displays
- Redemption flow works
- Codes validate at POS
- Points deducted correctly

---

### Story E12.4: Venue Loyalty Configuration

**Story ID:** E12.4
**Type:** Feature
**Priority:** P2
**Effort:** 3 points
**Sprint:** Sprint 13
**FR:** FR78

**As a** venue owner
**I want to** configure my loyalty program
**So that** it aligns with my business goals

**Acceptance Criteria:**
- [ ] Loyalty settings page (`/dashboard/settings/loyalty`)
- [ ] Enable/disable loyalty program
- [ ] Configure points per dollar
- [ ] Set tier thresholds
- [ ] Create/edit/delete rewards
- [ ] Set reward availability (quantity, date range)
- [ ] Bonus points campaigns (e.g., double points weekends)
- [ ] Exclude certain items from earning points (alcohol, gift cards)
- [ ] Branding: program name, colors

**API Endpoints:**
- `loyalty.getSettings` (query)
- `loyalty.updateSettings` (mutation)

**UI Components:**
- LoyaltySettingsForm
- RewardEditor
- CampaignBuilder

**Definition of Done:**
- Settings fully configurable
- Changes apply immediately
- Exclusions respected
- Campaigns work

---

### Story E12.5: Loyalty Program ROI Tracking

**Story ID:** E12.5
**Type:** Feature
**Priority:** P2
**Effort:** 3 points
**Sprint:** Sprint 13
**FR:** FR79

**As a** venue owner
**I want to** track loyalty program ROI
**So that** I know if it's effective

**Acceptance Criteria:**
- [ ] Loyalty analytics dashboard
- [ ] Metrics:
  - Total members enrolled
  - Active members (visited in last 30 days)
  - Average visit frequency (members vs non-members)
  - Points issued (total)
  - Points redeemed (total)
  - Points liability (unredeemed points × cost)
  - Incremental revenue from loyalty members
  - ROI calculation
- [ ] Member vs non-member comparison
- [ ] Tier distribution (% in each tier)
- [ ] Most popular rewards
- [ ] Trend charts

**API Endpoints:**
- `analytics.getLoyaltyROI` (query)

**UI Components:**
- LoyaltyDashboard
- ROICalculator
- MemberComparison

**ROI Calculation:**
```typescript
loyaltyROI = (incrementalRevenue - programCost) / programCost;

// Incremental revenue = 
// (avg member spending * visit frequency increase) - 
// redemption costs
```

**Definition of Done:**
- All metrics display
- ROI calculated accurately
- Comparisons insightful
- Trends visualized

---

## EPIC 13: Inventory Management

**Epic ID:** E13
**Priority:** P3 - Low (Growth Feature)
**Sprint:** Sprint 14
**Estimated Effort:** 2 weeks
**FR Count:** 4 (FR87-FR90)

### Epic Description
Implement basic inventory tracking to monitor stock levels, prevent waste, and automate reordering. This helps venues optimize purchasing and reduce food costs.

### Success Criteria
- Inventory levels tracked in real-time
- Par level alerts functional
- Waste tracking implemented
- Purchase orders generated automatically

### Related FRs
FR87-FR90

---

### Story E13.1: Inventory Item Setup & Tracking

**Story ID:** E13.1
**Type:** Feature
**Priority:** P2
**Effort:** 8 points
**Sprint:** Sprint 14
**FR:** FR87

**As a** manager
**I want to** track inventory levels
**So that** I know what's in stock

**Acceptance Criteria:**
- [ ] Inventory management page (`/dashboard/inventory`)
- [ ] Create inventory items:
  - Name, SKU
  - Unit of measure (lb, oz, count, case)
  - Category (protein, produce, dairy, dry goods, etc.)
  - Current quantity
  - Par level (minimum stock)
  - Unit cost
  - Supplier
- [ ] Deduct inventory automatically when orders sold (if recipe linked)
- [ ] Manual adjustments (receive inventory, count adjustments)
- [ ] Inventory count worksheet (for physical counts)
- [ ] Current stock value calculation
- [ ] Low stock alerts

**API Endpoints:**
- `inventory.listItems` (query)
- `inventory.createItem` (mutation)
- `inventory.adjust` (mutation)
- `inventory.getStockValue` (query)

**UI Components:**
- InventoryList
- InventoryItemForm
- StockAdjustmentModal
- LowStockAlert

**Definition of Done:**
- Inventory items created
- Levels tracked
- Adjustments save
- Stock value calculated

---

### Story E13.2: Par Level Alerts

**Story ID:** E13.2
**Type:** Feature
**Priority:** P2
**Effort:** 3 points
**Sprint:** Sprint 14
**FR:** FR88

**As a** manager
**I want** alerts when inventory is low
**So that** I can reorder before running out

**Acceptance Criteria:**
- [ ] Set par level (minimum quantity) per item
- [ ] Daily check: current stock vs par level
- [ ] Generate alert if below par
- [ ] Alert displays on dashboard
- [ ] Email/SMS notification to manager
- [ ] Alert includes: item name, current stock, par level, suggested order quantity
- [ ] Mark alert as resolved
- [ ] Alert history

**API Endpoints:**
- `inventory.getLowStockAlerts` (query)
- Worker: `inventory-alert-worker.ts` (daily cron)

**UI Components:**
- LowStockAlerts
- AlertBadge

**Business Logic:**
```typescript
checkParLevels() {
  const lowStockItems = inventory.filter(item => 
    item.currentQuantity <= item.parLevel
  );
  
  lowStockItems.forEach(item => {
    const orderQuantity = item.parLevel * 2 - item.currentQuantity;
    sendAlert({
      item,
      currentStock: item.currentQuantity,
      parLevel: item.parLevel,
      suggestedOrder: orderQuantity
    });
  });
}
```

**Definition of Done:**
- Par levels configurable
- Alerts generated daily
- Notifications sent
- Suggested quantities helpful

---

### Story E13.3: Waste Tracking

**Story ID:** E13.3
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 14
**FR:** FR89

**As a** manager
**I want to** track waste and spoilage
**So that** I can reduce food costs

**Acceptance Criteria:**
- [ ] "Log Waste" action on inventory list
- [ ] Waste entry form:
  - Item
  - Quantity wasted
  - Reason (expired, damaged, overproduction, dropped, etc.)
  - Date
  - Staff member (who logged it)
- [ ] Calculate waste cost (quantity × unit cost)
- [ ] Waste report:
  - Total waste cost (by period)
  - Waste by category
  - Waste by reason
  - Top wasted items
  - Waste as % of total inventory
- [ ] Identify patterns (which items waste most?)
- [ ] Recommendations to reduce waste

**API Endpoints:**
- `inventory.logWaste` (mutation)
- `inventory.getWasteReport` (query)

**UI Components:**
- LogWasteModal
- WasteReport
- WasteTrendChart

**Definition of Done:**
- Waste can be logged
- Costs calculated
- Report insightful
- Patterns identifiable

---

### Story E13.4: Suggested Purchase Orders

**Story ID:** E13.4
**Type:** Feature
**Priority:** P2
**Effort:** 5 points
**Sprint:** Sprint 14
**FR:** FR90

**As a** manager
**I want** automatic purchase order suggestions
**So that** ordering is easier

**Acceptance Criteria:**
- [ ] "Generate PO" button on inventory page
- [ ] System suggests items to order based on:
  - Current stock below par level
  - Historical usage rates
  - Upcoming events/reservations
  - Lead time per supplier
- [ ] Suggested order quantity: bring to par + buffer
- [ ] Group items by supplier
- [ ] Manager can edit quantities
- [ ] Generate PO document (PDF)
- [ ] Email PO to supplier
- [ ] Track PO status (sent, received, partial)
- [ ] Receive inventory updates stock levels

**API Endpoints:**
- `inventory.generatePurchaseOrder` (mutation)
- `inventory.sendPO` (mutation)
- `inventory.receivePO` (mutation)

**UI Components:**
- GeneratePOModal
- POEditor
- SupplierGrouping
- POStatusTracker

**Definition of Done:**
- POs generated automatically
- Suggestions accurate
- Editing functional
- PDF generation works
- Receiving updates stock

---

## EPIC 14: Integrations & Administration

**Epic ID:** E14
**Priority:** P3 - Low
**Sprint:** Sprint 15
**Estimated Effort:** 2 weeks
**FR Count:** 4 (FR91-FR98)

### Epic Description
Implement platform integrations with external services and build admin tools for platform management. This includes payment processors, accounting software, APIs for developers, and administrative oversight.

### Success Criteria
- Stripe integration complete
- Accounting exports functional
- Public API documented
- Platform admin tools operational
- Audit logs accessible
- Data export available

### Related FRs
FR91-FR98

---

### Story E14.1: Multi-Payment Processor Support

**Story ID:** E14.1
**Type:** Feature
**Priority:** P2
**Effort:** 8 points
**Sprint:** Sprint 15
**FR:** FR91

**As a** venue owner
**I want** flexibility in payment processors
**So that** I can choose the best option for my business

**Acceptance Criteria:**
- [ ] Support Stripe Connect (primary)
- [ ] Architecture supports adding Square, Adyen later
- [ ] Payment processor abstraction layer
- [ ] Venue selects processor during onboarding
- [ ] Configuration per processor (API keys, etc.)
- [ ] Unified payment interface regardless of processor
- [ ] Processor-specific features handled gracefully
- [ ] Switching processors preserves transaction history

**API Endpoints:**
- `payment.listProcessors` (query)
- `venue.selectProcessor` (mutation)
- `payment.process` (mutation, processor-agnostic)

**Technical Implementation:**
```typescript
interface PaymentProcessor {
  name: string;
  createPreAuth(params): Promise<PreAuth>;
  capturePreAuth(id, amount): Promise<Capture>;
  refund(transactionId, amount): Promise<Refund>;
}

class StripeProcessor implements PaymentProcessor { /* ... */ }
class SquareProcessor implements PaymentProcessor { /* ... */ }
```

**Definition of Done:**
- Abstraction layer implemented
- Stripe fully integrated
- Architecture supports adding processors
- Venue can select processor

---

### Story E14.2: Accounting Software Integration

**Story ID:** E14.2
**Type:** Feature
**Priority:** P2
**Effort:** 8 points
**Sprint:** Sprint 15
**FR:** FR92

**As a** venue owner
**I want** sales data to sync with my accounting software
**So that** I don't do manual data entry

**Acceptance Criteria:**
- [ ] Integration with QuickBooks Online
- [ ] Integration with Xero
- [ ] OAuth connection flow for both
- [ ] Daily sync of sales data
- [ ] Create invoices/sales receipts
- [ ] Sync customers (optional)
- [ ] Sync payment methods
- [ ] Map GL accounts (revenue, taxes, tips)
- [ ] Manual sync trigger
- [ ] Sync status display (last sync, errors)
- [ ] Fallback: CSV export for manual import

**API Endpoints:**
- `integration.connectQuickBooks` (mutation)
- `integration.connectXero` (mutation)
- `integration.syncSales` (mutation)
- `integration.getSyncStatus` (query)

**UI Components:**
- IntegrationSettings
- OAuthConnectionButton
- SyncStatusDisplay
- GLAccountMapper

**Definition of Done:**
- Both integrations functional
- OAuth flows work
- Sales sync accurately
- Errors handled gracefully
- CSV export available

---

### Story E14.3: Developer API & Documentation

**Story ID:** E14.3
**Type:** Feature
**Priority:** P2
**Effort:** 8 points
**Sprint:** Sprint 15
**FR:** FR93, FR94

**As a** developer (third-party)
**I want** API access to Crowdiant
**So that** I can build integrations

**Acceptance Criteria:**
- [ ] Public REST API (in addition to tRPC)
- [ ] API key authentication
- [ ] Rate limiting (1000 req/hour per key)
- [ ] Webhook subscriptions:
  - order.created
  - order.completed
  - tab.closed
  - reservation.created
  - customer.created
- [ ] OpenAPI 3.0 specification
- [ ] Interactive API documentation (Swagger UI)
- [ ] Code examples (curl, JavaScript, Python)
- [ ] Developer portal for key management
- [ ] Sandbox environment for testing
- [ ] Versioning (v1, v2, etc.)

**API Endpoints:**
- `/api/v1/*` (public REST API)
- `/api/webhooks/subscribe` (POST)
- `/docs/api` (documentation)

**Documentation Sections:**
- Authentication
- Endpoints reference
- Webhooks
- Rate limits
- Error codes
- Changelog

**Definition of Done:**
- REST API functional
- Docs published
- Webhooks work
- Developer portal live
- Sandbox available

---

### Story E14.4: Platform Administration Tools

**Story ID:** E14.4
**Type:** Feature
**Priority:** P1
**Effort:** 8 points
**Sprint:** Sprint 15
**FR:** FR95, FR96, FR97, FR98

**As a** platform administrator
**I want** tools to manage the platform
**So that** I can support venues and maintain quality

**Acceptance Criteria:**
- [ ] Admin dashboard (`/admin`)
- [ ] Access restricted to platform admin role
- [ ] Features:
  - View all venues
  - View venue details
  - Impersonate venue (for support)
  - System-wide analytics
  - Monitor system health
  - View error logs
  - Manage user accounts
  - Feature flags (enable/disable features per venue)
- [ ] Audit logs viewer:
  - All financial transactions
  - User actions
  - System events
  - Filterable and searchable
- [ ] Data export tool:
  - Export venue data (GDPR compliance)
  - Format: JSON, CSV
  - Includes all customer data
- [ ] Support ticket system (basic)

**API Endpoints:**
- `admin.listVenues` (query)
- `admin.getSystemMetrics` (query)
- `admin.getAuditLogs` (query)
- `admin.exportVenueData` (mutation)
- `admin.impersonateVenue` (mutation)

**UI Components:**
- AdminDashboard
- VenueListAdmin
- AuditLogViewer
- SystemHealthMonitor
- DataExportTool

**Security:**
- Two-factor authentication required
- All admin actions logged
- IP whitelisting (optional)
- Session timeout (15 minutes)

**Definition of Done:**
- Admin dashboard functional
- All venues viewable
- Impersonation works
- Audit logs accessible
- Data export works
- Security measures active

---

## Implementation Summary

**Total Breakdown:**
- **14 Epics** covering all 98 functional requirements
- **98 User Stories** with detailed acceptance criteria
- **Sprints 0-15:** 16 two-week sprints (32 weeks total for MVP + Growth features)

**Priority Distribution:**
- **P0 (Critical):** 25 stories - Foundation, Core features
- **P1 (High):** 38 stories - Essential features
- **P2 (Medium):** 28 stories - Important but not blocking
- **P3 (Low):** 7 stories - Nice-to-have, polish

**MVP Scope (Sprints 0-7):**
- Epic 1: Foundation
- Epic 2: User & Venue Management
- Epic 3: Express Checkout
- Epic 4: Point of Sale
- Epic 5: Menu Management
- Epic 6: Kitchen Display
- Epic 7: Trust & Reputation
- Epic 8: Table Management

**Growth Features (Sprints 10-15):**
- Epic 9: Customer Communication
- Epic 10: Analytics
- Epic 11: Reservations
- Epic 12: Loyalty
- Epic 13: Inventory
- Epic 14: Integrations & Admin

---

## Next Steps

1. **Review & Prioritize:** Review all stories with stakeholders
2. **Refine Estimates:** Conduct planning poker for effort estimates
3. **Sprint Planning:** Break down Sprint 0 stories into tasks
4. **Technical Spike:** Prototype Express Checkout flow before Sprint 2
5. **Design Sprint:** Create mockups for key user flows
6. **Dependency Mapping:** Identify cross-epic dependencies
7. **Resource Planning:** Assign developers to epics
8. **Definition of Done:** Establish team-wide DoD criteria

---

_Generated by BMAD Product Development Workflow v1.0_
_Date: 2025-11-25_
_For: Bradley - Crowdiant Restaurant OS_



This completes Epics 5-8 (30 additional stories). Would you like me to continue with the final 6 epics (E9-E14)?

---

### Epic: Walk-Away Recovery & Auto-Close (Enhancement)

**Epic Goal:** Eliminate unpaid walk-away losses (target: $0) by reliably detecting probable walk-aways, warning the guest, recovering payment automatically, and capturing trust impact + metrics.

**Related FRs:** FR17 (auto-close on walk-away), FR18 (pre-close SMS warning), FR83 (walk-away recovery metrics). Builds on Express Checkout epic; extends detection sophistication and operational tooling.

**Scope In:** Detection worker, configurable thresholds, SMS warning & WAIT reply handling, auto-close job, trust event logging, metrics & admin overrides.
**Scope Out:** Advanced machine learning prediction (future), cross-venue behavioral correlation, POS hardware integration.

**KPIs:**
- Walk-away unpaid tabs per week = 0
- Warning SMS response rate ≥ 30%
- False positive rate (tabs flagged but guest active) < 5%
- Average auto-close latency (grace period adherence) ±1 minute

**Risks & Mitigations:**
- False positives → multi-signal strategy + WAIT reply cancel path
- Payment capture failures → idempotent capture & retry queue
- SMS deliverability issues → fallback email + in-app notification
- Customer dissatisfaction → clear messaging with immediate reversal path via staff

---

#### Story W1: Walk-Away Detection Foundations

**As a** system operator
**I want to** automatically detect likely walk-away tabs
**So that** the platform can intervene before revenue is lost.

**Dependencies:** Existing Tab schema, TabEvent (CHECK_REQUESTED), venue config field `walkAwayGraceMinutes`.

**Acceptance Criteria:**
1. Worker runs every 5 minutes (cron / scheduler) and logs start + completion.
2. Only evaluates OPEN tabs older than configurable minimum age (default 30m).
3. Signals collected: lastActivityMinutes (item add or tab open), averageVisitDuration (30-day moving average), checkRequested flag, tableCleared flag.
4. Threshold parameters (grace, cleared minutes, check-requested minutes, avgDurationFactor) load from venue config with sensible defaults.
5. Detection triggers when any strategy condition met; status transitions OPEN → WALK_AWAY atomically (single update, no race conditions).
6. WALK_AWAY transition enqueues auto-close job with correct delay (configurable, default 15m) and unique jobId to allow cancellation.
7. Metrics counters increment: `walkaway_detected_total` and gauge for current WALK_AWAY tabs.
8. Socket event `walkaway.detected` sent to manager channel with tab id & reason code.
9. Average visit duration calculation excludes durations > 4h and tabs without closedAt.
10. Unit tests cover: inactivity threshold, table cleared path, check requested path, duration exceed path.
11. Env/config validation fails fast if queue or SMS provider not configured (clear error log).
12. Idempotency: re-running worker while status already WALK_AWAY does not duplicate job scheduling.

**API / Internal Interfaces:**
- (Internal) `WalkAwayDetector.checkOpenTabs()`
- (Optional admin) `admin.forceWalkAwayCheck` mutation triggers immediate run.

**Events Emitted:**
- `walkaway.detected`
- `walkaway.autoclose.scheduled`

**Definition of Done:** All acceptance criteria satisfied; test suite green; documentation of config keys added; metrics visible in dashboard.

---

#### Story W2: Auto-Close & Recovery Flow

**As a** system
**I want to** finalize payment safely if guest does not return after warning
**So that** venue revenue is preserved and trust signals recorded.

**Dependencies:** Story W1 complete; Stripe payment intent in tab; SMS sending capability.

**Acceptance Criteria:**
1. Warning SMS sent immediately upon WALK_AWAY detection if phone present; template includes amount, grace period, cancel keyword (WAIT) and secure link.
2. Receiving WAIT reply (simulated via webhook) cancels auto-close job and reverts status WALK_AWAY → OPEN (or PENDING if staff review step chosen) within <10s.
3. Auto-close job only captures payment if tab still in WALK_AWAY; if status changed, job exits gracefully (logs skip event).
4. Final charge amount excludes tip (tipCents set to 0) and updates status to AUTO_CLOSED with closedAt timestamp.
5. Trust event logged: WALK_AWAY_RECOVERED with -5 points (configurable). If WAIT reply received and guest returns, apply neutral or light penalty (configurable) or none.
6. Receipt generated and sent (SMS/email) with clear note “Auto-Closed after absence”.
7. Manager notification (socket + optional email) on both detection and completion.
8. Metrics recorded: `walkaway_autoclosed_total`, `walkaway_wait_cancel_total`, average grace adherence (difference between scheduled and actual close time).
9. Stripe capture errors retried (max 3) with exponential backoff; permanent failure sets status WALK_AWAY_PAYMENT_FAILED and alerts manager.
10. Idempotent auto-close: repeated job processing for same tab does not duplicate payment or events.
11. Admin override mutation `tabs.overrideWalkAwayStatus` can set status back to OPEN and cancels queued job.
12. Cancellation endpoint logs audit entry with actor, reason, timestamp.

**API / Mutations:**
- `tabs.cancelAutoClose` (tabId) – cancels job if pending.
- `tabs.overrideWalkAwayStatus` (tabId, status, reason) – admin/manager only.
- `admin.listWalkAwayTabs` – returns current WALK_AWAY + AUTO_CLOSED (today).

**Events Emitted:**
- `walkaway.warning.sent`
- `walkaway.status.updated`
- `walkaway.autoclosed`
- `walkaway.payment.failed`

**Security:**
- Manager/Admin roles required for override & cancel.
- Rate limit overrides (e.g., max 10/hour) to prevent abuse.

**Telemetry:**
- Structured log with correlationId for detection→warning→autoclose chain.
- Trace spans: detect, sendSMS, scheduleJob, capturePayment, sendReceipt.

**Definition of Done:** All acceptance criteria met; manual QA scenario passes (simulate WALK_AWAY, WAIT response, auto-close); monitoring dashboards updated.

---

_Enhancement epic added after original planning summary; counts will be updated in next backlog refresh._


