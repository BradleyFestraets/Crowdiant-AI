# Customer Loyalty & Gamification - Feature Deep Dive

## Executive Summary

**Feature Name:** Customer Loyalty & Gamification System  
**Category:** Customer Retention & Revenue Growth  
**Priority:** P2 - Growth Feature (Sprint 13)  
**Complexity:** High (points engine, tier progression, gamification mechanics, cross-venue coalition)  
**Primary Value:** Transform one-time diners into repeat customers, increase lifetime value 2-3x

### The Core Problem

**Restaurants struggle with customer retention:**

**The Leaky Bucket:**
- 80% of customers visit once, never return
- Average customer lifespan: 1-2 visits
- High acquisition cost ($20-50/customer via ads)
- No organic retention mechanism

**Why Traditional Loyalty Programs Fail:**
- **Paper punch cards** → Lost, forgotten, requires physical card
- **Separate loyalty apps** → Low adoption, friction (download, login, scan)
- **Points-only systems** → Boring, no emotional connection
- **Complex redemption** → Confusing rules, feels like work

**Industry Impact:**
- Cost 5-10x more to acquire new customer than retain existing
- Loyalty members visit 3-4x more frequently
- Loyalty members spend 20-30% more per visit
- But only 15-20% of restaurants have effective loyalty programs

### The Solution

Crowdiant's Loyalty & Gamification system uses:
1. **Automatic enrollment** (no separate app, built into Express Checkout)
2. **Instant points** (earn on every purchase, no friction)
3. **Tier progression** (Bronze → Silver → Gold → Platinum with clear benefits)
4. **Gamification** (badges, challenges, streaks, leaderboards)
5. **Cross-venue coalition** (earn/redeem at any Crowdiant venue)
6. **Trust integration** (loyalty tiers boost trust score)
7. **Smart redemption** (AI suggests best rewards based on preferences)

**Result:** 30% increase in visit frequency, 20% higher average check, 3x customer lifetime value

---

## Part 1: The Psychology of Loyalty

### Why Points Work (Endowment Effect)

**Behavioral economics principle:**
- **Endowment Effect:** People value what they own
- Customers with 347 points feel "I have something here"
- Loss aversion: "I'll lose my points if I don't visit"

**Example scenario:**
- Customer has 347 points (worth ~$3.47 in rewards)
- Competing restaurant is slightly closer
- **Result:** Customer drives past competitor to not "lose" their points

### Why Gamification Multiplies Engagement

**Traditional loyalty:** "Spend $100, get $5 off" → Transactional, boring

**Gamified loyalty:** "Unlock the 'Weekend Warrior' badge by visiting 3 Saturdays in a row!" → Emotional, fun

**Key gamification mechanics:**

1. **Progress bars** → Visual satisfaction ("I'm 80% to Gold!")
2. **Achievements** → Social validation ("I earned 'Beer Connoisseur' badge")
3. **Challenges** → Time-bound goals ("Visit 5 times in 30 days for 500 bonus points!")
4. **Leaderboards** → Competition ("I'm #3 at my favorite bar!")
5. **Streaks** → Habit formation ("7-day visit streak!")

**Result:** Loyalty becomes a game, not a chore

---

## Part 2: Points System Architecture

### Earning Points

**Base earn rate: 1 point per $1 spent**

```typescript
interface PointsTransaction {
  id: string;
  memberId: string;
  type: 'EARN' | 'REDEEM' | 'BONUS' | 'ADJUSTMENT' | 'EXPIRATION';
  points: number;
  description: string;
  
  // Context
  tabId?: string;         // If earned from purchase
  rewardId?: string;      // If redeemed for reward
  venueId: string;
  
  // Metadata
  multiplier?: number;    // Tier multiplier (1.0, 1.5, 2.0)
  bonusReason?: string;   // "Birthday", "First visit", "Challenge completed"
  
  createdAt: Date;
}

// Calculate points from purchase
function calculatePointsEarned(
  transaction: TabTransaction,
  member: LoyaltyMember
): number {
  // Base points (1 point per $1)
  let points = Math.floor(transaction.totalCents / 100);
  
  // Apply tier multiplier
  const multiplier = getTierMultiplier(member.currentTier);
  points = Math.floor(points * multiplier);
  
  // Bonus: First visit
  if (member.visitCount === 1) {
    points += 100; // Welcome bonus
  }
  
  // Bonus: Birthday month
  if (isBirthdayMonth(member.userId)) {
    points += 50;
  }
  
  // Bonus: Active challenge
  const activeChallenge = await getActiveChallengeProgress(member.id);
  if (activeChallenge?.bonusMultiplier) {
    points = Math.floor(points * activeChallenge.bonusMultiplier);
  }
  
  return points;
}

// Tier multipliers
const TIER_MULTIPLIERS = {
  BRONZE: 1.0,    // 1 point per $1
  SILVER: 1.25,   // 1.25 points per $1
  GOLD: 1.5,      // 1.5 points per $1
  PLATINUM: 2.0,  // 2 points per $1
};
```

### Points Posting (Fraud Prevention)

**Points post 24 hours after visit** to prevent fraud:

```typescript
// When tab closes
async function closeTab(tabId: string) {
  const tab = await getTab(tabId);
  
  // Capture payment
  await capturePayment(tab);
  
  // Schedule points accrual (24 hours later)
  await scheduleJob('award-loyalty-points', {
    tabId,
    memberId: tab.customer.loyaltyMemberId,
    points: calculatePointsEarned(tab, tab.customer.loyaltyMember),
  }, { delay: '24h' });
  
  // Show pending points on receipt
  await sendReceipt(tab, {
    pointsPending: points,
    pointsAvailableAt: addHours(new Date(), 24),
  });
}

// Background job (24 hours later)
async function awardPendingPoints(job: Job) {
  const { tabId, memberId, points } = job.data;
  
  // Verify payment wasn't refunded
  const tab = await getTab(tabId);
  if (tab.status === 'REFUNDED') {
    return; // Don't award points for refunded purchases
  }
  
  // Award points
  await createPointsTransaction({
    memberId,
    type: 'EARN',
    points,
    description: `Earned from purchase at ${tab.venue.name}`,
    tabId,
    venueId: tab.venueId,
  });
  
  // Update balance
  await incrementPointsBalance(memberId, points);
  
  // Send notification
  await sendNotification(memberId, {
    type: 'POINTS_EARNED',
    message: `You earned ${points} points from your visit to ${tab.venue.name}!`,
  });
}
```

### Points Expiration (Optional)

**Configurable expiration to encourage activity:**

```typescript
interface PointsExpirationPolicy {
  enabled: boolean;
  expirationMonths: number; // 12 months default
  warningDays: number;      // 30 days warning before expiration
  expirationTier: 'ALL' | 'BRONZE_ONLY'; // Only expire for inactive members
}

// Check for expiring points daily
async function checkPointsExpiration() {
  const policy = await getVenueExpirationPolicy(venueId);
  
  if (!policy.enabled) return;
  
  const expirationDate = subMonths(new Date(), policy.expirationMonths);
  const warningDate = addDays(expirationDate, policy.warningDays);
  
  // Find transactions about to expire
  const expiringTransactions = await db.pointsTransaction.findMany({
    where: {
      type: 'EARN',
      createdAt: { lt: expirationDate },
      expired: false,
    },
  });
  
  for (const tx of expiringTransactions) {
    // Send warning 30 days before expiration
    if (tx.createdAt <= warningDate) {
      await sendExpirationWarning(tx.memberId, tx.points, tx.createdAt);
    }
    
    // Expire points
    if (tx.createdAt <= expirationDate) {
      await expirePoints(tx);
    }
  }
}
```

---

## Part 3: Tier Progression System

### Four-Tier Structure

**Bronze → Silver → Gold → Platinum**

```typescript
enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

interface TierConfig {
  tier: LoyaltyTier;
  
  // Requirements (customer must meet ONE of these)
  minLifetimePoints: number;
  minLifetimeSpend: number; // in cents
  minVisits: number;
  
  // Benefits
  pointsMultiplier: number;  // 1.0, 1.25, 1.5, 2.0
  perks: TierPerk[];
  
  // Display
  name: string;
  color: string;
  icon: string;
  badgeUrl: string;
}

const DEFAULT_TIER_CONFIG: TierConfig[] = [
  {
    tier: LoyaltyTier.BRONZE,
    minLifetimePoints: 0,
    minLifetimeSpend: 0,
    minVisits: 0,
    pointsMultiplier: 1.0,
    perks: [
      'Earn 1 point per $1 spent',
      'Birthday bonus (+50 points)',
    ],
    name: 'Bronze',
    color: '#CD7F32',
    icon: '🥉',
  },
  {
    tier: LoyaltyTier.SILVER,
    minLifetimePoints: 500,
    minLifetimeSpend: 50000, // $500
    minVisits: 5,
    pointsMultiplier: 1.25,
    perks: [
      'Earn 1.25 points per $1 spent',
      'Birthday bonus (+100 points)',
      'Priority seating (when available)',
      'Trust score boost (+50 points)',
    ],
    name: 'Silver',
    color: '#C0C0C0',
    icon: '🥈',
  },
  {
    tier: LoyaltyTier.GOLD,
    minLifetimePoints: 2000,
    minLifetimeSpend: 200000, // $2,000
    minVisits: 20,
    pointsMultiplier: 1.5,
    perks: [
      'Earn 1.5 points per $1 spent',
      'Birthday reward (free dessert)',
      'Exclusive menu items',
      'Trust score boost (+100 points)',
      'Early access to events',
    ],
    name: 'Gold',
    color: '#FFD700',
    icon: '🥇',
  },
  {
    tier: LoyaltyTier.PLATINUM,
    minLifetimePoints: 5000,
    minLifetimeSpend: 500000, // $5,000
    minVisits: 50,
    pointsMultiplier: 2.0,
    perks: [
      'Earn 2 points per $1 spent',
      'Birthday reward (free entree)',
      'Complimentary drink on arrival',
      'Guaranteed reservations',
      'Trust score boost (+200 points)',
      'VIP events invitation',
      'Dedicated support',
    ],
    name: 'Platinum',
    color: '#E5E4E2',
    icon: '💎',
  },
];
```

### Automatic Tier Upgrades

**Check after every points transaction:**

```typescript
async function checkTierUpgrade(memberId: string): Promise<void> {
  const member = await getLoyaltyMember(memberId);
  const tierConfigs = await getTierConfigs(member.venueId);
  
  // Find highest tier customer qualifies for
  let newTier = LoyaltyTier.BRONZE;
  
  for (const config of tierConfigs.sort((a, b) => b.minLifetimePoints - a.minLifetimePoints)) {
    const qualifies =
      member.pointsLifetime >= config.minLifetimePoints ||
      member.lifetimeSpendCents >= config.minLifetimeSpend ||
      member.visitCount >= config.minVisits;
    
    if (qualifies) {
      newTier = config.tier;
      break;
    }
  }
  
  // Upgrade if higher tier
  if (getTierValue(newTier) > getTierValue(member.currentTier)) {
    await upgradeTier(member, newTier);
  }
}

async function upgradeTier(
  member: LoyaltyMember,
  newTier: LoyaltyTier
): Promise<void> {
  const oldTier = member.currentTier;
  
  // Update tier
  await updateLoyaltyMember(member.id, {
    currentTier: newTier,
    tierSince: new Date(),
  });
  
  // Award tier upgrade badge
  await awardBadge(member.id, {
    type: 'TIER_ACHIEVED',
    tier: newTier,
    name: `${newTier} Member`,
    description: `Achieved ${newTier} tier status`,
  });
  
  // Apply trust score boost
  const trustBoost = getTierTrustBoost(newTier);
  if (trustBoost > 0) {
    await logTrustEvent(member.userId, {
      type: 'LOYALTY_TIER_UPGRADE',
      impact: trustBoost,
      metadata: { oldTier, newTier },
    });
  }
  
  // Send celebration notification
  await sendNotification(member.userId, {
    type: 'TIER_UPGRADE',
    title: `Congratulations! You're now ${newTier}! 🎉`,
    body: `You've unlocked ${getTierPerks(newTier).length} new benefits.`,
    action: 'View Benefits',
    actionUrl: '/loyalty/tiers',
  });
  
  // Send email with tier benefits
  await sendEmail(member.user.email, {
    template: 'tier-upgrade',
    data: {
      oldTier,
      newTier,
      perks: getTierPerks(newTier),
    },
  });
}
```

### Tier Progress Visualization

**Show customer how close to next tier:**

```
┌─────────────────────────────────────────┐
│ Your Loyalty Status                      │
├─────────────────────────────────────────┤
│                                          │
│ 🥈 Silver Member                         │
│                                          │
│ Progress to Gold:                        │
│ ████████░░░░ 67% (1,340 / 2,000 points) │
│                                          │
│ You're 660 points away from Gold! 🥇     │
│                                          │
│ Silver Benefits:                         │
│ ✓ Earn 1.25 points per $1                │
│ ✓ Birthday bonus (+100 points)          │
│ ✓ Priority seating                       │
│ ✓ Trust score boost (+50)                │
│                                          │
│ Unlock at Gold:                          │
│ 🔒 Earn 1.5 points per $1                │
│ 🔒 Free birthday dessert                 │
│ 🔒 Exclusive menu items                  │
│ 🔒 Trust score boost (+100)              │
│                                          │
└─────────────────────────────────────────┘
```

---

## Part 4: Reward Catalog & Redemption

### Types of Rewards

```typescript
enum RewardType {
  PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT', // 10% off
  FIXED_DISCOUNT = 'FIXED_DISCOUNT',           // $5 off
  FREE_ITEM = 'FREE_ITEM',                     // Free appetizer
  EXCLUSIVE_ACCESS = 'EXCLUSIVE_ACCESS',       // VIP event
  CUSTOM = 'CUSTOM',                           // Venue-specific
}

interface Reward {
  id: string;
  venueId: string;
  
  // Basic info
  name: string;
  description: string;
  imageUrl?: string;
  
  // Cost
  pointsCost: number;
  
  // Type & value
  type: RewardType;
  value: number;           // Percentage (10) or amount in cents (500)
  menuItemId?: string;     // If FREE_ITEM
  
  // Availability
  active: boolean;
  availableFrom?: Date;
  availableUntil?: Date;
  maxRedemptionsPerDay?: number;
  maxRedemptionsPerMember?: number;
  
  // Restrictions
  minPurchaseAmount?: number; // Must spend $X to use discount
  tierRestriction?: LoyaltyTier[]; // Only Gold+
  dayOfWeekRestriction?: number[]; // Only weekdays
  
  // Inventory (for FREE_ITEM)
  inventoryTracked: boolean;
  inventoryRemaining?: number;
  
  // Analytics
  totalRedemptions: number;
  totalPointsRedeemed: number;
}

// Example rewards
const EXAMPLE_REWARDS: Reward[] = [
  {
    name: '$5 Off Your Next Visit',
    pointsCost: 500,
    type: RewardType.FIXED_DISCOUNT,
    value: 500, // $5 in cents
    minPurchaseAmount: 2000, // Must spend $20
  },
  {
    name: '10% Off Entire Check',
    pointsCost: 750,
    type: RewardType.PERCENTAGE_DISCOUNT,
    value: 10, // 10%
    minPurchaseAmount: 1500, // Must spend $15
  },
  {
    name: 'Free Appetizer',
    pointsCost: 600,
    type: RewardType.FREE_ITEM,
    menuItemId: 'wings-buffalo',
    inventoryTracked: true,
    inventoryRemaining: 50,
  },
  {
    name: 'Free Birthday Dessert',
    pointsCost: 0, // Free for tier benefit
    type: RewardType.FREE_ITEM,
    menuItemId: 'dessert-cake',
    tierRestriction: [LoyaltyTier.GOLD, LoyaltyTier.PLATINUM],
  },
  {
    name: 'VIP Tasting Event',
    pointsCost: 2000,
    type: RewardType.EXCLUSIVE_ACCESS,
    maxRedemptionsPerMember: 1,
    availableUntil: new Date('2025-12-31'),
  },
];
```

### Redemption Flow

**Customer redeems reward at checkout:**

```typescript
async function redeemReward(
  memberId: string,
  rewardId: string,
  tabId: string
): Promise<RewardRedemption> {
  const member = await getLoyaltyMember(memberId);
  const reward = await getReward(rewardId);
  const tab = await getTab(tabId);
  
  // Validate redemption
  await validateRedemption(member, reward, tab);
  
  // Deduct points
  await createPointsTransaction({
    memberId,
    type: 'REDEEM',
    points: -reward.pointsCost,
    description: `Redeemed: ${reward.name}`,
    rewardId,
  });
  
  await incrementPointsBalance(memberId, -reward.pointsCost);
  
  // Apply reward to tab
  const redemption = await applyRewardToTab(tab, reward);
  
  // Decrement inventory (if tracked)
  if (reward.inventoryTracked) {
    await decrementRewardInventory(rewardId);
  }
  
  // Send confirmation
  await sendNotification(member.userId, {
    type: 'REWARD_REDEEMED',
    message: `You redeemed ${reward.name}! Enjoy!`,
  });
  
  return redemption;
}

// Validation rules
async function validateRedemption(
  member: LoyaltyMember,
  reward: Reward,
  tab: Tab
): Promise<void> {
  // Sufficient points?
  if (member.pointsBalance < reward.pointsCost) {
    throw new Error('Insufficient points');
  }
  
  // Reward active?
  if (!reward.active) {
    throw new Error('Reward not available');
  }
  
  // Date restrictions?
  if (reward.availableFrom && new Date() < reward.availableFrom) {
    throw new Error('Reward not yet available');
  }
  if (reward.availableUntil && new Date() > reward.availableUntil) {
    throw new Error('Reward expired');
  }
  
  // Tier restrictions?
  if (reward.tierRestriction && !reward.tierRestriction.includes(member.currentTier)) {
    throw new Error('Your tier does not qualify for this reward');
  }
  
  // Min purchase amount?
  if (reward.minPurchaseAmount && tab.subtotal < reward.minPurchaseAmount) {
    throw new Error(`Minimum purchase $${reward.minPurchaseAmount / 100} required`);
  }
  
  // Day of week restrictions?
  if (reward.dayOfWeekRestriction) {
    const today = new Date().getDay();
    if (!reward.dayOfWeekRestriction.includes(today)) {
      throw new Error('Reward not available on this day');
    }
  }
  
  // Inventory available?
  if (reward.inventoryTracked && reward.inventoryRemaining! <= 0) {
    throw new Error('Reward out of stock');
  }
  
  // Max redemptions per member?
  if (reward.maxRedemptionsPerMember) {
    const redemptionCount = await countMemberRedemptions(member.id, reward.id);
    if (redemptionCount >= reward.maxRedemptionsPerMember) {
      throw new Error('Maximum redemptions reached');
    }
  }
}
```

### Smart Reward Suggestions

**AI recommends best rewards based on preferences:**

```typescript
async function getSuggestedRewards(
  memberId: string,
  tabId: string
): Promise<Reward[]> {
  const member = await getLoyaltyMember(memberId);
  const tab = await getTab(tabId);
  const purchaseHistory = await getPurchaseHistory(member.userId);
  
  // Get affordable rewards (sufficient points)
  const affordable = await getRewards({
    venueId: tab.venueId,
    maxPoints: member.pointsBalance,
    active: true,
  });
  
  // Score each reward by relevance
  const scored = affordable.map(reward => ({
    reward,
    score: calculateRewardRelevance(reward, purchaseHistory, tab),
  }));
  
  // Sort by score, return top 3
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.reward);
}

function calculateRewardRelevance(
  reward: Reward,
  history: PurchaseHistory,
  tab: Tab
): number {
  let score = 0;
  
  // Free item customer has ordered before? High relevance
  if (reward.type === 'FREE_ITEM' && history.menuItems.includes(reward.menuItemId!)) {
    score += 50;
  }
  
  // Discount applicable to current tab? High relevance
  if (reward.type === 'PERCENTAGE_DISCOUNT' && tab.subtotal > 2000) {
    score += 40;
  }
  
  // Close to expiration? Urgent
  if (reward.availableUntil && differenceInDays(reward.availableUntil, new Date()) < 7) {
    score += 30;
  }
  
  // Popular reward? Social proof
  if (reward.totalRedemptions > 100) {
    score += 20;
  }
  
  return score;
}
```

---

## Part 5: Gamification Mechanics

### Badges (Achievements)

**Unlock badges for milestones:**

```typescript
enum BadgeCategory {
  VISITS = 'VISITS',           // Visit-based (First Visit, 10th Visit)
  SPENDING = 'SPENDING',       // Spend-based (Big Spender, High Roller)
  ITEMS = 'ITEMS',             // Item-based (Beer Connoisseur, Burger Lover)
  TIME = 'TIME',               // Time-based (Night Owl, Brunch Buddy)
  SOCIAL = 'SOCIAL',           // Social (Brought a Friend, Group Organizer)
  SPECIAL = 'SPECIAL',         // Special events (Grand Opening, Anniversary)
}

interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  iconUrl: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  
  // Unlock criteria
  criteria: BadgeCriteria;
  
  // Rewards
  pointsBonus?: number;      // Award X points when unlocked
  tierBoost?: number;        // Counts toward tier progress
  
  // Stats
  totalAwarded: number;      // How many members have this badge
  awardedPercentage: number; // % of members with this badge
}

interface BadgeCriteria {
  type: 'VISIT_COUNT' | 'TOTAL_SPENT' | 'ITEM_ORDERED' | 'TIME_OF_DAY' | 'CUSTOM';
  
  // Visit count
  minVisits?: number;
  
  // Spending
  minTotalSpent?: number;
  minSinglePurchase?: number;
  
  // Items
  menuItemId?: string;
  menuCategoryId?: string;
  itemOrderCount?: number;
  
  // Time
  timeOfDayStart?: string;   // "22:00"
  timeOfDayEnd?: string;     // "02:00"
  dayOfWeek?: number[];
  
  // Custom logic
  customCheckFunction?: string; // Name of function to execute
}

// Example badges
const EXAMPLE_BADGES: Badge[] = [
  {
    name: 'First Timer',
    description: 'Completed your first visit!',
    category: BadgeCategory.VISITS,
    rarity: 'COMMON',
    criteria: { type: 'VISIT_COUNT', minVisits: 1 },
    pointsBonus: 50,
  },
  {
    name: 'Regular',
    description: 'Visited 10 times',
    category: BadgeCategory.VISITS,
    rarity: 'RARE',
    criteria: { type: 'VISIT_COUNT', minVisits: 10 },
    pointsBonus: 200,
  },
  {
    name: 'Superfan',
    description: 'Visited 50 times!',
    category: BadgeCategory.VISITS,
    rarity: 'EPIC',
    criteria: { type: 'VISIT_COUNT', minVisits: 50 },
    pointsBonus: 1000,
  },
  {
    name: 'High Roller',
    description: 'Spent over $500 in a single visit',
    category: BadgeCategory.SPENDING,
    rarity: 'LEGENDARY',
    criteria: { type: 'TOTAL_SPENT', minSinglePurchase: 50000 },
    pointsBonus: 500,
  },
  {
    name: 'Beer Connoisseur',
    description: 'Tried 20 different beers',
    category: BadgeCategory.ITEMS,
    rarity: 'RARE',
    criteria: { type: 'ITEM_ORDERED', menuCategoryId: 'beer', itemOrderCount: 20 },
    pointsBonus: 300,
  },
  {
    name: 'Night Owl',
    description: 'Visited after 10 PM on 5 occasions',
    category: BadgeCategory.TIME,
    rarity: 'RARE',
    criteria: { type: 'TIME_OF_DAY', timeOfDayStart: '22:00', minVisits: 5 },
    pointsBonus: 150,
  },
  {
    name: 'Weekend Warrior',
    description: 'Visited 3 consecutive weekends',
    category: BadgeCategory.TIME,
    rarity: 'EPIC',
    criteria: { type: 'CUSTOM', customCheckFunction: 'checkConsecutiveWeekends' },
    pointsBonus: 250,
  },
];

// Check for badge unlocks after every visit
async function checkBadgeUnlocks(memberId: string): Promise<void> {
  const member = await getLoyaltyMember(memberId);
  const allBadges = await getBadges();
  const memberBadges = await getMemberBadges(memberId);
  const memberBadgeIds = memberBadges.map(b => b.badgeId);
  
  for (const badge of allBadges) {
    // Already unlocked?
    if (memberBadgeIds.includes(badge.id)) continue;
    
    // Check criteria
    const unlocked = await checkBadgeCriteria(member, badge.criteria);
    
    if (unlocked) {
      await awardBadge(member, badge);
    }
  }
}

async function awardBadge(member: LoyaltyMember, badge: Badge): Promise<void> {
  // Create member badge
  await createMemberBadge({
    memberId: member.id,
    badgeId: badge.id,
    awardedAt: new Date(),
  });
  
  // Award points bonus
  if (badge.pointsBonus) {
    await createPointsTransaction({
      memberId: member.id,
      type: 'BONUS',
      points: badge.pointsBonus,
      description: `Badge unlocked: ${badge.name}`,
    });
  }
  
  // Send celebration notification
  await sendNotification(member.userId, {
    type: 'BADGE_UNLOCKED',
    title: `You earned a badge! ${badge.name} ${getRarityEmoji(badge.rarity)}`,
    body: badge.description,
    imageUrl: badge.iconUrl,
  });
}
```

### Challenges (Time-Bound Goals)

**Drive specific behaviors with challenges:**

```typescript
interface Challenge {
  id: string;
  venueId: string;
  
  // Basic info
  name: string;
  description: string;
  imageUrl?: string;
  
  // Duration
  startDate: Date;
  endDate: Date;
  
  // Goal
  goalType: 'VISIT_COUNT' | 'TOTAL_SPENT' | 'ITEM_ORDERED' | 'REFERRAL';
  goalValue: number;        // e.g., 5 visits
  goalMenuItemId?: string;  // If item-specific
  
  // Reward
  rewardPoints: number;
  rewardBadgeId?: string;
  rewardCustom?: string;    // "Free appetizer"
  
  // Restrictions
  tierRestriction?: LoyaltyTier[];
  maxParticipants?: number;
  
  // Stats
  participantCount: number;
  completionCount: number;
}

// Example challenges
const EXAMPLE_CHALLENGES: Challenge[] = [
  {
    name: 'Visit 5 Times in 30 Days',
    description: 'Come back 5 times this month and earn 500 bonus points!',
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-31'),
    goalType: 'VISIT_COUNT',
    goalValue: 5,
    rewardPoints: 500,
  },
  {
    name: 'Try Our New Menu',
    description: 'Order 3 items from our new menu and get a free dessert!',
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-15'),
    goalType: 'ITEM_ORDERED',
    goalValue: 3,
    goalMenuItemId: 'category:new-menu',
    rewardCustom: 'Free dessert',
  },
  {
    name: 'Bring a Friend',
    description: 'Refer 3 friends to Crowdiant and earn 1000 points!',
    startDate: new Date('2025-12-01'),
    endDate: new Date('2026-01-31'),
    goalType: 'REFERRAL',
    goalValue: 3,
    rewardPoints: 1000,
  },
];

// Track challenge progress
interface ChallengeProgress {
  id: string;
  memberId: string;
  challengeId: string;
  currentValue: number;     // e.g., 3 of 5 visits
  completed: boolean;
  completedAt?: Date;
}

// Update progress after each visit
async function updateChallengeProgress(
  memberId: string,
  event: 'VISIT' | 'PURCHASE' | 'ITEM_ORDERED'
): Promise<void> {
  const activeChallenges = await getActiveChallenges(memberId);
  
  for (const challenge of activeChallenges) {
    const progress = await getChallengeProgress(memberId, challenge.id);
    
    // Increment progress based on event type
    if (event === 'VISIT' && challenge.goalType === 'VISIT_COUNT') {
      progress.currentValue += 1;
    } else if (event === 'ITEM_ORDERED' && challenge.goalType === 'ITEM_ORDERED') {
      // Check if item matches challenge
      const itemMatches = await checkItemMatchesChallenge(challenge);
      if (itemMatches) progress.currentValue += 1;
    }
    
    // Save progress
    await saveChallengeProgress(progress);
    
    // Check if completed
    if (progress.currentValue >= challenge.goalValue && !progress.completed) {
      await completeChallenge(memberId, challenge);
    }
  }
}

async function completeChallenge(
  memberId: string,
  challenge: Challenge
): Promise<void> {
  // Mark as completed
  await updateChallengeProgress(memberId, challenge.id, {
    completed: true,
    completedAt: new Date(),
  });
  
  // Award points
  await createPointsTransaction({
    memberId,
    type: 'BONUS',
    points: challenge.rewardPoints,
    description: `Challenge completed: ${challenge.name}`,
  });
  
  // Award badge (if any)
  if (challenge.rewardBadgeId) {
    await awardBadge(memberId, challenge.rewardBadgeId);
  }
  
  // Send celebration
  await sendNotification(memberId, {
    type: 'CHALLENGE_COMPLETED',
    title: `Challenge completed! 🎉`,
    body: `You earned ${challenge.rewardPoints} points for completing "${challenge.name}"!`,
  });
}
```

### Visit Streaks

**Encourage habit formation:**

```typescript
async function trackVisitStreak(memberId: string): Promise<void> {
  const member = await getLoyaltyMember(memberId);
  const lastVisit = member.lastVisitAt;
  const today = new Date();
  
  if (!lastVisit) {
    // First visit
    await updateLoyaltyMember(memberId, {
      streakDays: 1,
      lastVisitAt: today,
    });
    return;
  }
  
  const daysSinceLastVisit = differenceInDays(today, lastVisit);
  
  if (daysSinceLastVisit === 1) {
    // Consecutive day - increment streak
    const newStreak = member.streakDays + 1;
    await updateLoyaltyMember(memberId, {
      streakDays: newStreak,
      longestStreak: Math.max(newStreak, member.longestStreak),
      lastVisitAt: today,
    });
    
    // Milestone notifications
    if (newStreak === 7) {
      await sendNotification(memberId, {
        type: 'STREAK_MILESTONE',
        title: '7-day streak! 🔥',
        body: 'You\'re on fire! Keep it up!',
      });
      await awardBonusPoints(memberId, 100, '7-day streak bonus');
    } else if (newStreak === 30) {
      await sendNotification(memberId, {
        title: '30-day streak! 🏆',
        body: 'Incredible dedication!',
      });
      await awardBonusPoints(memberId, 500, '30-day streak bonus');
    }
    
  } else if (daysSinceLastVisit > 1) {
    // Streak broken
    await updateLoyaltyMember(memberId, {
      streakDays: 1, // Reset to 1 (today's visit)
      lastVisitAt: today,
    });
    
    // Gentle reminder if long streak was broken
    if (member.streakDays >= 7) {
      await sendNotification(memberId, {
        type: 'STREAK_BROKEN',
        title: 'Your streak ended',
        body: `You had a ${member.streakDays}-day streak! Start a new one today.`,
      });
    }
  }
}
```

### Leaderboards (Opt-In)

**Competitive element for engaged customers:**

```typescript
enum LeaderboardType {
  POINTS_THIS_MONTH = 'POINTS_THIS_MONTH',
  VISITS_THIS_MONTH = 'VISITS_THIS_MONTH',
  TOTAL_SPENDING = 'TOTAL_SPENDING',
  STREAK_DAYS = 'STREAK_DAYS',
}

interface LeaderboardEntry {
  rank: number;
  memberId: string;
  displayName: string;     // Anonymized or real name based on opt-in
  avatarUrl?: string;
  value: number;           // Points, visits, or spending
  badge?: string;          // "🥇" for #1, "🥈" for #2, etc.
}

async function getLeaderboard(
  venueId: string,
  type: LeaderboardType,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  // Only include members who opted in
  const members = await db.loyaltyMember.findMany({
    where: {
      venueId,
      optInLeaderboard: true,
      isActive: true,
    },
    orderBy: getLeaderboardOrderBy(type),
    take: limit,
  });
  
  return members.map((member, index) => ({
    rank: index + 1,
    memberId: member.id,
    displayName: member.optInPublicProfile 
      ? member.user.name 
      : `User ${member.id.slice(0, 6)}`,
    avatarUrl: member.optInPublicProfile ? member.user.image : undefined,
    value: getLeaderboardValue(member, type),
    badge: getRankBadge(index + 1),
  }));
}

// Display leaderboard in app
<Leaderboard type="POINTS_THIS_MONTH">
  {entries.map(entry => (
    <LeaderboardEntry key={entry.memberId}>
      <Rank>{entry.rank} {entry.badge}</Rank>
      <Avatar src={entry.avatarUrl} />
      <Name>{entry.displayName}</Name>
      <Value>{entry.value} points</Value>
    </LeaderboardEntry>
  ))}
  
  <YourRank>
    You're ranked #{yourRank} with {yourPoints} points
  </YourRank>
</Leaderboard>
```

---

## Part 6: Cross-Venue Coalition

### Network Effects of Multi-Venue Loyalty

**Earn/redeem points at any Crowdiant venue:**

```typescript
// Customer visits Venue A, earns 100 points
await awardPoints({
  memberId: 'member-123',
  venueId: 'venue-a',
  points: 100,
  source: 'PURCHASE',
});

// Customer visits Venue B, can redeem those points
await redeemReward({
  memberId: 'member-123',
  venueId: 'venue-b', // Different venue!
  rewardId: 'reward-xyz',
  points: 100,
});

// Points are global across all Crowdiant venues
```

### Venue Opt-In to Coalition

**Venues can join loyalty network:**

```typescript
interface VenueLoyaltyConfig {
  venueId: string;
  
  // Participation
  participatesInCoalition: boolean;
  
  // Earning rates
  pointsEarnRate: number;           // 1.0 = 1 point per $1
  tierMultipliers: Record<LoyaltyTier, number>;
  
  // Redemption settings
  allowCrossVenueRedemption: boolean; // Accept points earned elsewhere
  maxCrossVenueRedemptionPercent: number; // Max 50% of check can be cross-venue
  
  // Revenue sharing (for cross-venue redemptions)
  revenueSharePercent: number;      // Venue B pays 3% to Crowdiant when customer redeems Venue A points
}

// Example: Customer earned 500 points at Venue A
// Customer redeems 500 points ($5 off) at Venue B
// Venue B pays $5 to customer + 3% ($0.15) to Crowdiant platform
```

### Platform Moat Strategy

**Cross-venue loyalty creates switching cost:**

```
Customer has 2,347 points across 3 Crowdiant venues
    ↓
Competitor (single venue) must offer >$23 in value to switch
    ↓
Customer sticks with Crowdiant venues (lock-in effect)
```

---

## Part 7: Analytics & ROI Tracking

### Loyalty Program Dashboard

```
┌────────────────────────────────────────────────┐
│ Loyalty Program Performance                     │
├────────────────────────────────────────────────┤
│                                                 │
│ 👥 Total Members: 3,842                        │
│ 📈 Active Members (30 days): 1,204 (31%)       │
│ 🆕 New Members (this month): 127               │
│                                                 │
│ 💰 Member Value                                │
│ • Avg spend per member: $68.50 (vs $42 non-members) │
│ • Visit frequency: 3.2x/month (vs 1.1x non-members) │
│ • Customer lifetime value: $2,190 (vs $840)    │
│                                                 │
│ 🎁 Redemptions                                 │
│ • Total redemptions (month): 487                │
│ • Total points redeemed: 42,300 ($423 value)   │
│ • Avg redemption: 87 points                     │
│                                                 │
│ 📊 Tier Distribution                           │
│ • Bronze: 2,104 (55%)                           │
│ • Silver: 1,245 (32%)                           │
│ • Gold: 413 (11%)                               │
│ • Platinum: 80 (2%)                             │
│                                                 │
│ 🎮 Gamification Engagement                     │
│ • Badges unlocked: 1,842                        │
│ • Active challenges: 3                          │
│ • Challenge completion rate: 42%                │
│ • Leaderboard opt-ins: 318 (8%)                 │
│                                                 │
│ 💵 ROI Analysis                                │
│ • Cost of rewards: $4,230                       │
│ • Incremental revenue: $18,500                  │
│ • Net gain: $14,270                             │
│ • ROI: 437%                                     │
│                                                 │
└────────────────────────────────────────────────┘
```

### Member Segmentation

```typescript
// Identify high-value segments
const segments = {
  whales: await getMembers({ minLifetimeSpend: 500000 }), // $5K+ spent
  atrisk: await getMembers({ daysSinceLastVisit: 60 }),   // Haven't visited in 60 days
  champions: await getMembers({ tier: 'PLATINUM' }),
  newbies: await getMembers({ visitCount: 1 }),
  regulars: await getMembers({ visitCount: { gte: 10 } }),
};

// Targeted campaigns
await sendCampaign(segments.atrisk, {
  subject: 'We miss you!',
  content: 'Come back and get 100 bonus points',
  incentive: { type: 'BONUS_POINTS', value: 100 },
});
```

---

## Conclusion

Customer Loyalty & Gamification is the **retention engine** that turns Crowdiant into a habit:

1. **Automatic enrollment** (no friction, built into Express Checkout)
2. **Instant gratification** (earn points immediately, see progress)
3. **Tier progression** (clear benefits at each level)
4. **Gamification** (badges, challenges, streaks make it fun)
5. **Cross-venue network** (points work everywhere, platform moat)
6. **Trust integration** (loyalty boosts trust score)
7. **ROI tracking** (measure impact on revenue, visit frequency)

**Without loyalty:** 80% of customers never return, high churn  
**With loyalty:** 30% increase in visit frequency, 20% higher spend, 3x lifetime value

**Key Innovation:** Using **automatic enrollment + gamification + cross-venue coalition** to create a loyalty program that's effortless, engaging, and creates a network effect moat.

**Integration Points:**
- Express Checkout (earn points automatically)
- Trust System (tier benefits boost trust)
- Marketing (targeted campaigns by segment)
- Analytics (track member behavior, lifetime value)
