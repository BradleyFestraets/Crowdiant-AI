# AI Menu Optimization - Feature Deep Dive

## Executive Summary

**Feature Name:** AI Menu Optimization  
**Category:** Revenue Intelligence & Menu Engineering  
**Priority:** P2 - Growth Phase (Sprints 10-11)  
**Complexity:** High (requires ML models, historical data analysis)  
**Primary Value:** Increase revenue 15-25% through dynamic pricing and demand prediction

### Core Problem
Restaurants operate with:
- **Static pricing** that doesn't respond to demand fluctuations
- **Gut-feel menu decisions** without data backing
- **Wasted prep** due to inaccurate demand forecasting
- **Menu bloat** with low-margin items that don't sell
- **Missed revenue opportunities** during peak demand

### Solution Overview
AI-powered system that:
1. **Predicts demand** for each menu item by day/time/weather/events
2. **Optimizes prices dynamically** based on demand, inventory, and competition
3. **Recommends menu changes** (add/remove/feature items)
4. **Suggests prep quantities** to reduce waste
5. **A/B tests pricing strategies** automatically

---

## Part 1: Core Concept & Value Proposition

### The Traditional Menu Engineering Problem

**Current State:**
- Menu prices set once, maybe updated quarterly
- No correlation between price and demand elasticity
- High-margin items buried in menu design
- No data on item profitability vs. popularity
- Chefs prep based on yesterday's sales (reactive, not predictive)

**Pain Points by Role:**

**Restaurant Owner:**
- "I don't know which menu items are actually profitable"
- "Should I raise prices? Will I lose customers?"
- "Which items should I promote?"

**Chef/Kitchen Manager:**
- "I over-prep popular items or run out during rush"
- "Food waste eats 4-10% of revenue"
- "I don't know what seasonal specials will sell"

**General Manager:**
- "Menu feels stale but I don't know what to change"
- "Competitors are outpricing me on some items"

### AI Menu Optimization Solution

**Demand Prediction Engine:**
- Analyzes historical sales data (2+ weeks minimum)
- Factors: Day of week, time of day, weather, local events, holidays
- Predicts quantity sold per menu item per service period
- Confidence intervals (e.g., "80% confident: 45-55 orders")

**Dynamic Pricing Module:**
- **Surge Pricing:** Increase prices 10-20% during high-demand periods (Saturday dinner)
- **Off-Peak Discounts:** Reduce prices 5-15% to drive traffic (Tuesday lunch)
- **Inventory-Based Pricing:** Lower prices on items with expiring ingredients
- **Competitive Pricing:** Track competitor menus and adjust accordingly
- **Price Elasticity Testing:** Automatically A/B test price points

**Menu Engineering Dashboard:**
- **Stars (High Profit + High Popularity)** - Feature these prominently
- **Plowhorses (Low Profit + High Popularity)** - Can we raise prices?
- **Puzzles (High Profit + Low Popularity)** - Better marketing/placement?
- **Dogs (Low Profit + Low Popularity)** - Remove or rework

**Prep Quantity Recommendations:**
- Daily prep lists with predicted quantities
- Reduces over-prep waste by 30-50%
- Alerts when predicted demand exceeds prep capacity

---

## Part 2: User Experience Flows

### Flow 1: Daily Operations - Chef Morning Routine

**Actors:** Head Chef, Prep Cooks  
**Trigger:** Start of prep shift (typically 9am-10am)  
**Goal:** Prepare optimal quantities for lunch/dinner service

#### Steps

1. **Chef opens Kitchen Dashboard (tablet in prep area)**
   - Sees today's predictions:
     - **Lunch:** 120 covers (↑ 15% vs. avg Monday)
     - **Dinner:** 180 covers (↑ 8% vs. avg Monday)
   - Weather alert: "Hot day (85°F) - Salads/Cold items +20%"
   - Event alert: "Concert nearby (7pm) - Expect early dinner rush (5-6pm)"

2. **Predicted Menu Item Demand (Lunch)**
   ```
   Caesar Salad:        28 orders (±3)  ⚠️ Low inventory: Romaine
   Burger Special:      35 orders (±5)  ✅ Ingredients stocked
   Grilled Salmon:      18 orders (±4)  💰 High margin - promote
   Pasta Carbonara:     22 orders (±3)  ⚠️ Bacon expires tomorrow
   Margherita Pizza:    31 orders (±4)  ✅ All good
   ```

3. **Prep Recommendations Generated**
   - **Caesar Salad (28 orders)**:
     - Chop 3.5 lbs romaine (0.5 oz overage buffer)
     - Make 32 oz Caesar dressing
     - Grate 12 oz Parmesan
     - Bake 140 croutons
   
   - **Burger Special (35 orders)**:
     - Portion 40 x 6oz patties (5 extra for waste/staff)
     - Slice 10 tomatoes, 5 onions
     - Prep 40 burger buns

4. **Chef reviews and adjusts**
   - Clicks "Accept All" or manually adjusts quantities
   - System adds to prep checklist with staff assignments
   - Prep cooks check off items as completed

5. **Real-Time Updates During Service**
   - "Salmon selling faster than predicted (+30%) - Alert chef to prep more for dinner"
   - "Carbonara slower than predicted (-20%) - Don't prep extra for tonight"

#### UX Mockup Notes
- **Visual:** Traffic light system (🟢 on track, 🟡 trending high, 🔴 low inventory)
- **Interaction:** Swipe to accept/reject recommendations
- **Feedback:** "You saved 2.3 lbs food waste yesterday by following predictions"

---

### Flow 2: Dynamic Pricing - Weekend Surge Pricing

**Actors:** Restaurant Owner, System (Automated)  
**Trigger:** High-demand period detected (Saturday 7pm reservation spike)  
**Goal:** Maximize revenue during peak demand

#### Steps

1. **Thursday Evening - System Analysis**
   - Analyzes next 7 days reservations + historical data
   - Saturday dinner: 95% capacity booked (vs. 70% avg)
   - Predicts walk-in demand will exceed capacity

2. **Friday Morning - Owner Notification**
   - Email: "Saturday Surge Pricing Opportunity"
   - Recommended price increases:
     - Steak Frites: $28 → $32 (+14%)
     - Lobster Risotto: $36 → $42 (+17%)
     - Premium wines: +10% across board
   - Estimated revenue impact: +$480 for the night

3. **Owner Reviews & Approves**
   - Logs into Pricing Dashboard
   - Sees historical data: "Last 3 Saturday surges had zero customer complaints"
   - Options:
     - ✅ **Approve All** (recommended)
     - 📝 **Adjust %** (manual override)
     - ❌ **Decline** (keep regular prices)
   - Owner clicks "Approve All"

4. **System Updates Pricing (Friday 6pm)**
   - Online menu updated automatically
   - POS system prices updated for Saturday service
   - Staff notification: "Saturday prices updated - surge pricing active"

5. **Saturday Service - Real-Time Monitoring**
   - Dashboard shows:
     - Steak Frites: 42 sold at $32 (vs. 38 avg at $28) ✅
     - No impact on order volume
     - Revenue: +$512 vs. predicted +$480

6. **Sunday Morning - Post-Analysis**
   - Owner receives report:
     - "Surge pricing successful: +18% revenue, 0 complaints"
     - "Customer satisfaction unchanged: 4.6/5 avg"
     - Recommendation: "Enable auto-approval for future Saturdays?"

#### UX Mockup Notes
- **Visual:** Before/After pricing comparison with revenue impact
- **Interaction:** One-click approval with undo option until pricing goes live
- **Safety:** Max surge cap (e.g., never increase more than 25%)

---

### Flow 3: Menu Engineering - Monthly Menu Review

**Actors:** Restaurant Owner, General Manager  
**Trigger:** End of month (automated report)  
**Goal:** Optimize menu for profitability and customer satisfaction

#### Steps

1. **First Monday of Month - Automated Report Delivered**
   - Email: "November Menu Performance Report"
   - Attachment: PDF with full analysis
   - Dashboard link for interactive exploration

2. **Owner Opens Menu Engineering Dashboard**
   - **Matrix View (4 Quadrants):**
   
   ```
   HIGH PROFIT MARGIN
   │
   │  PUZZLES              │  STARS ⭐
   │  • Foie Gras ($18)    │  • Ribeye Steak ($42)
   │  • Truffle Risotto    │  • Signature Burger
   │  Popularity: 12/month │  Popularity: 240/month
   │                       │
   ├─────────────────────────┼──────────────────────
   │                       │
   │  DOGS 🐕              │  PLOWHORSES 🐴
   │  • Vegan Bowl ($14)   │  • Caesar Salad ($12)
   │  • Cauliflower Steak  │  • Margherita Pizza
   │  Popularity: 8/month  │  Popularity: 180/month
   │                       │
   LOW PROFIT MARGIN
   ```

3. **AI Recommendations per Quadrant**

   **STARS ⭐ (Keep & Promote):**
   - ✅ "Ribeye Steak is your #1 revenue driver - feature it prominently"
   - 💡 Suggestion: "Test $44 price point (+$2) - demand is inelastic"
   - 📸 Suggestion: "Add photo to menu - visually appealing items sell 30% more"

   **PLOWHORSES 🐴 (Improve Margin):**
   - ⚠️ "Caesar Salad sells well but margin only 42% (target: 65%)"
   - 💡 Suggestion: "Reduce portion size 10% OR increase price to $13"
   - 💡 Suggestion: "Make romaine hearts optional add-on (+$3)"

   **PUZZLES 🧩 (Boost Popularity):**
   - ❓ "Foie Gras has 78% margin but only 12 orders/month"
   - 💡 Suggestion: "Rename to 'Seared Duck Liver with Fig Compote' (more approachable)"
   - 💡 Suggestion: "Offer as appetizer special on Fridays (high-spend night)"
   - 💡 Suggestion: "Train servers on upselling techniques"

   **DOGS 🐕 (Remove or Rework):**
   - 🗑️ "Vegan Bowl: 38% margin, 8 orders/month - recommend removal"
   - 💡 Alternative: "Replace with Grilled Portobello Burger (65% margin, broader appeal)"
   - ⚠️ Caution: "1 regular orders weekly - offer to notify them of change"

4. **Owner Takes Action**
   - **Removes:** Vegan Bowl, Cauliflower Steak (2 Dogs)
   - **Adds:** Grilled Portobello Burger, Seasonal Soup (tested recipes)
   - **Reprices:** Caesar Salad $12 → $13, Foie Gras $18 → $16 (drive volume)
   - **Rebrands:** Foie Gras → "Seared Hudson Valley Duck Liver"
   - **Promotes:** Ribeye Steak gets hero image on menu

5. **System Tracks Changes**
   - A/B test: Half of online menu shows $12 Caesar, half shows $13
   - Measures impact over next 2 weeks
   - Monitors customer feedback sentiment for removed items

6. **Two Weeks Later - Change Impact Report**
   ```
   Caesar Salad price increase to $13:
   - Orders: 180 → 172 (-4.4% volume)
   - Revenue: $2,160 → $2,236 (+3.5%) ✅
   - Verdict: Success - customers accepted increase

   Portobello Burger (replaced Vegan Bowl):
   - Orders: 24 in 2 weeks (vs. 2 for Vegan Bowl)
   - Margin: 68% (vs. 38%)
   - Verdict: Major improvement ✅

   Duck Liver rebrand:
   - Orders: 12 → 19 (+58%) ✅
   - Reduced price drove volume
   - Verdict: Keep monitoring
   ```

#### UX Mockup Notes
- **Visual:** Interactive 2x2 matrix with drag-and-drop items
- **Interaction:** Click item for detailed performance breakdown
- **Gamification:** "Menu Score: 78/100 - Up from 72 last month"

---

## Part 3: Technical Architecture

### System Components

#### 1. Demand Prediction Engine (ML Model)

**Model Architecture:**
- **Algorithm:** Gradient Boosted Trees (XGBoost or LightGBM)
- **Training Data Requirements:**
  - Minimum: 2 weeks historical sales
  - Optimal: 6+ months (captures seasonality)
  - Data points: Date, time, menu item, quantity sold, price, weather, events

**Features (Input Variables):**
- **Temporal:** Day of week, hour, week of year, is_weekend, is_holiday
- **Menu Item:** Item category, price point, position on menu, days since added
- **Weather:** Temperature, precipitation, humidity (via weather API)
- **External Events:** Local events, sports games, concerts (via events API)
- **Venue-Specific:** Covers per service, reservation count, walk-in ratio
- **Historical:** 7-day rolling average, 30-day rolling average, YoY comparison

**Output:**
- Predicted quantity per item per service period
- Confidence interval (e.g., 80% CI: 45-55 orders)
- Feature importance (which factors drove prediction)

**Model Retraining:**
- Nightly: Incorporate previous day's actual sales
- Weekly: Full model retrain with hyperparameter tuning
- Monthly: Evaluate model performance, consider architecture changes

**Performance Metrics:**
- **MAPE (Mean Absolute Percentage Error):** Target <15%
- **Hit Rate:** % of predictions within ±2 orders of actual
- **Directional Accuracy:** Did we predict up/down trend correctly?

**Technology Stack:**
```typescript
// Backend: BullMQ job for nightly predictions
import { Queue } from 'bullmq';
import * as tf from '@tensorflow/tfjs-node'; // or Python microservice

const demandPredictionQueue = new Queue('demand-prediction');

// Job runs at 2am daily
demandPredictionQueue.add('predict-demand', {
  venueId: 'venue_123',
  predictionDate: '2025-11-26',
  servicePeroids: ['lunch', 'dinner']
});
```

#### 2. Dynamic Pricing Engine

**Pricing Strategies (Configurable per Venue):**

**Strategy 1: Time-Based Surge Pricing**
```typescript
interface SurgePricingRule {
  dayOfWeek: number[]; // [6] = Saturday
  timeRange: { start: string; end: string }; // "18:00-22:00"
  demandThreshold: number; // 85% capacity
  priceIncrease: { min: number; max: number }; // 10-20%
  itemCategories: string[]; // ["entrees", "premium_wines"]
}

const saturdayDinnerSurge: SurgePricingRule = {
  dayOfWeek: [6],
  timeRange: { start: "18:00", end: "22:00" },
  demandThreshold: 0.85,
  priceIncrease: { min: 0.10, max: 0.20 },
  itemCategories: ["entrees", "premium_wines"]
};
```

**Strategy 2: Inventory-Based Discount Pricing**
```typescript
interface InventoryPricingRule {
  trigger: "expiry_soon" | "overstock" | "slow_moving";
  daysUntilExpiry?: number; // 1-2 days
  discountPercentage: number; // 15-30%
  applyToCategories: string[];
}

const expiringIngredientDiscount: InventoryPricingRule = {
  trigger: "expiry_soon",
  daysUntilExpiry: 2,
  discountPercentage: 0.20,
  applyToCategories: ["items_with_expiring_ingredients"]
};
```

**Strategy 3: Competitive Pricing**
```typescript
interface CompetitivePricingRule {
  competitors: string[]; // ["Restaurant A", "Restaurant B"]
  strategy: "match" | "undercut" | "premium";
  priceDelta: number; // -5% for undercut, +10% for premium
  itemsToTrack: string[]; // ["Burger", "Steak", "Pasta"]
}
```

**Pricing Safety Constraints:**
- Max single increase: 25%
- Max decrease: 30%
- Require owner approval for increases >20%
- Blackout periods: No surge pricing during negative reviews spike

**A/B Testing Framework:**
```typescript
interface PriceTest {
  itemId: string;
  controlPrice: number;
  variantPrice: number;
  splitRatio: number; // 0.5 = 50/50 split
  startDate: Date;
  endDate: Date;
  sampleSize: number; // Min orders before declaring winner
  successMetric: "revenue" | "margin" | "volume";
}
```

#### 3. Menu Engineering Calculator

**Boston Consulting Group (BCG) Matrix Formula:**

```typescript
interface MenuItemMetrics {
  itemId: string;
  itemName: string;
  
  // Popularity (X-axis)
  totalOrdersLastMonth: number;
  popularityPercentile: number; // 0-100 relative to other items
  
  // Profitability (Y-axis)
  foodCostPercentage: number; // e.g., 35%
  contributionMargin: number; // selling price - food cost
  profitMarginPercentile: number; // 0-100 relative to other items
  
  // Category assignment
  category: "star" | "plowhorse" | "puzzle" | "dog";
}

function categorizeMenuItem(item: MenuItemMetrics): string {
  const popularityThreshold = 50; // median
  const profitThreshold = 50; // median
  
  if (item.popularityPercentile >= popularityThreshold && 
      item.profitMarginPercentile >= profitThreshold) {
    return "star"; // High popularity + High profit
  }
  
  if (item.popularityPercentile >= popularityThreshold && 
      item.profitMarginPercentile < profitThreshold) {
    return "plowhorse"; // High popularity + Low profit
  }
  
  if (item.popularityPercentile < popularityThreshold && 
      item.profitMarginPercentile >= profitThreshold) {
    return "puzzle"; // Low popularity + High profit
  }
  
  return "dog"; // Low popularity + Low profit
}
```

**AI Recommendation Engine:**
```typescript
interface MenuRecommendation {
  itemId: string;
  currentCategory: string;
  recommendations: {
    action: "keep" | "promote" | "reprice" | "rebrand" | "remove";
    reasoning: string;
    expectedImpact: {
      revenueChange: number; // $$ per month
      marginChange: number; // % points
      confidence: number; // 0-100
    };
    specificSuggestions: string[];
  }[];
}
```

#### 4. Prep Quantity Calculator

**Algorithm:**
```typescript
function calculatePrepQuantity(
  menuItemId: string,
  serviceDate: Date,
  servicePeriod: "lunch" | "dinner"
): PrepRecommendation {
  
  // Get ML prediction
  const prediction = await demandPredictionModel.predict({
    menuItemId,
    date: serviceDate,
    period: servicePeriod
  });
  
  // Get recipe breakdown
  const recipe = await getRecipeComponents(menuItemId);
  
  // Calculate raw ingredient quantities
  const ingredients = recipe.ingredients.map(ing => ({
    ingredientId: ing.id,
    quantityNeeded: ing.quantityPerServing * prediction.mean,
    unit: ing.unit,
    // Add buffer for waste/staff meals (5-10%)
    quantityToPrepWithBuffer: ing.quantityPerServing * prediction.mean * 1.07
  }));
  
  // Check current inventory
  const inventory = await getCurrentInventory(ingredients.map(i => i.ingredientId));
  
  // Flag low stock items
  const lowStockAlerts = ingredients.filter(ing => {
    const stock = inventory[ing.ingredientId];
    return stock.quantityOnHand < ing.quantityNeeded;
  });
  
  return {
    menuItemId,
    predictedOrders: prediction.mean,
    confidenceInterval: prediction.ci,
    ingredients,
    lowStockAlerts,
    recommendedPrepTime: calculatePrepTime(recipe.prepSteps)
  };
}
```

### Database Schema Extensions

```prisma
// Extend existing Prisma schema

model MenuItem {
  id                String   @id @default(cuid())
  // ... existing fields
  
  // AI Menu Optimization fields
  aiOptimizationEnabled Boolean @default(false)
  dynamicPricingEnabled Boolean @default(false)
  basePriceHistory      MenuItemPriceHistory[]
  demandPredictions     DemandPrediction[]
  menuEngineering       MenuEngineeringMetrics?
}

model MenuItemPriceHistory {
  id          String   @id @default(cuid())
  menuItemId  String
  menuItem    MenuItem @relation(fields: [menuItemId], references: [id])
  
  oldPrice    Decimal  @db.Decimal(10, 2)
  newPrice    Decimal  @db.Decimal(10, 2)
  reason      String   // "surge_pricing", "inventory_discount", "menu_engineering"
  effectiveAt DateTime
  expiresAt   DateTime?
  
  approvedBy  String?  // userId who approved change
  approvedAt  DateTime?
  
  createdAt   DateTime @default(now())
  
  @@index([menuItemId, effectiveAt])
}

model DemandPrediction {
  id            String   @id @default(cuid())
  venueId       String
  venue         Venue    @relation(fields: [venueId], references: [id])
  menuItemId    String
  menuItem      MenuItem @relation(fields: [menuItemId], references: [id])
  
  predictionDate   DateTime
  servicePeriod    String  // "lunch", "dinner", "brunch"
  
  predictedQuantity   Int
  confidenceIntervalLow  Int
  confidenceIntervalHigh Int
  
  actualQuantity   Int?    // Filled in after service
  predictionError  Float?  // MAPE
  
  modelVersion     String  // Track which ML model version generated this
  
  // Input features used for prediction
  features         Json    // Store all features for debugging
  
  createdAt        DateTime @default(now())
  
  @@unique([venueId, menuItemId, predictionDate, servicePeriod])
  @@index([venueId, predictionDate])
}

model MenuEngineeringMetrics {
  id         String   @id @default(cuid())
  menuItemId String   @unique
  menuItem   MenuItem @relation(fields: [menuItemId], references: [id])
  
  // Last 30 days metrics
  totalOrders           Int
  totalRevenue          Decimal @db.Decimal(10, 2)
  foodCostPercentage    Decimal @db.Decimal(5, 2)
  contributionMargin    Decimal @db.Decimal(10, 2)
  
  // Percentiles (relative to other items at venue)
  popularityPercentile  Int     // 0-100
  profitMarginPercentile Int    // 0-100
  
  // BCG Category
  category              String  // "star", "plowhorse", "puzzle", "dog"
  
  // AI Recommendations
  recommendations       Json    // Array of recommendation objects
  
  lastCalculatedAt      DateTime @default(now())
  
  @@index([category])
}

model PrepRecommendation {
  id            String   @id @default(cuid())
  venueId       String
  venue         Venue    @relation(fields: [venueId], references: [id])
  
  serviceDate   DateTime
  servicePeriod String   // "lunch", "dinner"
  
  recommendations Json   // Array of { menuItemId, ingredients[], quantities }
  
  acceptedAt    DateTime?
  acceptedBy    String?  // userId
  
  createdAt     DateTime @default(now())
  
  @@index([venueId, serviceDate])
}
```

### API Endpoints (tRPC Routers)

```typescript
// src/server/api/routers/ai-menu.router.ts

export const aiMenuRouter = createTRPCRouter({
  
  // Get demand predictions for a specific date
  getDemandPredictions: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      date: z.date(),
      servicePeriod: z.enum(["lunch", "dinner", "brunch"]),
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.demandPrediction.findMany({
        where: {
          venueId: input.venueId,
          predictionDate: input.date,
          servicePeriod: input.servicePeriod,
        },
        include: {
          menuItem: true,
        },
      });
    }),
  
  // Get prep recommendations
  getPrepRecommendations: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      date: z.date(),
      servicePeriod: z.enum(["lunch", "dinner"]),
    }))
    .query(async ({ ctx, input }) => {
      // This would call the prep calculator
      return await calculatePrepQuantities(input);
    }),
  
  // Accept prep recommendations
  acceptPrepRecommendations: protectedProcedure
    .input(z.object({
      recommendationId: z.string(),
      adjustments: z.array(z.object({
        menuItemId: z.string(),
        adjustedQuantity: z.number(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.prepRecommendation.update({
        where: { id: input.recommendationId },
        data: {
          acceptedAt: new Date(),
          acceptedBy: ctx.session.user.id,
        },
      });
    }),
  
  // Get menu engineering analysis
  getMenuEngineering: protectedProcedure
    .input(z.object({
      venueId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.menuEngineeringMetrics.findMany({
        where: {
          menuItem: {
            venueId: input.venueId,
          },
        },
        include: {
          menuItem: true,
        },
      });
    }),
  
  // Approve dynamic pricing change
  approvePriceChange: protectedProcedure
    .input(z.object({
      menuItemId: z.string(),
      newPrice: z.number(),
      reason: z.string(),
      effectiveAt: z.date(),
      expiresAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentItem = await ctx.db.menuItem.findUnique({
        where: { id: input.menuItemId },
      });
      
      // Create price history record
      await ctx.db.menuItemPriceHistory.create({
        data: {
          menuItemId: input.menuItemId,
          oldPrice: currentItem.price,
          newPrice: input.newPrice,
          reason: input.reason,
          effectiveAt: input.effectiveAt,
          expiresAt: input.expiresAt,
          approvedBy: ctx.session.user.id,
          approvedAt: new Date(),
        },
      });
      
      // Update current price if effective immediately
      if (input.effectiveAt <= new Date()) {
        await ctx.db.menuItem.update({
          where: { id: input.menuItemId },
          data: { price: input.newPrice },
        });
      }
      
      return { success: true };
    }),
  
  // Get pricing recommendations
  getPricingRecommendations: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      lookAheadDays: z.number().default(7),
    }))
    .query(async ({ ctx, input }) => {
      // Call pricing engine to analyze upcoming demand
      return await generatePricingRecommendations(input);
    }),
});
```

---

## Part 4: Implementation Strategy

### Phase 1: Data Collection & Foundation (Sprint 10)

**Goal:** Establish data pipeline and basic predictions

**Tasks:**
1. **Extend database schema** (Add models above)
2. **Create data ingestion pipeline**
   - Capture all order data with timestamps
   - Integrate weather API (OpenWeatherMap)
   - Integrate events API (Ticketmaster, local event calendars)
3. **Build basic demand prediction model**
   - Simple time-series model (ARIMA or Prophet)
   - Requires 2+ weeks of historical data
4. **Create prep recommendations dashboard**
   - Show predicted demand per item
   - Generate ingredient shopping lists

**Success Criteria:**
- Predictions available for 80% of menu items
- MAPE <20% (will improve over time)
- Chef dashboard operational

### Phase 2: Menu Engineering Dashboard (Sprint 11)

**Goal:** Give owners actionable menu insights

**Tasks:**
1. **Build menu engineering calculator**
   - Calculate popularity and profitability percentiles
   - Categorize items into BCG matrix
2. **Create AI recommendation engine**
   - Rule-based suggestions for each category
   - A/B testing framework for price changes
3. **Build menu engineering UI**
   - Interactive 2x2 matrix
   - Drill-down into item performance

**Success Criteria:**
- All menu items categorized correctly
- 3+ actionable recommendations per venue
- Owner can execute menu changes from dashboard

### Phase 3: Dynamic Pricing (Sprint 12-13)

**Goal:** Enable automated pricing optimization

**Tasks:**
1. **Build pricing engine**
   - Time-based surge pricing
   - Inventory-based discounting
   - Competitive pricing tracking
2. **Create approval workflow**
   - Owner notification system
   - One-click approval
   - Auto-approval rules (optional)
3. **Implement price change automation**
   - Update POS system prices
   - Update online menu
   - Track price history

**Success Criteria:**
- Pricing recommendations 95% accurate
- <5 minute approval-to-live time
- Zero pricing errors in production

### Phase 4: Advanced ML & Optimization (Post-MVP)

**Goal:** Improve prediction accuracy and add advanced features

**Tasks:**
1. **Upgrade to ensemble ML models**
   - XGBoost + Prophet + Neural Network
   - Model stacking for better accuracy
2. **Add causal inference**
   - Measure true impact of price changes
   - Control for confounding variables
3. **Multi-objective optimization**
   - Optimize for revenue AND customer satisfaction
   - Pareto frontier analysis

**Success Criteria:**
- MAPE <10%
- Revenue increase 15-25% demonstrated
- Customer satisfaction maintained or improved

---

## Part 5: Success Metrics & ROI

### Key Performance Indicators (KPIs)

#### Demand Prediction Accuracy
- **MAPE (Mean Absolute Percentage Error):** Target <15%
- **Hit Rate:** % predictions within ±2 orders → Target >80%
- **Directional Accuracy:** Did we correctly predict trend? → Target >90%

#### Financial Impact
- **Revenue Increase:** 15-25% from dynamic pricing
- **Food Waste Reduction:** 30-50% from accurate prep quantities
- **Labor Cost Reduction:** 10-15% from optimized prep schedules

#### Menu Engineering
- **Menu Efficiency Score:** 70+ (weighted avg of item performance)
- **Stars %:** 30-40% of items (high profit + high popularity)
- **Dogs %:** <10% of items (candidates for removal)

#### Operational Efficiency
- **Prep Time Savings:** 15-20% (more accurate quantities)
- **Stockout Rate:** <2% (better demand forecasting)
- **Over-Prep Rate:** <5% (reduce waste)

### ROI Calculation Example

**Restaurant Profile:**
- 150 covers/day average
- $35 average check
- $5,250 daily revenue ($1.9M annually)
- 30% food cost, 30% labor cost

**AI Menu Optimization Impact (Conservative):**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Revenue (dynamic pricing)** | $5,250/day | $5,775/day | +10% (+$525/day) |
| **Food waste** | 8% of food cost | 4% of food cost | -50% waste (-$84/day) |
| **Labor (prep efficiency)** | $1,575/day | $1,496/day | -5% (-$79/day) |
| **Total Daily Benefit** | - | - | **+$688/day** |

**Annual ROI:**
- Annual benefit: $688/day × 365 = $251,120
- Software cost: $299/month × 12 = $3,588
- **ROI: 6,900%** or **payback period: 5 days**

---

## Part 6: Marketing & Customer Communication

### Value Proposition by Customer Segment

#### For Fine Dining
> "Optimize your high-margin items and reduce waste on expensive ingredients. Our AI predicts demand for your seasonal specials with 90% accuracy."

**Key Messages:**
- Reduce waste on premium ingredients (truffles, foie gras, caviar)
- Optimize wine pricing based on demand
- Identify which tasting menu items to feature

#### For Fast Casual
> "Stop over-prepping and throwing away food. Know exactly how many burgers to prep for Tuesday lunch."

**Key Messages:**
- Reduce food waste by 50%
- Stop running out during rush hours
- Optimize labor schedules based on predicted demand

#### For Multi-Location Chains
> "Centralized menu engineering across all locations. Identify top performers and eliminate underperformers system-wide."

**Key Messages:**
- Compare item performance across locations
- Standardize menu based on data, not hunches
- Roll out successful items to underperforming locations

### Staff Training & Change Management

#### Chef/Kitchen Manager Training

**Session 1: Understanding Predictions (30 min)**
- How demand predictions work
- Reading confidence intervals
- When to trust vs. override predictions

**Session 2: Prep Recommendations (30 min)**
- How to use prep checklist
- Adjusting quantities based on your expertise
- Tracking prediction accuracy

**Session 3: Feedback Loop (15 min)**
- Reporting inaccurate predictions
- System learns from your adjustments

#### Owner/Manager Training

**Session 1: Menu Engineering Basics (45 min)**
- Understanding the BCG matrix
- How to interpret recommendations
- Taking action on insights

**Session 2: Dynamic Pricing Strategy (45 min)**
- When to use surge pricing
- Setting pricing rules
- Measuring customer response

**Session 3: ROI Tracking (30 min)**
- Reading performance reports
- Comparing before/after metrics
- Continuous optimization

### Customer-Facing Communication

**Scenario 1: Explaining Surge Pricing (if customer asks)**

❌ **Poor Response:** "Our prices are dynamic based on demand."  
✅ **Good Response:** "Saturday nights are our busiest, so we adjust pricing to ensure the best experience for our guests. This helps us maintain quality and service during peak times."

**Scenario 2: Menu Changes**

❌ **Poor Response:** "We removed that item because it wasn't profitable."  
✅ **Good Response:** "We're constantly refining our menu based on guest feedback and seasonal ingredients. Let me show you our new [replacement item] - I think you'll love it!"

**Scenario 3: Promoting High-Margin Items**

✅ **Server Script:** "Our chef is especially proud of the [Star Item] tonight - it's been our most popular dish this month and showcases local ingredients beautifully."

---

## Part 7: Competitive Analysis & Differentiation

### Current Market Solutions

#### Toast (POS with basic reporting)
- **What they offer:** Sales reports, item popularity
- **What they lack:** No predictive analytics, no dynamic pricing
- **Crowdiant advantage:** AI-powered predictions vs. historical reporting

#### MarginEdge (Food cost management)
- **What they offer:** Invoice scanning, food cost tracking
- **What they lack:** No demand forecasting, no menu engineering
- **Crowdiant advantage:** Integrated with POS, automated recommendations

#### Avero (Restaurant analytics)
- **What they offer:** Labor cost analysis, sales trends
- **What they lack:** No ML predictions, expensive ($500+/month)
- **Crowdiant advantage:** More affordable, integrated into existing system

### Crowdiant's Unique Differentiators

1. **Integrated System:** AI menu optimization built into POS, not separate tool
2. **Affordable:** $299/month vs. $500+ for standalone analytics tools
3. **Actionable:** One-click to implement recommendations (not just reports)
4. **Real-Time:** Predictions update daily, prices adjust automatically
5. **Trust System Integration:** Loyal customers get pricing benefits (gamification)

---

## Appendix: Technical Reference

### Weather API Integration

```typescript
// src/server/services/weather.service.ts
import axios from 'axios';

interface WeatherData {
  temperature: number;
  precipitation: number;
  humidity: number;
  conditions: string; // "sunny", "rainy", "cloudy"
}

export async function getWeatherForecast(
  latitude: number,
  longitude: number,
  date: Date
): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const response = await axios.get(
    `https://api.openweathermap.org/data/2.5/forecast`,
    {
      params: {
        lat: latitude,
        lon: longitude,
        appid: apiKey,
        units: 'imperial',
      },
    }
  );
  
  // Parse response and extract relevant data
  return {
    temperature: response.data.main.temp,
    precipitation: response.data.rain?.['3h'] || 0,
    humidity: response.data.main.humidity,
    conditions: response.data.weather[0].main.toLowerCase(),
  };
}
```

### Events API Integration

```typescript
// src/server/services/events.service.ts
import axios from 'axios';

interface LocalEvent {
  name: string;
  date: Date;
  attendees: number;
  distance: number; // miles from venue
}

export async function getNearbyEvents(
  latitude: number,
  longitude: number,
  date: Date,
  radiusMiles: number = 5
): Promise<LocalEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  const response = await axios.get(
    `https://app.ticketmaster.com/discovery/v2/events.json`,
    {
      params: {
        apikey: apiKey,
        latlong: `${latitude},${longitude}`,
        radius: radiusMiles,
        startDateTime: date.toISOString(),
        endDateTime: new Date(date.getTime() + 86400000).toISOString(),
      },
    }
  );
  
  return response.data._embedded?.events?.map(event => ({
    name: event.name,
    date: new Date(event.dates.start.dateTime),
    attendees: event.sales?.public?.estimatedAttendance || 0,
    distance: event.distance,
  })) || [];
}
```

---

## Summary: Implementation Checklist

### Sprint 10: Foundation
- [ ] Extend database schema (DemandPrediction, MenuEngineeringMetrics, etc.)
- [ ] Build data ingestion pipeline (orders, weather, events)
- [ ] Create basic ML prediction model (Prophet or ARIMA)
- [ ] Build prep recommendations dashboard
- [ ] Create tRPC API endpoints for predictions

### Sprint 11: Menu Engineering
- [ ] Build menu engineering calculator (BCG matrix)
- [ ] Create AI recommendation engine
- [ ] Build interactive menu engineering UI
- [ ] Implement A/B testing framework

### Sprint 12-13: Dynamic Pricing
- [ ] Build pricing engine (surge, inventory, competitive)
- [ ] Create approval workflow UI
- [ ] Implement price change automation (POS + online menu sync)
- [ ] Add price history tracking and analytics

### Post-MVP: Advanced Features
- [ ] Upgrade to ensemble ML models (XGBoost)
- [ ] Add causal inference for true price impact measurement
- [ ] Multi-objective optimization (revenue + satisfaction)
- [ ] Competitive pricing scraper (monitor competitor menus)

---

**Total Lines:** 1,400+  
**Implementation Timeline:** 4 sprints (8 weeks)  
**Expected ROI:** 15-25% revenue increase, 30-50% waste reduction  
**Technical Complexity:** High (ML models, real-time predictions)  
**Business Impact:** Very High (transforms menu from static to dynamic revenue driver)
