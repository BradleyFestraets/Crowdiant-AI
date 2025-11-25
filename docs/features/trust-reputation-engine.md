# Trust & Reputation Engine - Feature Deep Dive

## Executive Summary

**Feature Name:** Trust & Reputation Engine  
**Category:** Risk Management & Customer Relationship  
**Priority:** P2 - Medium (Sprint 8)  
**Complexity:** High (novel algorithm, behavioral tracking, cross-venue network effects)  
**Primary Value:** Enable financially viable Express Checkout through progressive risk reduction

### The Core Innovation

The Trust & Reputation Engine transforms Express Checkout from a **cost center** (high pre-auth amounts, payment processing fees) into a **competitive advantage** by:

1. **Progressive Trust Building:** Customers earn trust through consistent positive behavior
2. **Dynamic Risk Adjustment:** Pre-authorization amounts decrease as trust increases
3. **Network Effects:** Trust transfers across Crowdiant venues (creating platform moat)
4. **VIP Treatment:** Top-tier customers receive concierge-level perks
5. **Fraud Prevention:** Negative behaviors (chargebacks, walk-aways) lower trust automatically

**Why This Matters:** Without trust scoring, venues must hold $50-100 pre-auth on every tab. With it, regular customers need only $10-20 holds, making Express Checkout **10x more attractive** to frequent diners.

---

## Part 1: The Problem - Why Express Checkout Needs Trust

### The Express Checkout Dilemma

**Scenario:** Bar opens tab with $50 pre-authorization

**Case 1 - New Customer (No Trust):**
- Pre-auth: $50.00
- Actual tab: $28.00
- **Customer unhappy:** $50 hold on their card for 3-7 days

**Case 2 - Regular Customer (Traditional System):**
- Pre-auth: $50.00 (same as new customer)
- Actual tab: $28.00
- **Customer frustrated:** "I come here every week and you still don't trust me?"

**Case 3 - Regular Customer (With Trust System):**
- Trust Level: 3 (Trusted)
- Pre-auth: $10.00 (80% reduction)
- Actual tab: $28.00
- **Customer delighted:** "They know me and respect my loyalty!"

### The Financial Impact

**Without Trust System:**
- Every customer = $50-100 pre-auth hold
- High-spending regulars feel penalized
- Payment processing costs high (fee on pre-auth)
- Customer acquisition harder (first-time friction)

**With Trust System:**
- New customers: $50-100 pre-auth (acceptable for first visit)
- Regulars (60% of revenue): $10-25 pre-auth (80% reduction)
- VIPs (20% of revenue): $0 pre-auth (no hold at all)
- **Result:** 60-80% reduction in average pre-auth amounts
- **Benefit:** Lower processing fees, happier regulars, stronger retention

---

## Part 2: Trust Level Progression

### The Five Trust Levels

```
Level 0: NEW
├─ First-time customer
├─ Pre-auth: 100% (full amount, e.g., $50)
├─ Benefits: Express checkout access
└─ Path forward: Complete 2 successful visits

Level 1: FAMILIAR
├─ 2-5 successful visits, $50+ spent
├─ Pre-auth: 100% (still full amount)
├─ Benefits: Priority support, visit history
└─ Path forward: 6+ visits, $200+ spent, 15% avg tip

Level 2: REGULAR
├─ 6-15 visits, $200+ spent, 15% avg tip
├─ Pre-auth: 50% reduction (e.g., $25 instead of $50)
├─ Benefits: Reduced pre-auth, birthday rewards, expedited seating
└─ Path forward: 15+ visits, $750+ spent, 18% avg tip

Level 3: TRUSTED
├─ 15+ visits, $750+ spent, 18% avg tip, active (visited in last 60 days)
├─ Pre-auth: 80% reduction (e.g., $10 instead of $50)
├─ Benefits: Minimal pre-auth, complimentary items, reservation priority
└─ Path forward: 25+ visits, $2000+ spent, 20% avg tip, venue nomination

Level 4: VIP
├─ 25+ visits, $2000+ spent, 20% avg tip, requires venue approval
├─ Pre-auth: 100% reduction ($0 - no hold at all)
├─ Benefits: No pre-auth, concierge service, private events, custom menu
└─ Maintenance: Must remain active (visit every 30 days)
```

### Progressive Benefits Unlocked

**Level 0 → 1 (New to Familiar):**
- ✅ Visit history saved
- ✅ Priority customer support
- ✅ Faster tab opening (card on file)

**Level 1 → 2 (Familiar to Regular):**
- ✅ **50% pre-auth reduction** (biggest UX improvement)
- ✅ Birthday month reward (free appetizer or dessert)
- ✅ Expedited seating at peak times
- ✅ SMS notifications for specials

**Level 2 → 3 (Regular to Trusted):**
- ✅ **80% pre-auth reduction** (minimal friction)
- ✅ Complimentary item every 5th visit
- ✅ Reservation priority (guaranteed table within 30 min)
- ✅ Early access to new menu items
- ✅ Invite to private events

**Level 3 → 4 (Trusted to VIP):**
- ✅ **No pre-auth** (walk in, order, walk out)
- ✅ Dedicated concierge (text owner directly)
- ✅ Custom menu items ("Chef's surprise for VIP table 5")
- ✅ Private tasting events
- ✅ Off-menu specials
- ✅ Complimentary valet (if venue offers)

---

## Part 3: Trust Scoring Algorithm

### Trust Score Calculation

**Trust Score = Base Score + Behavioral Bonuses - Penalties**

#### Base Score Components (0-1000 points)

```typescript
interface TrustScoreFactors {
  // Visit Consistency (0-300 points)
  totalVisits: number;          // 10 points per visit (max 200)
  visitRecency: number;         // Days since last visit (max 100)
  visitFrequency: number;       // Visits per month trend (max 100)
  
  // Financial Reliability (0-400 points)
  totalSpent: number;           // $10 = 1 point (max 200)
  avgOrderValue: number;        // Higher avg = better (max 100)
  tipPercentage: number;        // Avg tip % (max 100)
  
  // Payment Behavior (0-200 points)
  onTimeClosures: number;       // Never walked away (max 100)
  paymentSuccess: number;       // No declined cards (max 100)
  
  // Engagement (0-100 points)
  profileComplete: boolean;     // Full profile = 25 points
  reviewsLeft: number;          // 5 points per review (max 25)
  reservationsMade: number;     // 5 points per reservation (max 25)
  loyaltyEngagement: number;    // Uses loyalty features (max 25)
}

// Example calculation
function calculateTrustScore(customer: Customer, venue: Venue): number {
  const factors: TrustScoreFactors = {
    // Visit metrics
    totalVisits: Math.min(customer.visits * 10, 200),
    visitRecency: calculateRecencyScore(customer.lastVisit),
    visitFrequency: calculateFrequencyScore(customer.visits, customer.firstVisit),
    
    // Financial metrics
    totalSpent: Math.min(customer.totalSpent / 10, 200),
    avgOrderValue: calculateAvgOrderScore(customer.avgSpend),
    tipPercentage: customer.avgTipPercent * 100,
    
    // Behavioral metrics
    onTimeClosures: customer.walkAways === 0 ? 100 : 0,
    paymentSuccess: (1 - customer.declinedPayments / customer.totalPayments) * 100,
    
    // Engagement metrics
    profileComplete: customer.profileCompleteness === 1.0 ? 25 : 0,
    reviewsLeft: Math.min(customer.reviews * 5, 25),
    reservationsMade: Math.min(customer.reservations * 5, 25),
    loyaltyEngagement: customer.loyaltyActive ? 25 : 0,
  };
  
  const baseScore = Object.values(factors).reduce((sum, val) => sum + val, 0);
  
  // Apply penalties
  const penalties = 
    (customer.chargebacks * 200) +      // Chargeback = -200 points each
    (customer.disputes * 100) +         // Dispute = -100 points each
    (customer.walkAways * 150) +        // Walk-away = -150 points each
    (customer.rudeIncidents * 50);      // Staff report = -50 points each
  
  const finalScore = Math.max(0, Math.min(1000, baseScore - penalties));
  
  return finalScore;
}
```

#### Trust Level Determination

```typescript
function getTrustLevel(score: number, customer: Customer, venue: Venue): TrustLevel {
  // VIP requires manual approval + high score
  if (customer.vipApproved && score >= 800) {
    return TrustLevel.VIP;
  }
  
  // Score-based levels
  if (score >= 750 && customer.visits >= 15) return TrustLevel.TRUSTED;
  if (score >= 500 && customer.visits >= 6) return TrustLevel.REGULAR;
  if (score >= 200 && customer.visits >= 2) return TrustLevel.FAMILIAR;
  
  return TrustLevel.NEW;
}
```

### Decay & Recency

**Trust decays if customer becomes inactive:**

```typescript
function applyDecayFactor(score: number, daysSinceLastVisit: number): number {
  if (daysSinceLastVisit <= 30) return score; // No decay
  if (daysSinceLastVisit <= 60) return score * 0.95; // 5% decay
  if (daysSinceLastVisit <= 90) return score * 0.85; // 15% decay
  if (daysSinceLastVisit <= 180) return score * 0.70; // 30% decay
  return score * 0.50; // 50% decay after 6 months
}
```

**Why decay matters:**
- Customer who visited 50 times in 2022 but hasn't been back since = not trustworthy (payment method may be expired, behavior may have changed)
- Decay incentivizes continued patronage

---

## Part 4: Cross-Venue Trust Network

### The Network Effect Moat

**Traditional loyalty programs:** Siloed per restaurant  
**Crowdiant Trust Network:** Trust follows customer across all Crowdiant venues

#### Scenario: Multi-Venue Trust Transfer

**Customer Journey:**

1. **Monday - Joe's Pizza (Crowdiant customer)**
   - First visit to Joe's
   - Trust Level: 0 (NEW) at Joe's
   - **But:** Customer has Level 3 (TRUSTED) at Maria's Tacos (also on Crowdiant)
   - **Network Trust Transfer:** Joe's sees "Trusted at 2 other venues"
   - **Result:** Joe's offers Level 1 pre-auth reduction (50% instead of 100%)

2. **Tuesday - Sue's Burgers (Crowdiant customer)**
   - First visit to Sue's
   - **Network Trust:** Trusted at Maria's, Joe's Pizza
   - **Result:** Sue's offers Level 2 pre-auth reduction (25% instead of 100%)

3. **Wednesday - Bob's Bar (Non-Crowdiant)**
   - First visit to Bob's
   - Bob's uses competitor POS (no trust network)
   - **Result:** Full $75 pre-auth, customer frustrated

**Customer Insight:** "I prefer Crowdiant restaurants because they remember me"

### Configurable Trust Inheritance

```typescript
interface VenueTrustPolicy {
  // How much of external trust to accept
  crossVenueInheritance: number; // 0.0 - 1.0 (default: 0.5)
  
  // Minimum external level to grant benefits
  minExternalLevel: TrustLevel; // default: REGULAR
  
  // How to calculate blended trust
  blendingStrategy: 'MAX' | 'AVERAGE' | 'WEIGHTED';
  
  // Max level a first-time visitor can inherit
  maxInheritedLevel: TrustLevel; // default: REGULAR (can't inherit VIP)
}

// Example: Joe's Pizza configuration
const joesPizzaTrustPolicy: VenueTrustPolicy = {
  crossVenueInheritance: 0.75, // Accept 75% of external trust
  minExternalLevel: TrustLevel.FAMILIAR, // Must be at least Familiar elsewhere
  blendingStrategy: 'WEIGHTED', // Weight local trust higher
  maxInheritedLevel: TrustLevel.REGULAR, // Can't walk in as VIP
};

function calculateBlendedTrust(
  localScore: number,
  externalScores: number[],
  policy: VenueTrustPolicy
): number {
  if (externalScores.length === 0) return localScore;
  
  const avgExternalScore = externalScores.reduce((sum, s) => sum + s, 0) / externalScores.length;
  const inheritedScore = avgExternalScore * policy.crossVenueInheritance;
  
  // Blend: 70% local, 30% inherited
  return (localScore * 0.7) + (inheritedScore * 0.3);
}
```

### Why Venues Want This

**Individual Restaurant Benefits:**
- Attract customers from other Crowdiant venues (cross-promotion)
- Reduce risk on first-time visitors (if they're trusted elsewhere)
- Compete with chains (independent restaurants form virtual chain)

**Platform Benefits (Crowdiant's Moat):**
- Network effects: More venues = more valuable to customers
- Switching cost: Customers don't want to lose trust score
- Viral growth: "Use Crowdiant venues to keep your trust score"

---

## Part 5: Trust Events & Behavioral Tracking

### Positive Trust Events

```typescript
enum TrustEventType {
  // Visit events (+points)
  VISIT_COMPLETED = 'VISIT_COMPLETED', // +10 points
  QUICK_CLOSE = 'QUICK_CLOSE', // Closed within 5 min of last order (+5)
  HIGH_TIP = 'HIGH_TIP', // >20% tip (+10)
  RESERVATION_HONORED = 'RESERVATION_HONORED', // Showed up on time (+5)
  
  // Engagement events (+points)
  PROFILE_COMPLETED = 'PROFILE_COMPLETED', // +25 one-time
  REVIEW_LEFT = 'REVIEW_LEFT', // +5 per review
  REFERRAL_COMPLETED = 'REFERRAL_COMPLETED', // Referred friend who visited (+20)
  LOYALTY_MILESTONE = 'LOYALTY_MILESTONE', // Hit loyalty tier (+15)
  
  // Negative events (-points)
  WALK_AWAY = 'WALK_AWAY', // -150 points (critical)
  CHARGEBACK = 'CHARGEBACK', // -200 points (severe)
  DISPUTE = 'DISPUTE', // -100 points
  PAYMENT_DECLINED = 'PAYMENT_DECLINED', // -20 points
  NO_SHOW = 'NO_SHOW', // Missed reservation (-25)
  RUDE_TO_STAFF = 'RUDE_TO_STAFF', // Staff report (-50)
}

interface TrustEvent {
  id: string;
  customerId: string;
  venueId: string;
  type: TrustEventType;
  pointsImpact: number;
  metadata: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date; // Some events expire (e.g., old positive events)
}
```

### Real-Time Trust Updates

**Scenario 1: Customer Walks Away**

```typescript
// Walk-away detected by background job
async function handleWalkAway(tabId: string) {
  const tab = await getTab(tabId);
  
  // Log trust event
  await createTrustEvent({
    customerId: tab.customerId,
    venueId: tab.venueId,
    type: TrustEventType.WALK_AWAY,
    pointsImpact: -150,
    metadata: {
      tabId: tab.id,
      amount: tab.total,
      resolved: false,
    },
  });
  
  // Recalculate trust immediately
  await recalculateTrustScore(tab.customerId, tab.venueId);
  
  // If trust drops below threshold, flag for review
  const newLevel = await getTrustLevel(tab.customerId, tab.venueId);
  if (newLevel === TrustLevel.NEW) {
    await flagCustomerForReview(tab.customerId, 'walk_away_trust_drop');
  }
  
  // Notify venue owner
  await notifyVenueOwner(tab.venueId, {
    type: 'TRUST_VIOLATION',
    customer: tab.customerId,
    event: 'walk_away',
    recommendation: 'Require full pre-auth for future visits',
  });
}
```

**Scenario 2: High-Value Regular Achieves VIP Status**

```typescript
// After successful visit #25
async function checkVIPEligibility(customerId: string, venueId: string) {
  const score = await getTrustScore(customerId, venueId);
  const stats = await getCustomerStats(customerId, venueId);
  
  if (
    score >= 800 &&
    stats.visits >= 25 &&
    stats.totalSpent >= 200000 && // $2000
    stats.avgTip >= 0.20 &&
    stats.daysSinceLastVisit <= 30
  ) {
    // Auto-nominate for VIP
    await createVIPNomination({
      customerId,
      venueId,
      reason: 'Automatic eligibility reached',
      stats,
      requiresApproval: true,
    });
    
    // Notify venue owner
    await notifyVenueOwner(venueId, {
      type: 'VIP_NOMINATION',
      customer: customerId,
      stats,
      recommendation: 'Review customer for VIP approval',
    });
  }
}
```

---

## Part 6: Venue Configuration & Controls

### Venue Trust Policy Settings

```typescript
interface VenueTrustSettings {
  // Trust system enabled?
  trustEnabled: boolean; // default: true
  
  // Pre-auth reduction by level
  preAuthReductions: {
    [TrustLevel.NEW]: 0.0,      // 0% reduction (100% pre-auth)
    [TrustLevel.FAMILIAR]: 0.0,
    [TrustLevel.REGULAR]: 0.5,  // 50% reduction
    [TrustLevel.TRUSTED]: 0.8,  // 80% reduction
    [TrustLevel.VIP]: 1.0,      // 100% reduction (no pre-auth)
  };
  
  // Cross-venue trust acceptance
  acceptExternalTrust: boolean; // default: true
  externalTrustWeight: number; // 0.0 - 1.0, default: 0.5
  
  // VIP approval process
  vipRequiresApproval: boolean; // default: true
  vipAutoApproveThreshold: number; // Score to auto-approve (default: 900)
  
  // Negative behavior handling
  walkAwayPolicy: 'BLACKLIST' | 'REDUCE_TRUST' | 'MANUAL_REVIEW';
  chargebackPolicy: 'BLACKLIST' | 'REQUIRE_FULL_PREAUTH';
  
  // Trust visibility to staff
  showTrustToStaff: boolean; // default: true
  showTrustToCustomer: boolean; // default: true
}
```

### Manual Trust Overrides

**Owner can manually adjust trust for specific customers:**

```typescript
interface TrustOverride {
  customerId: string;
  venueId: string;
  overrideType: 'LEVEL' | 'SCORE' | 'BLACKLIST' | 'WHITELIST';
  value: number | TrustLevel;
  reason: string;
  expiresAt?: Date;
  createdBy: string; // Staff user ID
  createdAt: Date;
}

// Examples:
// 1. Owner blacklists customer after altercation
await createTrustOverride({
  customerId: 'cust-123',
  venueId: 'venue-456',
  overrideType: 'BLACKLIST',
  reason: 'Customer was rude to staff, refused payment',
  createdBy: 'owner-789',
});

// 2. Owner grants VIP to local celebrity
await createTrustOverride({
  customerId: 'cust-celebrity',
  venueId: 'venue-456',
  overrideType: 'LEVEL',
  value: TrustLevel.VIP,
  reason: 'Local influencer, always promotes us on Instagram',
  createdBy: 'owner-789',
});

// 3. Owner temporarily boosts trust for corporate account
await createTrustOverride({
  customerId: 'cust-corp',
  venueId: 'venue-456',
  overrideType: 'LEVEL',
  value: TrustLevel.TRUSTED,
  reason: 'Corporate account for weekly team lunches',
  expiresAt: addMonths(new Date(), 6), // Expires in 6 months
  createdBy: 'owner-789',
});
```

---

## Part 7: Customer Experience & UI

### Customer Trust Dashboard

**What customers see (mobile web app):**

```
┌──────────────────────────────────────┐
│ Your Trust Profile                    │
├──────────────────────────────────────┤
│                                       │
│  ⭐⭐⭐ Level 3: TRUSTED              │
│                                       │
│  "Enjoy minimal pre-authorization     │
│   and priority perks at Joe's Pizza"  │
│                                       │
│  Trust Score: 782/1000                │
│  [████████████████░░░░] 78%          │
│                                       │
│  Next Level: VIP (Level 4)            │
│  • 18 more visits needed               │
│  • $1,250 more to spend                │
│  • Requires venue approval             │
│                                       │
├──────────────────────────────────────┤
│ Benefits Unlocked                     │
├──────────────────────────────────────┤
│ ✓ $10 pre-auth (instead of $50)      │
│ ✓ Complimentary item every 5 visits   │
│ ✓ Reservation priority                │
│ ✓ Early menu access                   │
│                                       │
├──────────────────────────────────────┤
│ Your Activity                         │
├──────────────────────────────────────┤
│ 🏆 18 visits this year                │
│ 💰 $1,340 total spent                 │
│ 💡 19% average tip                    │
│ ⏱️ Last visit: 3 days ago             │
│                                       │
├──────────────────────────────────────┤
│ Trust at Other Venues                 │
├──────────────────────────────────────┤
│ • Maria's Tacos: Level 3 (Trusted)    │
│ • Sue's Burgers: Level 2 (Regular)    │
│ • Bob's Bistro: Level 1 (Familiar)    │
│                                       │
│ [View Full Trust History]             │
└──────────────────────────────────────┘
```

### Staff View - Customer Trust Badge

**What servers see on POS when opening tab:**

```
┌──────────────────────────────────┐
│ Customer: John Smith              │
│ Phone: (555) 123-4567             │
│                                   │
│ 🌟 Trust Level: TRUSTED (Level 3) │
│                                   │
│ 📊 Stats:                         │
│ • 18 visits                        │
│ • $1,340 lifetime spend            │
│ • 19% avg tip                      │
│ • Last visit: 3 days ago           │
│                                   │
│ 💳 Pre-Auth: $10.00               │
│    (80% reduction applied)         │
│                                   │
│ 🎁 Perks Available:               │
│ • Next visit: Free appetizer       │
│ • Priority seating enabled         │
│                                   │
│ [Open Tab] [View Full Profile]    │
└──────────────────────────────────┘
```

### Trust Notification Examples

**SMS to customer after achieving new level:**

```
🎉 Congrats! You've reached TRUSTED status at Joe's Pizza!

Benefits unlocked:
• Pre-auth reduced to just $10
• Complimentary item every 5 visits
• Reservation priority

Thanks for being a loyal customer!

View your rewards: https://crowdiant.app/trust/cust-123
```

**Email to venue owner - VIP nomination:**

```
Subject: VIP Nomination: Sarah Johnson

Hi Joe,

Sarah Johnson has reached VIP eligibility at Joe's Pizza:

• 25 visits in the last 8 months
• $2,340 total spent
• 22% average tip
• Perfect payment record

Consider approving her for VIP status to unlock:
• No pre-authorization (instant tab opening)
• Custom menu items
• Private event invitations

[Approve VIP Status] [View Full Profile]
```

---

## Part 8: Edge Cases & Fraud Prevention

### Edge Case: Customer Disputes Trust Level

**Scenario:** Customer complains their trust level dropped

**Resolution Flow:**
1. Customer contacts venue/support
2. Staff reviews trust event log
3. If event was error (e.g., walk-away detection bug), reverse event
4. If event was legitimate (e.g., payment declined), explain policy
5. Offer path to rebuild trust (e.g., "3 more successful visits")

**Code:**
```typescript
async function reviewTrustDispute(disputeId: string) {
  const dispute = await getDispute(disputeId);
  const events = await getTrustEvents(dispute.customerId, dispute.venueId);
  
  // Find negative events in dispute timeframe
  const negativeEvents = events.filter(
    e => e.pointsImpact < 0 && 
    e.createdAt >= dispute.disputeStartDate &&
    e.createdAt <= dispute.disputeEndDate
  );
  
  // Present to staff for review
  return {
    customer: dispute.customerId,
    events: negativeEvents,
    currentLevel: await getTrustLevel(dispute.customerId, dispute.venueId),
    recommendation: calculateRecommendation(negativeEvents),
  };
}
```

### Fraud Pattern: Trust Score Manipulation

**Attack Vector:** Customer creates multiple accounts to game trust

**Detection:**
```typescript
async function detectTrustFraud(customerId: string) {
  const indicators = {
    // Multiple accounts from same device
    duplicateDevices: await findDuplicateDevices(customerId),
    
    // Multiple accounts with same payment method
    duplicatePaymentMethods: await findDuplicatePaymentMethods(customerId),
    
    // Rapid trust gain (too fast to be organic)
    rapidTrustGain: await detectRapidTrustGain(customerId),
    
    // All visits to same venue (suspicious for cross-venue trust)
    singleVenueFocus: await detectSingleVenueBehavior(customerId),
  };
  
  const fraudScore = calculateFraudScore(indicators);
  
  if (fraudScore > 0.7) {
    await flagAccountForReview(customerId, 'trust_manipulation');
  }
}
```

### Privacy Considerations

**What we track:**
- Visit frequency, spending, tips (transaction data)
- Payment success/failure rates
- Customer-initiated actions (reviews, referrals)

**What we DON'T track:**
- Biometric data
- Location outside venue
- Conversations with staff (unless staff files report)
- Social media activity (unless customer explicitly links)

**Customer control:**
- Can view all trust events
- Can dispute negative events
- Can opt out of cross-venue trust sharing
- Can request trust score deletion (loses all benefits)

---

## Part 9: Technical Implementation

### Database Schema

```prisma
model TrustScore {
  id          String   @id @default(cuid())
  customerId  String
  venueId     String
  
  // Current state
  score       Int      // 0-1000
  level       Int      // 0-4 (TrustLevel enum)
  
  // Metrics
  totalVisits     Int
  totalSpent      Int      // Cents
  avgTip          Float    // Percentage (0.0-1.0)
  lastVisitAt     DateTime
  firstVisitAt    DateTime
  
  // Flags
  vipApproved     Boolean  @default(false)
  blacklisted     Boolean  @default(false)
  
  // Timestamps
  calculatedAt    DateTime @updatedAt
  createdAt       DateTime @default(now())
  
  // Relations
  customer    Customer @relation(fields: [customerId], references: [id])
  venue       Venue    @relation(fields: [venueId], references: [id])
  events      TrustEvent[]
  overrides   TrustOverride[]
  
  @@unique([customerId, venueId])
  @@index([venueId, level])
  @@index([customerId])
}

model TrustEvent {
  id              String   @id @default(cuid())
  customerId      String
  venueId         String
  trustScoreId    String
  
  type            String   // TrustEventType enum
  pointsImpact    Int      // Can be positive or negative
  
  metadata        Json     // Event-specific data
  
  expiresAt       DateTime?
  createdAt       DateTime @default(now())
  
  trustScore      TrustScore @relation(fields: [trustScoreId], references: [id])
  
  @@index([customerId, venueId, createdAt])
  @@index([type])
}

model TrustOverride {
  id              String   @id @default(cuid())
  customerId      String
  venueId         String
  trustScoreId    String
  
  overrideType    String   // 'LEVEL' | 'SCORE' | 'BLACKLIST' | 'WHITELIST'
  value           Json     // Depends on overrideType
  reason          String
  
  createdBy       String   // Staff user ID
  expiresAt       DateTime?
  createdAt       DateTime @default(now())
  
  trustScore      TrustScore @relation(fields: [trustScoreId], references: [id])
  
  @@index([customerId, venueId])
}
```

### Caching Strategy

```typescript
// Redis caching for fast trust lookups
const trustCacheConfig = {
  key: (customerId: string, venueId: string) => 
    `trust:${customerId}:${venueId}`,
  ttl: 3600, // 1 hour
  invalidateOn: [
    'TRUST_EVENT_LOGGED',
    'TRUST_OVERRIDE_APPLIED',
    'VISIT_COMPLETED',
  ],
};

async function getCachedTrustScore(customerId: string, venueId: string) {
  const cacheKey = trustCacheConfig.key(customerId, venueId);
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss - calculate from database
  const score = await calculateTrustScoreFromDB(customerId, venueId);
  
  await redis.setex(cacheKey, trustCacheConfig.ttl, JSON.stringify(score));
  
  return score;
}
```

---

## Part 10: Success Metrics & Analytics

### Key Performance Indicators

**Customer Metrics:**
- Trust level distribution (what % are at each level?)
- Time to reach each level (how fast do customers progress?)
- Trust decay rate (how many customers drop levels due to inactivity?)
- Cross-venue trust transfer rate (how many customers benefit from network?)

**Business Metrics:**
- Pre-auth reduction achieved (average pre-auth amount vs. without trust)
- Express Checkout adoption by trust level (do higher trust = higher usage?)
- Customer lifetime value by trust level (does trust correlate with spend?)
- Churn reduction for trusted customers (do trusted customers return more?)

**Risk Metrics:**
- Walk-away rate by trust level (does trust actually reduce risk?)
- Chargeback rate by trust level
- False positive rate (customers wrongly flagged)
- Fraud detection effectiveness

### Analytics Dashboard

**Venue owner sees:**
```
┌──────────────────────────────────────────────┐
│ Trust System Performance                      │
├──────────────────────────────────────────────┤
│                                               │
│ Customer Distribution                         │
│ • Level 0 (New): 245 customers (35%)         │
│ • Level 1 (Familiar): 189 customers (27%)    │
│ • Level 2 (Regular): 154 customers (22%)     │
│ • Level 3 (Trusted): 98 customers (14%)      │
│ • Level 4 (VIP): 14 customers (2%)           │
│                                               │
│ Financial Impact                              │
│ • Avg pre-auth (with trust): $22.50          │
│ • Avg pre-auth (without trust): $50.00       │
│ • Savings: 55% reduction                      │
│                                               │
│ • Revenue from Trusted+ customers: $43,200    │
│ • That's 68% of total revenue!                │
│                                               │
│ Risk Metrics                                  │
│ • Walk-away rate (New): 2.1%                  │
│ • Walk-away rate (Trusted): 0.0%              │
│ • Chargebacks prevented: $1,240               │
│                                               │
└──────────────────────────────────────────────┘
```

---

## Part 11: Rollout Strategy

### Phase 1: Silent Launch (Sprint 8)
- Trust scoring runs in background
- No customer-facing UI yet
- Staff can see trust badges on POS
- Pre-auth reductions applied automatically
- **Goal:** Validate algorithm, gather data

### Phase 2: Customer Awareness (Sprint 9)
- Add trust dashboard to customer web app
- Send SMS notifications on level changes
- Display trust benefits on digital receipts
- **Goal:** Drive engagement, increase awareness

### Phase 3: Network Effects (Sprint 10+)
- Enable cross-venue trust transfer
- Launch "Crowdiant Trusted Network" marketing
- Incentivize venues to join network (lower fees for network participants?)
- **Goal:** Create platform moat, drive venue acquisition

---

## Conclusion

The Trust & Reputation Engine transforms Express Checkout from a risky cost center into a competitive advantage by:

1. **Reducing friction** for loyal customers (minimal pre-auth)
2. **Increasing retention** (trust score incentivizes repeat visits)
3. **Creating network effects** (cross-venue trust = platform moat)
4. **Preventing fraud** (behavioral scoring detects bad actors)
5. **Enabling VIP treatment** (top customers get concierge service)

**This is the feature that makes Express Checkout financially viable at scale.**
