# Multi-Location Chain Management - Feature Deep Dive

## Executive Summary

**Feature Name:** Multi-Location Chain Management  
**Category:** Enterprise & Scalability  
**Priority:** P2 - Growth Feature (Sprint 15+)  
**Complexity:** Very High (organizational hierarchy, menu inheritance, cross-location analytics)  
**Primary Value:** Manage 10-100+ venues from unified dashboard, standardize operations, benchmark performance

### The Core Problem

**Multi-unit restaurant groups struggle with fragmentation:**

**The Fragmented Chaos:**
- **10 locations = 10 separate systems** → Impossible to get unified view
- **Each location uses different menu** → Brand inconsistency
- **Can't compare performance** → Which location is most profitable? No idea
- **Manual reporting** → Regional manager visits each location, collects Excel files
- **No shared staff pools** → Server trained at Location A can't work at Location B
- **Slow expansion** → New location takes 2-3 weeks to configure

**Real-world example (3-location burger chain):**
- Location A: Uses Square POS
- Location B: Uses Toast POS
- Location C: Uses Clover POS
- **Result:** Owner has 3 separate dashboards, can't see total revenue without manual aggregation

**Industry Impact:**
- Multi-unit operators represent 70% of restaurant revenue
- But only 15% use unified management software (most use disparate systems)
- Average regional manager spends 10+ hours/week compiling reports manually
- New location setup: 2-4 weeks vs. 2-3 days with modern systems

### The Solution

Crowdiant's Multi-Location Chain Management uses:
1. **Organizational hierarchy** (Organization → Regions → Venues)
2. **Master menu management** (create once, push to all locations with local overrides)
3. **Unified analytics dashboard** (see all locations at a glance)
4. **Cross-location benchmarking** (rank locations by sales/sqft, labor%, profitability)
5. **Shared staff pools** (staff can clock in at any location)
6. **Clone configurations** (new location setup in 2 hours)
7. **Role-based access control** (regional managers see only their region)

**Result:** 90% reduction in admin time, 10x faster new location onboarding, instant performance visibility

---

## Part 1: The Multi-Unit Operator Journey

### Before Unified Management

**Typical week for regional manager (5 locations):**

**Monday:**
- Visit Location A → Export sales report from Square
- Visit Location B → Export sales report from Toast
- Location C's manager emails PDF of weekend sales

**Tuesday:**
- Compile reports in Excel
- Realize Location D's numbers don't make sense
- Drive to Location D to troubleshoot

**Wednesday:**
- Weekly owner meeting: "How's Location C performing?"
- Manager: "Good question, let me pull up the spreadsheet..."
- Spend 20 minutes finding the data

**Thursday:**
- Location B reports inventory shortage
- Can't transfer from Location A because they use different systems
- Emergency supplier order (higher cost)

**Friday:**
- New location opening next month
- Must manually recreate menu, pricing, staff roles
- 3 weeks of setup work

**Total time:** 15+ hours/week on admin tasks, reactive management

### After Unified Management

**Same week with Crowdiant:**

**Monday Morning (10 minutes):**
- Open Crowdiant dashboard
- See all 5 locations' weekend performance at a glance
- Notice Location C's sales down 12% → Flag for investigation

**Monday Afternoon (15 minutes):**
- Video call with Location C manager
- Share live dashboard showing traffic drop
- Identify issue: Understaffed Sunday brunch

**Tuesday (5 minutes):**
- Clone top-performing location's schedule
- Push to Location C with one click

**Wednesday (2 minutes):**
- Weekly owner meeting: "Location C?"
- Pull up dashboard on projector
- Show real-time comparison: Location C vs. chain average

**Thursday (5 minutes):**
- Location B inventory shortage alert (automatic)
- Dashboard shows Location A has surplus
- Initiate internal transfer with 2 clicks

**Friday (2 hours):**
- New location setup: Clone Location A's configuration
- Menu, pricing, floor plan, staff roles all copied
- Location F ready to open tomorrow

**Total time:** ~3 hours/week, proactive insights

---

## Part 2: Organizational Hierarchy

### Three-Tier Structure

**Organization → Regions → Venues**

```typescript
interface OrganizationStructure {
  // Top level
  organization: {
    id: string;
    name: string;              // "Burger Bros Inc."
    type: 'CHAIN' | 'FRANCHISE' | 'MANAGEMENT_GROUP';
    totalVenues: number;       // 23 locations
    monthlyRevenue: number;    // $1.2M across all venues
  };
  
  // Middle level (optional)
  regions: Array<{
    id: string;
    name: string;              // "Northeast", "West Coast"
    venueIds: string[];
    regionalManagerId: string;
  }>;
  
  // Bottom level
  venues: Array<{
    id: string;
    name: string;              // "Burger Bros - Times Square"
    regionId?: string;
    managerId: string;
  }>;
}

// Example: Burger Bros chain
const burgerBrosOrg = {
  organization: {
    name: 'Burger Bros Inc.',
    type: 'CHAIN',
    totalVenues: 12,
  },
  regions: [
    {
      name: 'NYC Metro',
      venues: [
        'Burger Bros - Times Square',
        'Burger Bros - Brooklyn',
        'Burger Bros - Queens',
      ],
      regionalManager: 'John Smith',
    },
    {
      name: 'Boston Area',
      venues: [
        'Burger Bros - Back Bay',
        'Burger Bros - Cambridge',
      ],
      regionalManager: 'Sarah Davis',
    },
  ],
};
```

### Role-Based Access Control

**Different users see different scopes:**

```typescript
enum OrganizationRole {
  OWNER = 'OWNER',                 // Sees everything
  REGIONAL_MANAGER = 'REGIONAL_MANAGER', // Sees only their region
  VENUE_MANAGER = 'VENUE_MANAGER', // Sees only their venue
  DISTRICT_MANAGER = 'DISTRICT_MANAGER', // Sees multiple regions
  ACCOUNTANT = 'ACCOUNTANT',       // Read-only financial data
  ANALYST = 'ANALYST',             // Read-only analytics
}

interface OrganizationUser {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  
  // Scope (what they can access)
  scope: {
    type: 'ALL' | 'REGION' | 'VENUE' | 'CUSTOM';
    venueIds?: string[];   // Specific venues
    regionIds?: string[];  // Specific regions
  };
}

// Examples
const users = [
  {
    name: 'Owner',
    role: 'OWNER',
    scope: { type: 'ALL' }, // Sees all 12 locations
  },
  {
    name: 'NYC Regional Manager',
    role: 'REGIONAL_MANAGER',
    scope: { type: 'REGION', regionIds: ['nyc-metro'] }, // Sees 3 NYC locations
  },
  {
    name: 'Times Square Manager',
    role: 'VENUE_MANAGER',
    scope: { type: 'VENUE', venueIds: ['times-square'] }, // Sees only their venue
  },
];
```

---

## Part 3: Master Menu Management

### Create Once, Deploy Everywhere

**Problem with fragmented systems:**
- Menu change (price increase on burger) requires updating 10 locations manually
- Locations drift: Location A charges $12, Location B charges $13 (inconsistent)
- New item launch: Must add to each location's menu separately

**Solution: Master Menu with Local Overrides**

```typescript
interface MasterMenu {
  id: string;
  organizationId: string;
  
  // Basic info
  name: string;              // "Burger Bros - Standard Menu"
  version: string;           // "v2.3"
  effectiveDate: Date;
  
  // Items
  categories: MenuCategory[];
  items: MasterMenuItem[];
  
  // Deployment
  deployedToVenues: string[];  // Which venues use this master
  overridesAllowed: boolean;   // Can venues customize?
  
  createdAt: Date;
  updatedAt: Date;
}

interface MasterMenuItem {
  id: string;
  masterMenuId: string;
  
  // Core properties
  name: string;
  description: string;
  basePrice: number;         // Default price for all locations
  category: string;
  
  // Configuration
  allowPriceOverride: boolean;
  allowAvailabilityOverride: boolean;
  
  // Ingredients (for inventory)
  ingredients: Ingredient[];
  
  // Relations
  venueOverrides: VenueMenuOverride[];
}

interface VenueMenuOverride {
  id: string;
  venueId: string;
  masterMenuItemId: string;
  
  // What's overridden
  customPrice?: number;        // $14 instead of $12 (higher rent area)
  isAvailable?: boolean;       // Disabled at this location
  customDescription?: string;  // Local spin on description
  customImage?: string;        // Different photo
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Push Menu Updates to All Locations

**One-click deployment:**

```typescript
async function deployMasterMenuUpdate(
  masterMenuId: string,
  updates: Partial<MasterMenuItem>[]
): Promise<void> {
  const masterMenu = await getMasterMenu(masterMenuId);
  
  // Update master menu items
  await Promise.all(
    updates.map(update => updateMasterMenuItem(update.id, update))
  );
  
  // Get all venues using this master
  const venues = await getVenues({
    organizationId: masterMenu.organizationId,
    masterMenuId: masterMenuId,
  });
  
  // Push updates to each venue
  for (const venue of venues) {
    for (const update of updates) {
      // Check if venue has override
      const override = await getVenueOverride(venue.id, update.id);
      
      if (!override) {
        // No override - apply master change
        await updateVenueMenuItem(venue.id, update.id, update);
      } else {
        // Has override - respect it (unless forced)
        if (!override.allowMasterUpdate) {
          console.log(`Skipping ${venue.name} - override in place`);
          continue;
        }
        
        // Partial update (only non-overridden fields)
        await updateVenueMenuItem(venue.id, update.id, {
          ...update,
          price: override.customPrice, // Keep custom price
        });
      }
    }
  }
  
  // Send notifications
  await notifyVenueManagers(venues, {
    type: 'MENU_UPDATE',
    message: `Master menu updated: ${updates.length} items changed`,
    changes: updates.map(u => u.name),
  });
}

// UI Component
<MasterMenuEditor>
  <MenuItem item={burgerItem}>
    <Name>Classic Burger</Name>
    <BasePrice>$12.00</BasePrice>
    
    <button onClick={() => updatePrice(burgerItem.id, 1300)}>
      Update Price to $13.00
    </button>
    
    <DeploymentStatus>
      <p>Deployed to 10/12 locations</p>
      <OverridesList>
        <Override venue="Times Square">Custom price: $15</Override>
        <Override venue="Airport">Custom price: $18</Override>
      </OverridesList>
    </DeploymentStatus>
    
    <button onClick={() => deployToAllVenues()}>
      Push Update to All Locations
    </button>
  </MenuItem>
</MasterMenuEditor>
```

---

## Part 4: Unified Analytics Dashboard

### See All Locations at Once

**Chain-wide dashboard:**

```
┌─────────────────────────────────────────────────────────┐
│ Burger Bros Inc. - Dashboard              Today 2:34 PM  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📊 Today's Performance (All 12 Locations)                │
│ • Total Revenue: $42,380 (↑ 8% vs yesterday)            │
│ • Total Covers: 1,247                                    │
│ • Avg Check: $33.97                                      │
│ • Labor %: 28.4% (target: 30%)                           │
│                                                          │
│ 🏆 Top Performers                                        │
│ 1. Times Square: $8,240 (198 covers)                     │
│ 2. Brooklyn: $5,630 (142 covers)                         │
│ 3. Back Bay: $4,890 (128 covers)                         │
│                                                          │
│ ⚠️ Underperformers                                       │
│ • Queens: $2,100 (↓ 18% vs avg)                         │
│ • Cambridge: $2,540 (↓ 12% vs avg)                       │
│                                                          │
│ 📈 Revenue Trend (Last 7 Days)                           │
│ [Line chart showing all 12 locations]                    │
│                                                          │
│ 🔥 Real-Time Activity                                    │
│ • 8 locations currently open                             │
│ • 142 active tabs                                        │
│ • 23 orders in kitchen queue                             │
│                                                          │
│ 💡 Insights                                              │
│ • Times Square dinner rush starting (6 PM)               │
│ • Brooklyn slow today (down 15% from forecast)           │
│ • Cambridge labor % at 35% (5% over target)              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Cross-Location Comparison

**Benchmark against chain average:**

```typescript
interface LocationBenchmark {
  venueId: string;
  venueName: string;
  
  // Sales metrics
  dailyRevenue: number;
  chainAvgRevenue: number;
  percentOfAvg: number;        // 120% = 20% above average
  
  // Efficiency metrics
  salesPerSqFt: number;
  salesPerEmployee: number;
  avgCheckSize: number;
  tableOccupancyRate: number;
  
  // Profitability
  laborPercentage: number;
  cogsPercentage: number;      // Cost of goods sold
  grossMargin: number;
  
  // Customer metrics
  avgRating: number;
  repeatCustomerRate: number;
  
  // Ranking
  overallRank: number;         // 1-12
}

// Benchmarking report
const benchmarks = [
  {
    venue: 'Times Square',
    dailyRevenue: 8240,
    chainAvgRevenue: 3531,
    percentOfAvg: 233,         // 2.3x chain average!
    salesPerSqFt: 412,         // $412/sqft (excellent)
    laborPercentage: 24,       // Under target (good)
    overallRank: 1,
  },
  {
    venue: 'Queens',
    dailyRevenue: 2100,
    chainAvgRevenue: 3531,
    percentOfAvg: 59,          // 41% below average
    salesPerSqFt: 105,         // Low
    laborPercentage: 32,       // Over target (bad)
    overallRank: 11,           // Second worst
  },
];

// UI Component
<BenchmarkTable>
  <thead>
    <tr>
      <th>Rank</th>
      <th>Location</th>
      <th>Revenue</th>
      <th>vs Avg</th>
      <th>Labor %</th>
      <th>$/SqFt</th>
    </tr>
  </thead>
  <tbody>
    {benchmarks.map((b, i) => (
      <tr key={b.venue} className={i < 3 ? 'text-green-600' : i >= 9 ? 'text-red-600' : ''}>
        <td>{b.overallRank}</td>
        <td>{b.venue}</td>
        <td>${b.dailyRevenue.toLocaleString()}</td>
        <td>{b.percentOfAvg}%</td>
        <td>{b.laborPercentage}%</td>
        <td>${b.salesPerSqFt}</td>
      </tr>
    ))}
  </tbody>
</BenchmarkTable>
```

---

## Part 5: Clone Configurations (Fast Expansion)

### New Location Setup in 2 Hours

**Traditional setup (3 weeks):**
1. Week 1: Set up POS system, create menu (2 days)
2. Week 2: Configure pricing, add staff (3 days)
3. Week 3: Test system, train staff (5 days)

**Crowdiant clone workflow (2 hours):**

```typescript
async function cloneVenueConfiguration(
  sourceVenueId: string,
  newVenueData: CreateVenueInput
): Promise<Venue> {
  const sourceVenue = await getVenue(sourceVenueId);
  
  // Step 1: Create new venue (5 min)
  const newVenue = await createVenue({
    ...newVenueData,
    organizationId: sourceVenue.organizationId,
  });
  
  // Step 2: Clone menu (10 min)
  const sourceMenu = await getVenueMenu(sourceVenueId);
  await cloneMenu(sourceMenu, newVenue.id);
  
  // Step 3: Clone floor plan (15 min)
  const sourceFloorPlan = await getFloorPlan(sourceVenueId);
  await cloneFloorPlan(sourceFloorPlan, newVenue.id);
  
  // Step 4: Clone settings (5 min)
  const sourceSettings = await getVenueSettings(sourceVenueId);
  await applySettings(newVenue.id, sourceSettings);
  
  // Step 5: Clone staff roles (not actual staff) (10 min)
  const sourceRoles = await getStaffRoles(sourceVenueId);
  await createStaffRoles(newVenue.id, sourceRoles);
  
  // Step 6: Clone operational hours (5 min)
  const sourceHours = await getOperatingHours(sourceVenueId);
  await setOperatingHours(newVenue.id, sourceHours);
  
  // Step 7: Clone payment processors (10 min)
  const sourcePayment = await getPaymentConfig(sourceVenueId);
  await setupPaymentProcessors(newVenue.id, {
    stripeAccountId: null, // Needs new Stripe Connect onboarding
    settings: sourcePayment.settings,
  });
  
  // Total: ~60 min automated, ~60 min Stripe Connect setup
  
  return newVenue;
}

// UI Wizard
<CloneVenueWizard>
  <Step1_SelectSource>
    <select onChange={(e) => setSourceVenue(e.target.value)}>
      <option>Times Square (Top Performer)</option>
      <option>Brooklyn (High Efficiency)</option>
      <option>Back Bay (Best Practices)</option>
    </select>
  </Step1_SelectSource>
  
  <Step2_NewVenueInfo>
    <input placeholder="Venue Name" />
    <input placeholder="Address" />
    <select><option>NYC Metro Region</option></select>
  </Step2_NewVenueInfo>
  
  <Step3_WhatToClone>
    <checkbox checked>Menu (all items and pricing)</checkbox>
    <checkbox checked>Floor Plan</checkbox>
    <checkbox checked>Staff Roles</checkbox>
    <checkbox checked>Operating Hours</checkbox>
    <checkbox checked>Settings</checkbox>
    <checkbox>Historical Data (for forecasting)</checkbox>
  </Step3_WhatToClone>
  
  <Step4_Review>
    <p>Cloning configuration from: <strong>Times Square</strong></p>
    <p>New venue: <strong>Burger Bros - Newark</strong></p>
    <p>Estimated setup time: <strong>2 hours</strong></p>
    <button onClick={() => executeClone()}>
      Start Clone Process
    </button>
  </Step4_Review>
</CloneVenueWizard>
```

---

## Part 6: Shared Staff Pools

### Staff Work at Multiple Locations

**Problem with traditional systems:**
- Server trained at Location A can't clock in at Location B (different systems)
- Owner can't see which staff are shared across locations
- Payroll nightmare (separate timesheets per location)

**Solution: Unified staff profiles:**

```typescript
interface MultiLocationEmployee {
  id: string;
  organizationId: string;
  
  // Basic info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Employment
  hireDate: Date;
  status: 'ACTIVE' | 'INACTIVE';
  
  // Multi-location assignments
  venueAssignments: Array<{
    venueId: string;
    role: EmployeeRole;
    isPrimary: boolean;        // Home location
    canWorkHere: boolean;
    hourlyRate: number;        // Can vary by location (e.g., higher in Manhattan)
  }>;
  
  // Scheduling
  availableVenues: string[];   // Can be scheduled at these locations
  preferredVenues: string[];   // Prefers to work here
  
  // Payroll
  totalHoursThisWeek: number;
  hoursByVenue: Record<string, number>; // Track hours per location
}

// Example: Sarah works at 3 locations
const sarah = {
  name: 'Sarah Johnson',
  venueAssignments: [
    { venue: 'Times Square', role: 'SERVER', isPrimary: true, hourlyRate: 1800 },
    { venue: 'Brooklyn', role: 'SERVER', isPrimary: false, hourlyRate: 1600 },
    { venue: 'Queens', role: 'SERVER', isPrimary: false, hourlyRate: 1600 },
  ],
  totalHoursThisWeek: 42,
  hoursByVenue: {
    'Times Square': 28,
    'Brooklyn': 10,
    'Queens': 4,
  },
};
```

### Cross-Location Scheduling

**Manager can schedule staff at any location:**

```
┌─────────────────────────────────────────────────┐
│ Schedule Sarah Johnson - Week of Dec 2          │
├─────────────────────────────────────────────────┤
│                                                  │
│ Monday:                                         │
│ • Times Square: 5 PM - 10 PM (5 hours)          │
│                                                  │
│ Tuesday:                                        │
│ • Times Square: 5 PM - 10 PM (5 hours)          │
│                                                  │
│ Wednesday:                                      │
│ • Brooklyn: 6 PM - 11 PM (5 hours)              │
│ • [Commute: 45 min from Times Square]           │
│                                                  │
│ Thursday: OFF                                   │
│                                                  │
│ Friday:                                         │
│ • Times Square: 5 PM - 11 PM (6 hours)          │
│                                                  │
│ Saturday:                                       │
│ • Queens: 12 PM - 8 PM (8 hours)                │
│ • [Commute: 30 min from home]                   │
│                                                  │
│ Total: 34 hours across 3 locations              │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Part 7: Centralized Configuration

### Global Settings with Local Overrides

**Chain-wide settings:**

```typescript
interface ChainConfiguration {
  organizationId: string;
  
  // Brand standards
  brand: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  
  // Operational defaults
  operationalDefaults: {
    defaultTipPercentages: [15, 18, 20];
    defaultTaxRate: number;     // Can override per venue
    defaultServiceCharge: number;
    autoGratuityThreshold: number; // Parties of 6+
  };
  
  // Payment settings
  payment: {
    requirePreAuth: boolean;
    preAuthPercentage: number;
    acceptedCards: string[];
  };
  
  // Customer experience
  customerDefaults: {
    loyaltyEnabled: boolean;
    feedbackSurveysEnabled: boolean;
    marketingOptInDefault: boolean;
  };
  
  // Compliance
  compliance: {
    requireIdForAlcohol: boolean;
    requireFoodHandlerCerts: boolean;
    dataRetentionDays: number;
  };
}

// Venue can override specific settings
interface VenueConfigOverride {
  venueId: string;
  overrides: {
    taxRate?: number;           // NYC: 8.875%, NJ: 6.625%
    autoGratuityThreshold?: number; // Fine dining: 4+, casual: 6+
    preAuthPercentage?: number; // High-risk area: 100%, low-risk: 20%
  };
}
```

---

## Part 8: Advanced Analytics

### Chain-Level KPIs

```
┌────────────────────────────────────────────────┐
│ Chain Performance - November 2025               │
├────────────────────────────────────────────────┤
│                                                 │
│ 💰 Revenue                                     │
│ • Total: $1,247,830                             │
│ • Avg per venue: $103,985                       │
│ • YoY growth: +12.4%                            │
│                                                 │
│ 📊 Efficiency Metrics                          │
│ • Chain avg labor %: 28.9%                      │
│ • Chain avg COGS %: 32.1%                       │
│ • Chain avg profit margin: 39.0%                │
│                                                 │
│ 🏆 Best Practices (Top 3 Venues)                │
│ • Lowest labor %: Back Bay (26.2%)              │
│ • Highest $/sqft: Times Square ($425)           │
│ • Best repeat rate: Brooklyn (68%)              │
│                                                 │
│ ⚠️ Opportunities (Bottom 3 Venues)             │
│ • Highest labor %: Cambridge (34.8%)            │
│ • Lowest $/sqft: Queens ($98)                   │
│ • Worst repeat rate: Airport (22%)              │
│                                                 │
│ 💡 Recommended Actions                         │
│ 1. Share Brooklyn's retention strategies        │
│ 2. Audit Cambridge labor costs (4.8% over)      │
│ 3. Optimize Queens marketing (underperforming)  │
│                                                 │
└────────────────────────────────────────────────┘
```

---

## Conclusion

Multi-Location Chain Management is the **scalability engine** for growing restaurant groups:

1. **Organizational hierarchy** (Organization → Regions → Venues with RBAC)
2. **Master menu management** (create once, deploy everywhere with local overrides)
3. **Unified analytics** (see all locations at a glance, benchmark performance)
4. **Fast expansion** (clone configurations, 2-hour setup for new locations)
5. **Shared staff pools** (employees work across locations)
6. **Centralized configuration** (global standards with venue flexibility)

**Without multi-location management:** Fragmented systems, manual reporting, slow expansion  
**With multi-location management:** 90% less admin time, instant visibility, 10x faster onboarding

**Key Innovation:** Using **organizational hierarchy + menu inheritance + cross-location analytics** to enable true enterprise-grade multi-unit management while preserving venue-level autonomy.

**Integration Points:**
- All venue features (scoped by venueId, aggregated at org level)
- Analytics (cross-location reports, benchmarking)
- Loyalty (earn/redeem across chain)
- Staff Scheduling (multi-location assignments)
- Inventory (cross-location transfers)
