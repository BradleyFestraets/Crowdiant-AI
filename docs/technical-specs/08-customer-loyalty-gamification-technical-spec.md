# Technical Specification: Customer Loyalty & Gamification

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** November 26, 2025  
**Owner:** Crowdiant OS Platform Team

---

## 1. Executive Summary

### 1.1 Purpose

The Customer Loyalty & Gamification system transforms occasional diners into repeat customers by rewarding visits, purchases, and engagement through a points-based loyalty program enhanced with gamification mechanics (badges, challenges, leaderboards). By integrating seamlessly with Express Checkout and the Trust System, customers earn rewards automatically without separate transactions, driving higher visit frequency and average check size.

### 1.2 Business Goals

- **Increase Repeat Visits:** Target 30% increase in visit frequency within 90 days
- **Boost Average Check:** 15-20% higher spending from loyalty members
- **Improve Customer Lifetime Value (CLV):** 2-3x CLV for engaged loyalty members
- **Reduce Marketing Cost:** Organic retention vs paid acquisition
- **Build Community:** Create social engagement through leaderboards and challenges

### 1.3 Core Capabilities

1. **Points System:** Earn points on every purchase (e.g., 1 point per $1)
2. **Tier Progression:** Bronze → Silver → Gold → Platinum with escalating benefits
3. **Reward Catalog:** Discounts, free items, exclusive perks
4. **Gamification:** Badges, challenges, streaks, leaderboards
5. **Cross-Venue Coalition:** Earn/redeem points across multiple venues
6. **Analytics & ROI:** Track loyalty program impact on revenue, visit frequency

### 1.4 Integration Points

- **Express Checkout** → Automatic points accrual on tab payment
- **Trust System** → Higher tiers unlock trust score boosts
- **POS System** → Redeem rewards at checkout
- **CRM/Marketing** → Targeted campaigns based on loyalty status
- **Analytics Dashboard** → ROI tracking, member segmentation

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│          Customer Loyalty & Gamification Engine             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Points     │  │     Tier     │  │   Reward     │      │
│  │   Engine     │  │  Progression │  │   Catalog    │      │
│  │              │  │   Manager    │  │              │      │
│  │ • Accrual    │  │              │  │ • Redemption │      │
│  │ • Expiration │  │ • Thresholds │  │ • Validation │      │
│  │ • Bonus      │  │ • Benefits   │  │ • Inventory  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                          │                                   │
│  ┌──────────────────────▼────────────────────────┐         │
│  │         Gamification Engine                    │         │
│  │  • Badges  • Challenges  • Streaks  • Leaderboards  │  │
│  └───────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
   ┌──────▼──────┐               ┌───────▼───────┐
   │  Database   │               │   External    │
   │             │               │   Systems     │
   │ • Members   │               │               │
   │ • Points    │               │ • POS         │
   │ • Rewards   │               │ • Trust       │
   │ • Badges    │               │ • Marketing   │
   └─────────────┘               └───────────────┘
```

### 2.2 Component Responsibilities

#### 2.2.1 Points Engine
- **Input:** Purchase transactions, bonus events, manual adjustments
- **Output:** Points balance, transaction history
- **Rules:** Configurable earn rate (e.g., 1pt/$1), bonus multipliers, expiration
- **Latency:** Real-time (<1s)

#### 2.2.2 Tier Progression Manager
- **Input:** Total points earned lifetime, current tier
- **Output:** Tier status, benefits unlocked
- **Trigger:** After every points transaction
- **Rules:** Bronze (0-500), Silver (500-2000), Gold (2000-5000), Platinum (5000+)

#### 2.2.3 Reward Catalog
- **Input:** Points balance, tier status, venue inventory
- **Output:** Available rewards, redemption confirmations
- **Validation:** Sufficient points, reward active, item in stock
- **Types:** Percentage discount, fixed amount off, free item, exclusive access

#### 2.2.4 Gamification Engine
- **Badges:** Achievement-based (e.g., "First Visit", "Weekend Warrior")
- **Challenges:** Time-bound goals (e.g., "Visit 5 times in 30 days for 500 bonus points")
- **Streaks:** Consecutive visit tracking
- **Leaderboards:** Rankings by points, visits, spending (opt-in for privacy)

---

## 3. Data Model

### 3.1 Core Entities

#### LoyaltyMember (new)
```prisma
model LoyaltyMember {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  
  // Status
  isActive      Boolean @default(true)
  enrolledAt    DateTime @default(now())
  
  // Points
  pointsBalance Int @default(0)
  pointsLifetime Int @default(0) // Total earned (never decreases)
  pointsRedeemed Int @default(0)
  
  // Tier
  currentTier   LoyaltyTier @default(BRONZE)
  tierSince     DateTime @default(now())
  
  // Engagement
  visitCount    Int @default(0)
  lastVisitAt   DateTime?
  streakDays    Int @default(0)
  longestStreak Int @default(0)
  
  // Preferences
  optInMarketing Boolean @default(true)
  optInLeaderboard Boolean @default(false)
  
  // Relations
  transactions  PointsTransaction[]
  redemptions   RewardRedemption[]
  badges        MemberBadge[]
  challengeProgress ChallengeProgress[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([currentTier])
  @@index([pointsLifetime])
}

enum LoyaltyTier {
  BRONZE
  SILVER
  GOLD
  PLATINUM
  VIP // Special tier for top 1%
}
```

#### PointsTransaction (new - audit trail)
```prisma
model PointsTransaction {
  id            String   @id @default(cuid())
  
  memberId      String
  member        LoyaltyMember @relation(fields: [memberId], references: [id])
  
  // Transaction details
  type          PointsTransactionType
  points        Int // Positive for earn, negative for redemption
  
  // Balance tracking
  balanceBefore Int
  balanceAfter  Int
  
  // Context
  venueId       String?
  venue         Venue? @relation(fields: [venueId], references: [id])
  orderId       String? // If from purchase
  order         Order? @relation(fields: [orderId], references: [id])
  redemptionId  String? // If from reward redemption
  challengeId   String? // If from challenge completion
  
  // Expiration
  expiresAt     DateTime? // For earned points (e.g., 1 year)
  
  // Metadata
  description   String
  multiplier    Decimal? @db.Decimal(4,2) // e.g., 2.0 for "2x points event"
  
  createdAt     DateTime @default(now())
  
  @@index([memberId, createdAt])
  @@index([type, createdAt])
}

enum PointsTransactionType {
  EARNED_PURCHASE   // From order payment
  EARNED_BONUS      // Manual bonus (e.g., birthday, referral)
  EARNED_CHALLENGE  // From challenge completion
  REDEEMED          // Spent on reward
  EXPIRED           // Points expired
  ADJUSTED          // Manual adjustment (positive or negative)
  REFUNDED          // Order refund reversed points
}
```

#### LoyaltyReward (new - catalog)
```prisma
model LoyaltyReward {
  id            String   @id @default(cuid())
  venueId       String?  // null = available at all venues
  venue         Venue?   @relation(fields: [venueId], references: [id])
  
  // Basic info
  name          String
  description   String
  imageUrl      String?
  
  // Cost
  pointsCost    Int
  
  // Type & Value
  rewardType    RewardType
  discountType  DiscountType? // If DISCOUNT type
  discountValue Decimal? @db.Decimal(10,2) // Amount or percentage
  menuItemId    String? // If FREE_ITEM type
  menuItem      MenuItem? @relation(fields: [menuItemId], references: [id])
  
  // Eligibility
  minTier       LoyaltyTier @default(BRONZE)
  maxRedemptionsPerMember Int? // e.g., once per month
  
  // Availability
  isActive      Boolean @default(true)
  validFrom     DateTime?
  validUntil    DateTime?
  
  // Inventory (for limited rewards)
  totalQuantity Int? // null = unlimited
  redeemedCount Int @default(0)
  
  // Relations
  redemptions   RewardRedemption[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([venueId, isActive])
  @@index([pointsCost])
}

enum RewardType {
  DISCOUNT_PERCENT  // e.g., 10% off
  DISCOUNT_FIXED    // e.g., $5 off
  FREE_ITEM         // e.g., Free dessert
  EXCLUSIVE_ACCESS  // e.g., VIP seating
  GIFT_CARD         // e.g., $25 gift card
}

enum DiscountType {
  PERCENT
  FIXED_AMOUNT
}
```

#### RewardRedemption (new)
```prisma
model RewardRedemption {
  id            String   @id @default(cuid())
  
  memberId      String
  member        LoyaltyMember @relation(fields: [memberId], references: [id])
  
  rewardId      String
  reward        LoyaltyReward @relation(fields: [rewardId], references: [id])
  
  // Redemption details
  pointsSpent   Int
  
  // Usage
  status        RedemptionStatus @default(PENDING)
  redeemedAt    DateTime @default(now())
  usedAt        DateTime? // When applied to order
  expiresAt     DateTime? // Expiration date
  
  // Order context
  orderId       String?
  order         Order? @relation(fields: [orderId], references: [id])
  venueId       String
  venue         Venue @relation(fields: [venueId], references: [id])
  
  // Discount applied (calculated at redemption)
  discountAmount Decimal? @db.Decimal(10,2)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([memberId, status])
  @@index([rewardId])
}

enum RedemptionStatus {
  PENDING   // Redeemed but not yet used
  USED      // Applied to order
  EXPIRED   // Expiration date passed
  CANCELLED // Refunded to member
}
```

#### Badge (new - gamification)
```prisma
model Badge {
  id            String   @id @default(cuid())
  
  // Basic info
  name          String
  description   String
  iconUrl       String // Image/SVG for badge
  
  // Rarity
  rarity        BadgeRarity @default(COMMON)
  
  // Unlock criteria (defined as JSON for flexibility)
  criteria      Json // e.g., { "visitCount": 10 } or { "spendTotal": 500 }
  
  // Status
  isActive      Boolean @default(true)
  
  // Relations
  members       MemberBadge[]
  
  createdAt     DateTime @default(now())
  
  @@index([isActive])
}

enum BadgeRarity {
  COMMON
  UNCOMMON
  RARE
  EPIC
  LEGENDARY
}

model MemberBadge {
  id            String   @id @default(cuid())
  
  memberId      String
  member        LoyaltyMember @relation(fields: [memberId], references: [id])
  
  badgeId       String
  badge         Badge @relation(fields: [badgeId], references: [id])
  
  unlockedAt    DateTime @default(now())
  
  @@unique([memberId, badgeId])
  @@index([memberId])
}
```

#### Challenge (new - time-bound goals)
```prisma
model Challenge {
  id            String   @id @default(cuid())
  venueId       String?  // null = system-wide
  venue         Venue?   @relation(fields: [venueId], references: [id])
  
  // Basic info
  name          String
  description   String
  imageUrl      String?
  
  // Goal
  goalType      ChallengeGoalType
  goalValue     Int // e.g., 5 visits, $100 spending
  
  // Reward
  rewardPoints  Int
  rewardBadgeId String? // Optional badge on completion
  rewardBadge   Badge? @relation(fields: [rewardBadgeId], references: [id])
  
  // Timing
  startDate     DateTime
  endDate       DateTime
  
  // Eligibility
  minTier       LoyaltyTier @default(BRONZE)
  
  // Status
  isActive      Boolean @default(true)
  
  // Relations
  progress      ChallengeProgress[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([isActive, startDate, endDate])
}

enum ChallengeGoalType {
  VISIT_COUNT      // e.g., "Visit 5 times"
  SPEND_TOTAL      // e.g., "Spend $100"
  ORDER_ITEM       // e.g., "Order a salad 3 times"
  REFER_FRIENDS    // e.g., "Refer 2 friends"
  REVIEW_VENUE     // e.g., "Leave a review"
}

model ChallengeProgress {
  id            String   @id @default(cuid())
  
  challengeId   String
  challenge     Challenge @relation(fields: [challengeId], references: [id])
  
  memberId      String
  member        LoyaltyMember @relation(fields: [memberId], references: [id])
  
  // Progress
  currentValue  Int @default(0)
  isCompleted   Boolean @default(false)
  completedAt   DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([challengeId, memberId])
  @@index([memberId, isCompleted])
}
```

---

## 4. Points Accrual Engine

### 4.1 Earning Points on Purchase

**Trigger:** Order payment completed (from Express Checkout)

**Default Rule:** 1 point per $1 spent

**Configurable per Venue:**
- Base earn rate (e.g., 1.5 pts/$1)
- Tier multipliers (Silver: 1.25x, Gold: 1.5x, Platinum: 2x)
- Bonus events ("2x points on Tuesdays")
- Excluded categories (e.g., alcohol, gift cards)

**Implementation:**
```typescript
// services/loyalty/points-engine.ts

interface PointsAccrualInput {
  memberId: string;
  orderId: string;
  orderTotal: number;
  venueId: string;
  paymentDate: Date;
}

export async function accruePointsForOrder(input: PointsAccrualInput): Promise<void> {
  const { memberId, orderId, orderTotal, venueId, paymentDate } = input;
  
  // Get member
  const member = await prisma.loyaltyMember.findUnique({
    where: { id: memberId }
  });
  
  if (!member || !member.isActive) return;
  
  // Get venue earn rate configuration
  const venueConfig = await prisma.loyaltyConfig.findUnique({
    where: { venueId }
  });
  
  const baseEarnRate = venueConfig?.baseEarnRate || 1.0; // 1 pt/$1
  
  // Get tier multiplier
  const tierMultipliers: Record<LoyaltyTier, number> = {
    BRONZE: 1.0,
    SILVER: 1.25,
    GOLD: 1.5,
    PLATINUM: 2.0,
    VIP: 2.5
  };
  
  const tierMultiplier = tierMultipliers[member.currentTier] || 1.0;
  
  // Check for bonus events (e.g., "2x points on Tuesdays")
  const bonusMultiplier = await getBonusMultiplier(venueId, paymentDate);
  
  // Calculate points
  const totalMultiplier = tierMultiplier * bonusMultiplier;
  const pointsEarned = Math.floor(orderTotal * baseEarnRate * totalMultiplier);
  
  // Create transaction
  await prisma.$transaction(async (tx) => {
    // Update member balance
    await tx.loyaltyMember.update({
      where: { id: memberId },
      data: {
        pointsBalance: { increment: pointsEarned },
        pointsLifetime: { increment: pointsEarned },
        visitCount: { increment: 1 },
        lastVisitAt: paymentDate
      }
    });
    
    // Log transaction
    await tx.pointsTransaction.create({
      data: {
        memberId,
        type: 'EARNED_PURCHASE',
        points: pointsEarned,
        balanceBefore: member.pointsBalance,
        balanceAfter: member.pointsBalance + pointsEarned,
        venueId,
        orderId,
        description: `Earned ${pointsEarned} points on order ${orderId}`,
        multiplier: totalMultiplier,
        expiresAt: addDays(paymentDate, 365) // Points expire in 1 year
      }
    });
    
    // Check for tier upgrade
    await checkTierUpgrade(tx, memberId);
    
    // Check for badge unlocks
    await checkBadgeUnlocks(tx, memberId);
    
    // Update challenge progress
    await updateChallengeProgress(tx, memberId, 'VISIT_COUNT', 1);
    await updateChallengeProgress(tx, memberId, 'SPEND_TOTAL', orderTotal);
  });
  
  // Send notification
  await sendPushNotification(member.userId, {
    title: 'Points Earned!',
    body: `You earned ${pointsEarned} points on your recent order.`,
    data: { type: 'POINTS_EARNED', points: pointsEarned }
  });
}

async function getBonusMultiplier(venueId: string, date: Date): Promise<number> {
  // Check for active bonus events
  const event = await prisma.bonusEvent.findFirst({
    where: {
      venueId,
      isActive: true,
      startDate: { lte: date },
      endDate: { gte: date }
    }
  });
  
  return event?.multiplier || 1.0;
}
```

### 4.2 Points Expiration

**Policy:** Points expire 365 days after earning (configurable)

**Cron Job:** Daily at 2am
```typescript
export async function expirePoints(): Promise<void> {
  const now = new Date();
  
  // Find expiring points transactions
  const expiringTransactions = await prisma.pointsTransaction.findMany({
    where: {
      type: 'EARNED_PURCHASE',
      expiresAt: { lte: now },
      points: { gt: 0 } // Only positive (earned) points
    }
  });
  
  for (const transaction of expiringTransactions) {
    await prisma.$transaction(async (tx) => {
      const member = await tx.loyaltyMember.findUnique({
        where: { id: transaction.memberId }
      });
      
      if (!member) return;
      
      // Deduct expired points
      const pointsToExpire = Math.min(transaction.points, member.pointsBalance);
      
      if (pointsToExpire > 0) {
        await tx.loyaltyMember.update({
          where: { id: transaction.memberId },
          data: {
            pointsBalance: { decrement: pointsToExpire }
          }
        });
        
        await tx.pointsTransaction.create({
          data: {
            memberId: transaction.memberId,
            type: 'EXPIRED',
            points: -pointsToExpire,
            balanceBefore: member.pointsBalance,
            balanceAfter: member.pointsBalance - pointsToExpire,
            description: `${pointsToExpire} points expired`
          }
        });
      }
    });
  }
}
```

---

## 5. Tier Progression System

### 5.1 Tier Thresholds

| Tier | Lifetime Points | Benefits |
|------|----------------|----------|
| **Bronze** | 0-499 | Base earn rate, standard support |
| **Silver** | 500-1,999 | 1.25x earn multiplier, priority seating, birthday reward |
| **Gold** | 2,000-4,999 | 1.5x earn multiplier, free delivery, early access to events |
| **Platinum** | 5,000-9,999 | 2x earn multiplier, dedicated support, exclusive menu items |
| **VIP** | 10,000+ | 2.5x earn multiplier, free guest passes, annual appreciation dinner |

**Note:** Tiers based on lifetime points earned (never decreases, even after redemptions)

### 5.2 Tier Upgrade Logic

```typescript
async function checkTierUpgrade(tx: PrismaTransaction, memberId: string): Promise<void> {
  const member = await tx.loyaltyMember.findUnique({
    where: { id: memberId }
  });
  
  if (!member) return;
  
  // Determine new tier based on lifetime points
  let newTier: LoyaltyTier = 'BRONZE';
  
  if (member.pointsLifetime >= 10000) newTier = 'VIP';
  else if (member.pointsLifetime >= 5000) newTier = 'PLATINUM';
  else if (member.pointsLifetime >= 2000) newTier = 'GOLD';
  else if (member.pointsLifetime >= 500) newTier = 'SILVER';
  
  // Check if upgraded
  if (newTier !== member.currentTier) {
    const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'VIP'];
    const isUpgrade = tierOrder.indexOf(newTier) > tierOrder.indexOf(member.currentTier);
    
    if (isUpgrade) {
      await tx.loyaltyMember.update({
        where: { id: memberId },
        data: {
          currentTier: newTier,
          tierSince: new Date()
        }
      });
      
      // Grant tier upgrade bonus
      const bonusPoints = {
        SILVER: 100,
        GOLD: 250,
        PLATINUM: 500,
        VIP: 1000
      }[newTier] || 0;
      
      if (bonusPoints > 0) {
        await tx.loyaltyMember.update({
          where: { id: memberId },
          data: {
            pointsBalance: { increment: bonusPoints },
            pointsLifetime: { increment: bonusPoints }
          }
        });
        
        await tx.pointsTransaction.create({
          data: {
            memberId,
            type: 'EARNED_BONUS',
            points: bonusPoints,
            balanceBefore: member.pointsBalance,
            balanceAfter: member.pointsBalance + bonusPoints,
            description: `Tier upgrade bonus: Welcome to ${newTier}!`
          }
        });
      }
      
      // Send congratulations notification
      await sendTierUpgradeNotification(member.userId, newTier, bonusPoints);
      
      // Unlock tier badge
      await unlockBadge(tx, memberId, `TIER_${newTier}`);
    }
  }
}
```

### 5.3 Tier Benefits Integration

**Trust System Integration:**
```typescript
// When calculating trust score, apply tier boost
function getTierTrustBoost(tier: LoyaltyTier): number {
  return {
    BRONZE: 0,
    SILVER: 5,
    GOLD: 10,
    PLATINUM: 15,
    VIP: 20
  }[tier] || 0;
}
```

**Express Checkout Benefits:**
- Silver+: Skip verification step (auto-approved tabs)
- Gold+: Increased tab limit ($200 → $300)
- Platinum+: VIP "walk-away" grace period (15min vs 5min)

---

## 6. Reward Catalog & Redemption

### 6.1 Reward Types

#### A. Percentage Discount
```typescript
{
  name: "10% Off Your Next Order",
  pointsCost: 250,
  rewardType: "DISCOUNT_PERCENT",
  discountValue: 10,
  minTier: "BRONZE"
}
```

#### B. Fixed Discount
```typescript
{
  name: "$5 Off $25+",
  pointsCost: 500,
  rewardType: "DISCOUNT_FIXED",
  discountValue: 5,
  minTier: "SILVER"
}
```

#### C. Free Item
```typescript
{
  name: "Free Dessert",
  pointsCost: 300,
  rewardType: "FREE_ITEM",
  menuItemId: "dessert-chocolate-cake",
  minTier: "BRONZE"
}
```

#### D. Exclusive Access
```typescript
{
  name: "VIP Table Reservation",
  pointsCost: 1000,
  rewardType: "EXCLUSIVE_ACCESS",
  description: "Reserve the best table in the house",
  minTier: "GOLD"
}
```

### 6.2 Redemption Flow

**API Endpoint:**
```typescript
redeemReward: protectedProcedure
  .input(z.object({
    rewardId: z.string(),
    venueId: z.string()
  }))
  .mutation(async ({ input, ctx }) => {
    const { rewardId, venueId } = input;
    const userId = ctx.session.user.id;
    
    // Get member
    const member = await prisma.loyaltyMember.findUnique({
      where: { userId }
    });
    
    if (!member || !member.isActive) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a loyalty member' });
    }
    
    // Get reward
    const reward = await prisma.loyaltyReward.findUnique({
      where: { id: rewardId }
    });
    
    if (!reward || !reward.isActive) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Reward not available' });
    }
    
    // Validate eligibility
    if (member.pointsBalance < reward.pointsCost) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient points' });
    }
    
    const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'VIP'];
    if (tierOrder.indexOf(member.currentTier) < tierOrder.indexOf(reward.minTier)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `Requires ${reward.minTier} tier` });
    }
    
    // Check redemption limits
    if (reward.maxRedemptionsPerMember) {
      const previousRedemptions = await prisma.rewardRedemption.count({
        where: {
          memberId: member.id,
          rewardId,
          status: { in: ['PENDING', 'USED'] }
        }
      });
      
      if (previousRedemptions >= reward.maxRedemptionsPerMember) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Redemption limit reached' });
      }
    }
    
    // Check inventory (for limited rewards)
    if (reward.totalQuantity && reward.redeemedCount >= reward.totalQuantity) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Reward sold out' });
    }
    
    // Create redemption
    let redemption: RewardRedemption;
    
    await prisma.$transaction(async (tx) => {
      // Deduct points
      await tx.loyaltyMember.update({
        where: { id: member.id },
        data: {
          pointsBalance: { decrement: reward.pointsCost },
          pointsRedeemed: { increment: reward.pointsCost }
        }
      });
      
      // Log points transaction
      await tx.pointsTransaction.create({
        data: {
          memberId: member.id,
          type: 'REDEEMED',
          points: -reward.pointsCost,
          balanceBefore: member.pointsBalance,
          balanceAfter: member.pointsBalance - reward.pointsCost,
          venueId,
          description: `Redeemed: ${reward.name}`
        }
      });
      
      // Create redemption record
      redemption = await tx.rewardRedemption.create({
        data: {
          memberId: member.id,
          rewardId,
          venueId,
          pointsSpent: reward.pointsCost,
          status: 'PENDING',
          expiresAt: addDays(new Date(), 30) // Valid for 30 days
        }
      });
      
      // Increment redeemed count
      await tx.loyaltyReward.update({
        where: { id: rewardId },
        data: { redeemedCount: { increment: 1 } }
      });
    });
    
    // Send confirmation notification
    await sendPushNotification(userId, {
      title: 'Reward Redeemed!',
      body: `${reward.name} - Show this to your server`,
      data: { type: 'REWARD_REDEEMED', redemptionId: redemption!.id }
    });
    
    return redemption;
  });
```

### 6.3 Applying Reward to Order

**At POS/Checkout:**
```typescript
applyRewardToOrder: protectedProcedure
  .input(z.object({
    orderId: z.string(),
    redemptionId: z.string()
  }))
  .mutation(async ({ input }) => {
    const { orderId, redemptionId } = input;
    
    const redemption = await prisma.rewardRedemption.findUnique({
      where: { id: redemptionId },
      include: { reward: true, member: true }
    });
    
    if (!redemption || redemption.status !== 'PENDING') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid redemption' });
    }
    
    if (redemption.expiresAt && redemption.expiresAt < new Date()) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Reward expired' });
    }
    
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new TRPCError({ code: 'NOT_FOUND' });
    
    let discountAmount = 0;
    
    switch (redemption.reward.rewardType) {
      case 'DISCOUNT_PERCENT':
        discountAmount = order.subtotal.toNumber() * (redemption.reward.discountValue!.toNumber() / 100);
        break;
      case 'DISCOUNT_FIXED':
        discountAmount = Math.min(redemption.reward.discountValue!.toNumber(), order.subtotal.toNumber());
        break;
      case 'FREE_ITEM':
        // Verify item is on order
        const hasItem = order.items.some(i => i.menuItemId === redemption.reward.menuItemId);
        if (!hasItem) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Order must include the free item' });
        }
        const item = await prisma.menuItem.findUnique({ where: { id: redemption.reward.menuItemId! } });
        discountAmount = item?.price.toNumber() || 0;
        break;
    }
    
    // Update order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        discount: { increment: discountAmount },
        total: { decrement: discountAmount }
      }
    });
    
    // Mark redemption as used
    await prisma.rewardRedemption.update({
      where: { id: redemptionId },
      data: {
        status: 'USED',
        usedAt: new Date(),
        orderId,
        discountAmount
      }
    });
    
    return { discountAmount };
  });
```

---

## 7. Gamification Mechanics

### 7.1 Badge System

**Badge Categories:**
- **Milestones:** "First Visit", "10 Visits", "100 Visits"
- **Spending:** "Big Spender" ($1000 lifetime), "High Roller" ($5000)
- **Loyalty:** "Weekend Warrior" (5 weekend visits), "Weekday Regular" (10 weekday lunches)
- **Social:** "Influencer" (refer 5 friends), "Reviewer" (leave 10 reviews)
- **Special:** "Early Adopter", "Beta Tester", "VIP Member"

**Badge Unlock Logic:**
```typescript
async function checkBadgeUnlocks(tx: PrismaTransaction, memberId: string): Promise<void> {
  const member = await tx.loyaltyMember.findUnique({
    where: { id: memberId },
    include: { badges: true }
  });
  
  if (!member) return;
  
  // Get all active badges
  const allBadges = await tx.badge.findMany({ where: { isActive: true } });
  
  for (const badge of allBadges) {
    // Check if already unlocked
    const hasUnlocked = member.badges.some(mb => mb.badgeId === badge.id);
    if (hasUnlocked) continue;
    
    // Evaluate criteria (stored as JSON)
    const criteria = badge.criteria as Record<string, any>;
    let meetsAll = true;
    
    for (const [key, value] of Object.entries(criteria)) {
      switch (key) {
        case 'visitCount':
          if (member.visitCount < value) meetsAll = false;
          break;
        case 'pointsLifetime':
          if (member.pointsLifetime < value) meetsAll = false;
          break;
        case 'currentTier':
          if (member.currentTier !== value) meetsAll = false;
          break;
        case 'streakDays':
          if (member.streakDays < value) meetsAll = false;
          break;
        // Add more criteria types as needed
      }
    }
    
    if (meetsAll) {
      await unlockBadge(tx, memberId, badge.id);
    }
  }
}

async function unlockBadge(tx: PrismaTransaction, memberId: string, badgeId: string): Promise<void> {
  await tx.memberBadge.create({
    data: { memberId, badgeId }
  });
  
  const badge = await tx.badge.findUnique({ where: { id: badgeId } });
  const member = await tx.loyaltyMember.findUnique({ where: { id: memberId } });
  
  // Award bonus points for rare badges
  const bonusPoints = {
    COMMON: 10,
    UNCOMMON: 25,
    RARE: 50,
    EPIC: 100,
    LEGENDARY: 250
  }[badge!.rarity] || 0;
  
  if (bonusPoints > 0) {
    await tx.loyaltyMember.update({
      where: { id: memberId },
      data: {
        pointsBalance: { increment: bonusPoints },
        pointsLifetime: { increment: bonusPoints }
      }
    });
    
    await tx.pointsTransaction.create({
      data: {
        memberId,
        type: 'EARNED_BONUS',
        points: bonusPoints,
        balanceBefore: member!.pointsBalance,
        balanceAfter: member!.pointsBalance + bonusPoints,
        description: `Badge unlocked: ${badge!.name}`
      }
    });
  }
  
  // Send notification
  await sendPushNotification(member!.userId, {
    title: `Badge Unlocked: ${badge!.name}`,
    body: badge!.description,
    data: { type: 'BADGE_UNLOCKED', badgeId }
  });
}
```

### 7.2 Challenge System

**Challenge Examples:**

**1. Visit Challenge**
```typescript
{
  name: "November Rush",
  description: "Visit 5 times in November",
  goalType: "VISIT_COUNT",
  goalValue: 5,
  rewardPoints: 500,
  startDate: new Date('2025-11-01'),
  endDate: new Date('2025-11-30')
}
```

**2. Spending Challenge**
```typescript
{
  name: "Big Spender",
  description: "Spend $200 total this month",
  goalType: "SPEND_TOTAL",
  goalValue: 200,
  rewardPoints: 1000,
  rewardBadgeId: "badge-big-spender",
  startDate: startOfMonth(new Date()),
  endDate: endOfMonth(new Date())
}
```

**Progress Update Logic:**
```typescript
async function updateChallengeProgress(
  tx: PrismaTransaction,
  memberId: string,
  goalType: ChallengeGoalType,
  incrementValue: number
): Promise<void> {
  // Find active challenges of this type
  const challenges = await tx.challenge.findMany({
    where: {
      isActive: true,
      goalType,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() }
    }
  });
  
  for (const challenge of challenges) {
    // Get or create progress record
    let progress = await tx.challengeProgress.findUnique({
      where: {
        challengeId_memberId: { challengeId: challenge.id, memberId }
      }
    });
    
    if (!progress) {
      progress = await tx.challengeProgress.create({
        data: {
          challengeId: challenge.id,
          memberId,
          currentValue: 0
        }
      });
    }
    
    if (progress.isCompleted) continue; // Already completed
    
    // Increment progress
    const newValue = progress.currentValue + incrementValue;
    
    await tx.challengeProgress.update({
      where: { id: progress.id },
      data: { currentValue: newValue }
    });
    
    // Check if completed
    if (newValue >= challenge.goalValue) {
      await tx.challengeProgress.update({
        where: { id: progress.id },
        data: {
          isCompleted: true,
          completedAt: new Date()
        }
      });
      
      // Award points
      const member = await tx.loyaltyMember.findUnique({ where: { id: memberId } });
      
      await tx.loyaltyMember.update({
        where: { id: memberId },
        data: {
          pointsBalance: { increment: challenge.rewardPoints },
          pointsLifetime: { increment: challenge.rewardPoints }
        }
      });
      
      await tx.pointsTransaction.create({
        data: {
          memberId,
          type: 'EARNED_CHALLENGE',
          points: challenge.rewardPoints,
          balanceBefore: member!.pointsBalance,
          balanceAfter: member!.pointsBalance + challenge.rewardPoints,
          challengeId: challenge.id,
          description: `Challenge completed: ${challenge.name}`
        }
      });
      
      // Award badge if specified
      if (challenge.rewardBadgeId) {
        await unlockBadge(tx, memberId, challenge.rewardBadgeId);
      }
      
      // Send notification
      await sendChallengeCompletionNotification(member!.userId, challenge);
    }
  }
}
```

### 7.3 Visit Streak Tracking

**Daily Cron Job:**
```typescript
export async function updateVisitStreaks(): Promise<void> {
  const members = await prisma.loyaltyMember.findMany({
    where: { isActive: true, lastVisitAt: { not: null } }
  });
  
  for (const member of members) {
    const daysSinceLastVisit = differenceInDays(new Date(), member.lastVisitAt!);
    
    if (daysSinceLastVisit === 1) {
      // Consecutive day visit - increment streak
      await prisma.loyaltyMember.update({
        where: { id: member.id },
        data: {
          streakDays: { increment: 1 },
          longestStreak: Math.max(member.streakDays + 1, member.longestStreak)
        }
      });
    } else if (daysSinceLastVisit > 1) {
      // Streak broken
      if (member.streakDays > 0) {
        await prisma.loyaltyMember.update({
          where: { id: member.id },
          data: { streakDays: 0 }
        });
        
        // Send "We miss you" notification if streak was long
        if (member.streakDays >= 7) {
          await sendStreakBrokenNotification(member.userId, member.streakDays);
        }
      }
    }
    // daysSinceLastVisit === 0 means visited today, no action needed
  }
}
```

### 7.4 Leaderboards

**Types:**
- **Points:** Top 100 by lifetime points
- **Visits:** Most visits this month
- **Spending:** Highest spending this month

**Privacy:** Opt-in only (controlled by `optInLeaderboard` field)

**API:**
```typescript
getLeaderboard: publicProcedure
  .input(z.object({
    venueId: z.string().optional(),
    type: z.enum(['points', 'visits', 'spending']),
    period: z.enum(['allTime', 'month', 'week']).default('allTime'),
    limit: z.number().int().min(10).max(100).default(50)
  }))
  .query(async ({ input }) => {
    const { venueId, type, period, limit } = input;
    
    let orderBy: any;
    let where: any = {
      isActive: true,
      optInLeaderboard: true
    };
    
    // Add date filter for non-allTime periods
    if (period === 'month') {
      where.lastVisitAt = { gte: startOfMonth(new Date()) };
    } else if (period === 'week') {
      where.lastVisitAt = { gte: startOfWeek(new Date()) };
    }
    
    // Determine sort order
    switch (type) {
      case 'points':
        orderBy = { pointsLifetime: 'desc' };
        break;
      case 'visits':
        orderBy = { visitCount: 'desc' };
        break;
      case 'spending':
        // Requires aggregation from orders
        // Simplified: use pointsLifetime as proxy
        orderBy = { pointsLifetime: 'desc' };
        break;
    }
    
    const members = await prisma.loyaltyMember.findMany({
      where,
      orderBy,
      take: limit,
      select: {
        id: true,
        user: {
          select: {
            name: true,
            // Optionally avatar
          }
        },
        currentTier: true,
        pointsLifetime: true,
        visitCount: true
      }
    });
    
    return members.map((member, index) => ({
      rank: index + 1,
      name: member.user.name || 'Anonymous',
      tier: member.currentTier,
      value: type === 'points' ? member.pointsLifetime : member.visitCount
    }));
  });
```

---

## 8. Analytics & ROI Tracking

### 8.1 Program Metrics Dashboard

**Key Metrics:**
- **Total Members:** Active loyalty members
- **Active Rate:** % of customers enrolled
- **Avg Points Balance:** Per member
- **Redemption Rate:** Points redeemed / points earned
- **Engagement Score:** Visits per member per month

**ROI Calculation:**
```typescript
interface LoyaltyROI {
  totalRevenue: number;
  loyaltyMemberRevenue: number;
  nonMemberRevenue: number;
  revenuePerMember: number;
  revenuePerNonMember: number;
  lift: number; // % higher spending from members
  programCost: number; // Rewards redeemed
  roi: number; // (Incremental Revenue - Program Cost) / Program Cost
}

export async function calculateLoyaltyROI(
  venueId: string,
  startDate: Date,
  endDate: Date
): Promise<LoyaltyROI> {
  // Get all orders in period
  const allOrders = await prisma.order.findMany({
    where: {
      venueId,
      status: 'COMPLETED',
      createdAt: { gte: startDate, lte: endDate }
    },
    include: { user: { include: { loyaltyMember: true } } }
  });
  
  const memberOrders = allOrders.filter(o => o.user.loyaltyMember);
  const nonMemberOrders = allOrders.filter(o => !o.user.loyaltyMember);
  
  const loyaltyMemberRevenue = memberOrders.reduce((sum, o) => sum + o.total.toNumber(), 0);
  const nonMemberRevenue = nonMemberOrders.reduce((sum, o) => sum + o.total.toNumber(), 0);
  const totalRevenue = loyaltyMemberRevenue + nonMemberRevenue;
  
  const memberCount = new Set(memberOrders.map(o => o.userId)).size;
  const nonMemberCount = new Set(nonMemberOrders.map(o => o.userId)).size;
  
  const revenuePerMember = memberCount > 0 ? loyaltyMemberRevenue / memberCount : 0;
  const revenuePerNonMember = nonMemberCount > 0 ? nonMemberRevenue / nonMemberCount : 0;
  
  const lift = revenuePerNonMember > 0 
    ? ((revenuePerMember - revenuePerNonMember) / revenuePerNonMember) * 100 
    : 0;
  
  // Get program cost (rewards redeemed)
  const redemptions = await prisma.rewardRedemption.findMany({
    where: {
      venueId,
      status: 'USED',
      usedAt: { gte: startDate, lte: endDate }
    }
  });
  
  const programCost = redemptions.reduce((sum, r) => sum + (r.discountAmount?.toNumber() || 0), 0);
  
  // Calculate incremental revenue (lift × member count)
  const incrementalRevenue = (revenuePerMember - revenuePerNonMember) * memberCount;
  
  const roi = programCost > 0 ? ((incrementalRevenue - programCost) / programCost) * 100 : 0;
  
  return {
    totalRevenue,
    loyaltyMemberRevenue,
    nonMemberRevenue,
    revenuePerMember,
    revenuePerNonMember,
    lift,
    programCost,
    roi
  };
}
```

### 8.2 Member Segmentation

**RFM Analysis (Recency, Frequency, Monetary):**
```typescript
interface MemberSegment {
  memberId: string;
  recencyScore: number; // 1-5 (1=recent, 5=long ago)
  frequencyScore: number; // 1-5 (visits)
  monetaryScore: number; // 1-5 (spending)
  segment: 'Champions' | 'Loyal' | 'At Risk' | 'Hibernating' | 'Lost';
}

export async function segmentMembers(venueId: string): Promise<MemberSegment[]> {
  const members = await prisma.loyaltyMember.findMany({
    where: { isActive: true },
    include: {
      transactions: {
        where: { venueId, type: 'EARNED_PURCHASE' }
      }
    }
  });
  
  const segments: MemberSegment[] = [];
  
  for (const member of members) {
    // Recency: days since last visit
    const daysSinceLastVisit = member.lastVisitAt 
      ? differenceInDays(new Date(), member.lastVisitAt) 
      : 999;
    const recencyScore = daysSinceLastVisit < 7 ? 5 : daysSinceLastVisit < 30 ? 4 : daysSinceLastVisit < 60 ? 3 : daysSinceLastVisit < 90 ? 2 : 1;
    
    // Frequency: visit count
    const frequencyScore = member.visitCount > 50 ? 5 : member.visitCount > 20 ? 4 : member.visitCount > 10 ? 3 : member.visitCount > 5 ? 2 : 1;
    
    // Monetary: lifetime points as proxy for spending
    const monetaryScore = member.pointsLifetime > 5000 ? 5 : member.pointsLifetime > 2000 ? 4 : member.pointsLifetime > 500 ? 3 : member.pointsLifetime > 100 ? 2 : 1;
    
    // Determine segment
    let segment: MemberSegment['segment'];
    if (recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4) {
      segment = 'Champions';
    } else if (frequencyScore >= 3 && monetaryScore >= 3) {
      segment = 'Loyal';
    } else if (recencyScore <= 2 && (frequencyScore >= 3 || monetaryScore >= 3)) {
      segment = 'At Risk';
    } else if (recencyScore <= 2) {
      segment = 'Hibernating';
    } else {
      segment = 'Lost';
    }
    
    segments.push({
      memberId: member.id,
      recencyScore,
      frequencyScore,
      monetaryScore,
      segment
    });
  }
  
  return segments;
}
```

---

## 9. User Interface Flows

### 9.1 Loyalty Home Screen (Mobile App)

**Route:** `/loyalty`

```
┌──────────────────────────────────────────────────────────────┐
│  ◀ Back                Loyalty Rewards                🔔      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    GOLD MEMBER                         │ │
│  │                   [Progress Bar]                       │ │
│  │            2,450 / 5,000 pts to Platinum              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   1,230      │  │      42      │  │      7       │      │
│  │  Points      │  │   Visits     │  │   Streak     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  Quick Actions:                                              │
│  [Redeem Rewards] [View Badges] [Active Challenges]         │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│  Rewards Catalog                              [View All >]   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🎁 Free Dessert                    250 pts             │ │
│  │ 🍔 $5 Off $25+                     500 pts             │ │
│  │ ⭐ 10% Off Next Order              250 pts             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Active Challenges                            [View All >]   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ November Rush - Visit 5 times                          │ │
│  │ Progress: ████░░░░░ 3/5                               │ │
│  │ Reward: 500 bonus points  |  Ends: Nov 30             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Recent Badges                                [View All >]   │
│  🏆 🎖️ 🌟 ⭐ 💎                                            │
└──────────────────────────────────────────────────────────────┘
```

### 9.2 Reward Redemption Flow

**Step 1: Browse Catalog**
- Grid view of available rewards
- Filter by: Points cost, Tier requirement, Category
- Show "LOCKED" badge for rewards above current tier

**Step 2: Redemption Confirmation**
```
┌──────────────────────────────────────────────────────────────┐
│  Redeem Reward                                            ✕   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  🎁 Free Dessert                                             │
│  Choose any dessert from our menu                            │
│                                                               │
│  Points Cost: 250                                            │
│  Your Balance: 1,230 → 980                                   │
│                                                               │
│  Valid for 30 days                                           │
│  Available at: All Locations                                 │
│                                                               │
│  [Cancel]                       [Redeem for 250 Points]      │
└──────────────────────────────────────────────────────────────┘
```

**Step 3: Success Screen**
```
┌──────────────────────────────────────────────────────────────┐
│                          ✅                                   │
│                  Reward Redeemed!                            │
│                                                               │
│  Show this screen to your server to claim your free dessert  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   [QR CODE]                            │ │
│  │              Redemption #R-2025-0042                   │ │
│  │              Expires: Dec 26, 2025                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  [View My Rewards]                                           │
└──────────────────────────────────────────────────────────────┘
```

### 9.3 Badge Collection Page

**Route:** `/loyalty/badges`

```
┌──────────────────────────────────────────────────────────────┐
│  ◀ Loyalty                Badge Collection                   │
├──────────────────────────────────────────────────────────────┤
│  Unlocked: 12 / 50                                           │
│                                                               │
│  [All] [Milestones] [Spending] [Social] [Special]           │
│                                                               │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │ 🏆   │  │ 🎖️   │  │ 🌟   │  │  ?   │  │  ?   │        │
│  │First │  │ 10   │  │Gold  │  │Locked│  │Locked│        │
│  │Visit │  │Visits│  │Member│  │      │  │      │        │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘        │
│                                                               │
│  Tap a badge to see details                                  │
└──────────────────────────────────────────────────────────────┘
```

**Badge Detail Modal:**
```
┌──────────────────────────────────────────────────────────────┐
│                           🏆                                  │
│                      Gold Member                             │
│                     RARE Badge                               │
│                                                               │
│  Unlocked: Nov 15, 2025                                      │
│                                                               │
│  Reached Gold tier status                                    │
│  Bonus: +50 points                                           │
│                                                               │
│  [Share] [Close]                                             │
└──────────────────────────────────────────────────────────────┘
```

### 9.4 Leaderboard (Opt-In)

**Route:** `/loyalty/leaderboard`

```
┌──────────────────────────────────────────────────────────────┐
│  ◀ Loyalty              Leaderboard                          │
├──────────────────────────────────────────────────────────────┤
│  [Points] [Visits] [Spending]                                │
│  [All Time] [This Month] [This Week]                         │
│                                                               │
│  Your Rank: #23                                              │
│                                                               │
│  Top 100:                                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. 👑 Sarah K. (Platinum)          12,450 pts          │ │
│  │ 2. 🥈 Mike L. (VIP)                11,200 pts          │ │
│  │ 3. 🥉 Jessica M. (Platinum)        10,800 pts          │ │
│  │ ...                                                     │ │
│  │ 23. You (Gold)                      2,450 pts          │ │
│  │ ...                                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ℹ️ Only members who opt-in appear on the leaderboard       │
└──────────────────────────────────────────────────────────────┘
```

### 9.5 Venue Admin: Loyalty Dashboard

**Route:** `/dashboard/loyalty`

```
┌──────────────────────────────────────────────────────────────┐
│  Loyalty Program Overview                                    │
├──────────────────────────────────────────────────────────────┤
│  Summary Cards:                                              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐    │
│  │ Active Members│ │  Points Issued│ │ Redemption Rate│   │
│  │     1,245     │ │    485,000    │ │      42%       │   │
│  │  +8% vs LM    │ │  +12% vs LM   │ │   Target: 50%  │   │
│  └───────────────┘ └───────────────┘ └───────────────┘    │
│                                                               │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐    │
│  │   Avg Visits  │ │  Revenue Lift │ │   Program ROI  │   │
│  │    3.8/mo     │ │      +22%     │ │     180%       │   │
│  └───────────────┘ └───────────────┘ └───────────────┘    │
├──────────────────────────────────────────────────────────────┤
│  Member Tier Distribution:                                   │
│  Bronze: ████████░░ 48%  |  Silver: ████░░░░░░ 28%         │
│  Gold:   ██░░░░░░░░ 18%  |  Platinum: █░░░░░░░░ 6%         │
│                                                               │
│  Quick Actions:                                              │
│  [Create Challenge] [Add Reward] [Export Members]           │
└──────────────────────────────────────────────────────────────┘
```

---

## 10. Implementation Roadmap

### 10.1 Phase-by-Phase Breakdown

**Phase 1: Core Loyalty (Sprint 1-2, 2 weeks)**
- [ ] Database schema (Prisma models: LoyaltyMember, PointsTransaction, LoyaltyReward)
- [ ] Points accrual API (automatic on order payment)
- [ ] Points balance query API
- [ ] Basic UI: Loyalty home screen with points balance
- [ ] Integration: Express Checkout → loyalty points

**Phase 2: Tier System (Sprint 3, 1 week)**
- [ ] Tier progression logic
- [ ] Tier benefits (earn multipliers, trust score boost)
- [ ] Tier upgrade notifications
- [ ] UI: Tier badge display, progress bar

**Phase 3: Rewards Catalog (Sprint 4-5, 2 weeks)**
- [ ] Reward creation (admin UI)
- [ ] Redemption API (validate, deduct points, create redemption)
- [ ] Apply reward to order (POS integration)
- [ ] QR code generation for redemptions
- [ ] UI: Reward catalog, redemption flow

**Phase 4: Gamification (Sprint 6-7, 2 weeks)**
- [ ] Badge system (criteria evaluation, unlock logic)
- [ ] Challenge system (progress tracking, completion rewards)
- [ ] Visit streak tracking (daily cron job)
- [ ] Leaderboards (opt-in, privacy controls)
- [ ] UI: Badge collection, challenge cards, leaderboard

**Phase 5: Analytics & Optimization (Sprint 8, 1 week)**
- [ ] ROI dashboard (lift calculation, program cost)
- [ ] Member segmentation (RFM analysis)
- [ ] Engagement reports (active vs inactive members)
- [ ] A/B testing framework (test reward values, tier thresholds)

**Phase 6: Advanced Features (Sprint 9-10, 2 weeks)**
- [ ] Cross-venue coalition (earn/redeem at partner venues)
- [ ] Points expiration (cron job, notifications)
- [ ] Referral program (invite friends, bonus points)
- [ ] Social sharing (badge achievements, check-ins)
- [ ] Push notification campaigns (targeted by segment)

**Total Estimated Timeline:** 10 sprints (20 weeks)

### 10.2 Technical Dependencies

**Critical Path:**
1. User authentication system (required for loyalty membership)
2. Order/payment system (required for points accrual)
3. Push notification infrastructure (for engagement)
4. Analytics pipeline (for ROI tracking)

**External Integrations:**
- **Stripe:** Payment webhooks trigger points accrual
- **Twilio/SendGrid:** SMS/email notifications
- **Firebase/OneSignal:** Push notifications
- **S3/Cloudinary:** Badge icons, reward images

---

## 11. Non-Functional Requirements

### 11.1 Performance

| Metric | Target |
|--------|--------|
| Points accrual (on order payment) | < 1 second |
| Points balance query | < 200ms |
| Reward redemption | < 1 second |
| Leaderboard query (top 100) | < 500ms |
| Badge unlock check | < 300ms |
| Dashboard load (admin) | < 1.5 seconds |

**Optimization:**
- **Caching:** Redis cache for points balances (TTL 5 min)
- **Batch Processing:** Daily cron for tier updates, badge checks
- **Database Indexing:** Composite indexes on `memberId + createdAt`, `pointsLifetime DESC`

### 11.2 Scalability

**Expected Load:**
- 10,000 active members per venue
- 1,000 points transactions/hour during peak
- 100 reward redemptions/day

**Scaling Strategy:**
- Points accrual: Async processing via BullMQ queue
- Leaderboard: Pre-computed daily, cached in Redis
- Badge unlocks: Event-driven (trigger on points milestone)

### 11.3 Security & Privacy

**Data Protection:**
- PII (name, email) encrypted at rest
- Leaderboard opt-in only (default: private)
- GDPR compliance: Data export, right to be forgotten

**Fraud Prevention:**
- Rate limiting on reward redemptions (max 10/hour)
- Anomaly detection (sudden points spikes → manual review)
- QR codes expire after 30 days, single-use only

### 11.4 Testing Strategy

**Unit Tests:**
- Points accrual calculation (tier multipliers, bonuses)
- Tier upgrade logic
- Badge criteria evaluation
- ROI calculation

**Integration Tests:**
- End-to-end: Order payment → points accrual → tier check → notification
- Redemption flow: Redeem → apply to order → mark as used
- Challenge completion: Visit → update progress → award points

**Load Tests:**
- 1,000 concurrent points accruals
- 10,000 leaderboard queries

---

## 12. Success Metrics & KPIs

### 12.1 Adoption Metrics (3-Month Post-Launch)

| Metric | Target |
|--------|--------|
| Enrollment Rate | 60% of customers |
| Active Members | 70% of enrolled (visited last 30 days) |
| Avg Points Balance | 500 pts |
| Tier Distribution | Bronze: 50%, Silver: 30%, Gold: 15%, Platinum: 5% |

### 12.2 Engagement Metrics

| Metric | Target |
|--------|--------|
| Avg Visits/Month (Members) | 3.5 vs 1.8 (non-members) |
| Avg Check Size (Members) | +18% vs non-members |
| Redemption Rate | 50% (points redeemed / points earned) |
| Badge Unlock Rate | 5 badges avg per member |
| Challenge Completion Rate | 30% of participants |

### 12.3 Business Impact

| Metric | Target |
|--------|--------|
| Revenue Lift | +20% from loyalty members |
| CLV Increase | 2.5x for active members |
| Program ROI | 150-200% |
| Retention Rate (90-day) | 75% for members vs 40% non-members |

---

## 13. Future Enhancements

### 13.1 Personalization Engine

**AI-Powered Recommendations:**
- "You're 50 points away from a free dessert. Order today!"
- "Your favorite burger is on special. Earn 2x points."
- Dynamic reward suggestions based on order history

### 13.2 Social Features

- **Group Challenges:** "Dine with 3 friends this month"
- **Social Leaderboards:** Compete with friends only
- **Check-In Sharing:** Post visit to social media, earn bonus points

### 13.3 NFT Badges (Web3)

- **Exclusive NFT Badges:** For VIP members, limited edition events
- **Marketplace:** Trade/sell rare badges
- **Cross-Platform:** Use badges across restaurant ecosystem

### 13.4 Subscription Tiers

- **Premium Membership:** $9.99/mo for 2x points, free delivery, priority support
- **Family Plans:** Share points/rewards across household

---

## Appendix A: Sample Queries

### A.1 Get Member Details with Balance

```sql
SELECT 
  lm.id,
  u.name,
  u.email,
  lm.currentTier,
  lm.pointsBalance,
  lm.pointsLifetime,
  lm.visitCount,
  lm.streakDays,
  lm.lastVisitAt
FROM "LoyaltyMember" lm
JOIN "User" u ON lm.userId = u.id
WHERE lm.id = $1;
```

### A.2 Top Rewards by Redemptions

```sql
SELECT 
  lr.name,
  lr.pointsCost,
  COUNT(rr.id) AS redemption_count,
  SUM(rr.discountAmount) AS total_value
FROM "LoyaltyReward" lr
LEFT JOIN "RewardRedemption" rr ON lr.id = rr.rewardId
WHERE lr.venueId = $1
  AND lr.isActive = true
GROUP BY lr.id, lr.name, lr.pointsCost
ORDER BY redemption_count DESC
LIMIT 10;
```

### A.3 Member Lifetime Value (LTV)

```sql
WITH member_orders AS (
  SELECT 
    lm.id AS member_id,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent,
    MIN(o.createdAt) AS first_order,
    MAX(o.createdAt) AS last_order
  FROM "LoyaltyMember" lm
  JOIN "User" u ON lm.userId = u.id
  JOIN "Order" o ON u.id = o.userId
  WHERE o.status = 'COMPLETED'
  GROUP BY lm.id
)
SELECT 
  member_id,
  order_count,
  total_spent AS ltv,
  EXTRACT(EPOCH FROM (last_order - first_order)) / 86400 AS days_active,
  total_spent / NULLIF(order_count, 0) AS avg_order_value
FROM member_orders
ORDER BY ltv DESC;
```

---

**Document Status:** ✅ Complete  
**Next Steps:** Review with product/marketing teams → Begin Phase 1 implementation  
**Questions/Feedback:** Contact Crowdiant Platform Team
