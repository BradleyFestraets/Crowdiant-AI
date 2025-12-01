# Epic Technical Specification: Express Checkout System

Date: 2025-12-01
Author: Bradley
Epic ID: 3
Status: Active

---

## Overview

Epic 3 implements the signature Express Checkout feature that allows card pre-authorization at tab opening, enabling customers to "leave when ready" without waiting for the check. This is the primary differentiator for Crowdiant Restaurant OS and includes tab management, self-close capabilities, and walk-away detection.

This epic builds upon the multi-tenant foundation (Epic 1-2) and introduces Stripe Connect integration for marketplace payments, enabling venues to receive payments through the platform with pre-authorization support.

## Objectives and Scope

### In Scope
- Stripe Connect integration for venue payment processing
- Pre-authorization (card hold) flow at tab opening
- Real-time tab view for customers via QR code/link
- Customer self-close with tip adjustment
- Server tab management and closing
- Walk-away detection and auto-close
- Tab access token and QR code generation
- Digital receipt generation and delivery
- Pre-authorization amount calculation logic
- Pre-auth excess handling
- Tab state machine implementation
- Express Checkout analytics dashboard

### Out of Scope
- Full POS terminal (Epic 4)
- Menu management (Epic 5)
- Kitchen Display System (Epic 6)
- Trust & Reputation Engine (Epic 7)
- Advanced reservation integration (Epic 11)

## System Architecture Alignment

This epic aligns with the architecture document's payment integration design:

### Integration Points
- **Payment:** Stripe Connect Express accounts for venue onboarding
- **Real-time:** Socket.io for tab updates to customer view
- **SMS:** Twilio for tab confirmation and auto-close warnings
- **Database:** PostgreSQL with tabs, tab_items, preauthorizations tables

### Key Architecture Decisions
| Decision | Rationale |
|----------|-----------|
| Stripe Connect Express | Simplified onboarding, managed payouts, marketplace model |
| Pre-auth with manual capture | 7-day hold, capture actual amount, release excess |
| Webhook-driven status updates | Reliable async processing, retry support |
| Access tokens for customer view | No auth required, secure single-use URLs |

## Detailed Design

### Services and Modules

| Module | Responsibility | Location |
|--------|---------------|----------|
| Stripe Client | SDK initialization, singleton pattern | `src/lib/stripe/client.ts` |
| Stripe Config | API version, pre-auth defaults, webhook events | `src/lib/stripe/config.ts` |
| Connect Service | Account creation, onboarding, status checks | `src/lib/stripe/connect.ts` |
| Webhook Handlers | Process Stripe events, update venue/tab status | `src/lib/stripe/webhooks.ts` |
| Stripe Router | tRPC procedures for Stripe operations | `src/server/api/routers/stripe.ts` |
| Tab Router | Tab CRUD, customer view, state transitions | `src/server/api/routers/tab.ts` (Story 3.2+) |

### Data Models and Contracts

**Venue (Extended)**
```prisma
model Venue {
  stripeAccountId    String?  @unique
  stripeOnboarded    Boolean  @default(false)
  preAuthAmountCents Int      @default(5000)  // $50 default
  walkAwayGraceMinutes Int    @default(10)
}
```

**Tab (Story 3.2+)**
```prisma
model Tab {
  id                String   @id @default(cuid())
  venueId           String
  accessToken       String   @unique
  tableNumber       String?
  customerPhone     String?
  customerEmail     String?
  status            TabStatus
  preAuthAmountCents Int
  paymentIntentId   String?
  tipAmountCents    Int      @default(0)
  openedAt          DateTime @default(now())
  closedAt          DateTime?
  closedBy          TabCloseType?
}

enum TabStatus {
  PENDING_AUTH
  OPEN
  CLOSING
  CLOSED
  VOIDED
  DISPUTED
}

enum TabCloseType {
  CUSTOMER_SELF_CLOSE
  SERVER_CLOSE
  WALK_AWAY_AUTO_CLOSE
  VOID
}
```

### APIs and Interfaces

**Story 3.1 - Stripe Connect Router**

| Procedure | Type | Input | Output |
|-----------|------|-------|--------|
| `stripe.startOnboarding` | mutation | `{ venueId }` | `{ onboardingUrl, accountId }` |
| `stripe.getStatus` | query | `{ venueId }` | `{ hasAccount, isOnboarded, status, ... }` |
| `stripe.getOnboardingLink` | mutation | `{ venueId }` | `{ onboardingUrl }` |
| `stripe.getDashboardLink` | mutation | `{ venueId }` | `{ dashboardUrl }` |
| `stripe.updatePreAuthSettings` | mutation | `{ venueId, preAuthAmountCents }` | `{ success, preAuthAmountCents }` |
| `stripe.createPreAuth` | mutation | `{ venueId, amountCents, ... }` | `{ paymentIntentId, clientSecret }` |
| `stripe.capturePreAuth` | mutation | `{ venueId, paymentIntentId, ... }` | `{ amountCaptured, status }` |
| `stripe.cancelPreAuth` | mutation | `{ venueId, paymentIntentId, ... }` | `{ status }` |

**Webhook Endpoint:** `POST /api/webhooks/stripe`

Handled Events:
- `account.updated` - Update venue onboarding status
- `account.application.authorized` - Log authorization
- `account.application.deauthorized` - Disable payments
- `payment_intent.succeeded` - Mark tab paid
- `payment_intent.payment_failed` - Alert staff
- `payment_intent.canceled` - Release pre-auth
- `payment_intent.requires_action` - 3DS handling
- `charge.dispute.created` - Flag tab, alert owner
- `payout.failed` - Alert owner to update bank

### Workflows and Sequencing

**Stripe Onboarding Flow**
```
1. Owner clicks "Connect Stripe" in venue settings
2. System creates Stripe Connect Express account
3. System stores stripeAccountId with stripeOnboarded: false
4. System generates AccountLink and redirects owner
5. Owner completes Stripe onboarding form
6. Stripe sends account.updated webhook
7. System updates stripeOnboarded: true
8. Express Checkout enabled for venue
```

**Pre-Authorization Flow (Story 3.2+)**
```
1. Server opens tab with customer card
2. System creates PaymentIntent with capture_method: 'manual'
3. Pre-auth amount held on card (default $50)
4. Tab opens with status OPEN
5. Items added to tab in real-time
6. Customer/server closes tab
7. System captures final amount (tab total + tip)
8. Excess pre-auth released automatically
9. Receipt delivered via SMS/email
```

## Non-Functional Requirements

### Performance

| Metric | Target | Rationale |
|--------|--------|-----------|
| Pre-auth creation | < 3 seconds | Customer waiting at table |
| Tab view load | < 1 second | Mobile on restaurant WiFi |
| Webhook processing | < 5 seconds | Stripe retry threshold |
| Real-time tab update | < 500ms | Perceived instant updates |

### Security

- PCI DSS compliance via Stripe Elements (no card data touches our servers)
- Webhook signature verification (STRIPE_WEBHOOK_SECRET)
- Access tokens: cuid() format, expire after tab close
- Rate limiting on public endpoints (10 req/min per IP)
- HTTPS only for all endpoints

### Reliability/Availability

- Stripe SDK retry: 3 attempts with exponential backoff
- Webhook retry: Stripe retries for 72 hours
- Graceful degradation: Manual payment entry fallback
- Pre-auth expiry: 7 days (Stripe default)

### Observability

- Structured logging with pino (venueId, tabId, paymentIntentId)
- Sentry error tracking for all Stripe operations
- Payment success rate metric (target: >98%)
- Webhook processing latency metric
- Alert on dispute creation (immediate)

## Dependencies and Integrations

### External Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `stripe` | ^20.0.0 | Stripe SDK for Node.js |

### Environment Variables
```
STRIPE_SECRET_KEY          # Server-side API key
STRIPE_WEBHOOK_SECRET      # Webhook signature verification
STRIPE_PUBLISHABLE_KEY     # Client-side (Stripe Elements)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  # Browser access
```

### Internal Dependencies
- Epic 1: Database schema (venues table)
- Epic 2: User authentication, venue access middleware
- Database: PostgreSQL with Prisma ORM

## Acceptance Criteria (Authoritative)

### Story 3.1: Stripe Connect Integration Setup
1. ✅ Stripe SDK installed and configured
2. ✅ Environment variables defined in env.js
3. ✅ Stripe client singleton with retry logic
4. ✅ Connect account creation for venues
5. ✅ AccountLink generation for onboarding
6. ✅ Account status retrieval and sync
7. ✅ Webhook endpoint receiving events
8. ✅ account.updated processing
9. ✅ Payment intent handlers (stub for Story 3.2+)
10. ✅ Dispute handlers (stub for Story 3.1+)
11. ✅ tRPC router with venue-protected procedures
12. ⬜ UI for payment settings page (optional)

### Story 3.2-3.13 (Subsequent)
- Tab opening with pre-auth
- Real-time customer tab view
- Item additions to open tabs
- Customer self-close
- Server close tab
- Walk-away detection
- QR code/access token generation
- Digital receipts
- Pre-auth amount calculation
- Pre-auth excess handling
- Tab state machine
- Analytics dashboard

## Traceability Mapping

| AC | Spec Section | Component(s) | Test Type |
|----|--------------|--------------|-----------|
| 3.1.1 | Dependencies | package.json | Unit |
| 3.1.2 | Dependencies | src/env.js | Config |
| 3.1.3 | Services | src/lib/stripe/client.ts | Unit |
| 3.1.4 | Connect Service | src/lib/stripe/connect.ts | Integration |
| 3.1.5 | Connect Service | createAccountLink() | Integration |
| 3.1.6 | Connect Service | getAccountDetails() | Integration |
| 3.1.7 | Webhook Route | /api/webhooks/stripe | E2E |
| 3.1.8 | Webhook Handlers | handleAccountUpdated() | Unit |
| 3.1.9 | Webhook Handlers | handlePaymentSucceeded() | Unit |
| 3.1.10 | Webhook Handlers | handleDisputeCreated() | Unit |
| 3.1.11 | Stripe Router | src/server/api/routers/stripe.ts | Integration |

## Risks, Assumptions, Open Questions

### Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Stripe API downtime | High - No payments | Manual payment entry fallback |
| Pre-auth expires before capture | Medium - Need new auth | Detect via webhook, alert staff |
| Dispute rate too high | High - Account suspension | Trust scoring (Epic 7) |
| Complex 3DS flows | Medium - Customer friction | Clear UI guidance, staff training |

### Assumptions
- Venues use USD currency (configurable later)
- Test mode sufficient for development
- Stripe Express accounts suitable (vs. Custom)
- 7-day pre-auth window adequate for restaurant use

### Open Questions
1. Should we support Stripe Terminal for card-present? (Deferred to Story 3.2)
2. Platform fee structure for Crowdiant? (Set to 0% for now)
3. Multi-currency support timeline? (Post-MVP)

## Test Strategy Summary

### Unit Tests
- Stripe client initialization
- Pre-auth amount calculation
- Webhook event parsing
- Account status determination

### Integration Tests
- Create Connect account (test mode)
- Generate onboarding link
- Create/capture/cancel payment intent
- Webhook signature verification

### E2E Tests (Story 3.2+)
- Full onboarding flow
- Tab open → items → close → receipt
- Walk-away detection trigger
- Customer self-close with tip

### Test Coverage Targets
- Line coverage: >80%
- Branch coverage: >75%
- Payment flows: 100% happy path + major error cases
