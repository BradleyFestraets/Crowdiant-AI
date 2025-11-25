# Technical Specification: Multi-Location Chain Management

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** November 26, 2025  
**Owner:** Crowdiant OS Platform Team

---

## 1. Executive Summary

### 1.1 Purpose

The Multi-Location Chain Management system enables restaurant groups, franchises, and multi-unit operators to manage all locations from a unified platform. It provides centralized control over menus, staff, analytics, and configuration while preserving venue-level autonomy. By aggregating data across locations, operators gain benchmarking insights, identify best practices, and scale operations efficiently.

### 1.1 Business Goals

- **Operational Efficiency:** Manage 10-100+ locations from single dashboard
- **Standardization:** Ensure brand consistency across all venues
- **Performance Insights:** Identify top/bottom performers, replicate success
- **Cost Reduction:** Centralized menu management, bulk purchasing, shared staff
- **Faster Expansion:** Clone configurations for new locations (days vs weeks)

### 1.3 Core Capabilities

1. **Organizational Hierarchy:** Multi-tier structure (Organization → Regions → Venues)
2. **Centralized Menu Management:** Create master menus, push to locations with overrides
3. **Cross-Location Analytics:** Aggregate sales, labor, inventory across venues
4. **Benchmarking:** Compare metrics (sales/sqft, labor%, COGS) across locations
5. **Unified Staff Management:** Staff can work at multiple locations, shared profiles
6. **Chain-Level Configuration:** Global settings with venue-level overrides

### 1.4 Integration Points

- **All Venue Features** → Scoped by venueId, aggregated at chain level
- **Analytics Dashboard** → Cross-location reports, heat maps, rankings
- **Staff Scheduling** → Multi-location staff assignments
- **Inventory** → Cross-location transfers, centralized supplier management
- **Loyalty** → Earn/redeem points across all chain venues

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│          Multi-Location Chain Management Platform           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Organization │  │    Menu      │  │   Analytics  │      │
│  │  Hierarchy   │  │ Inheritance  │  │  Aggregator  │      │
│  │              │  │              │  │              │      │
│  │ • Org        │  │ • Master     │  │ • Rollup     │      │
│  │ • Regions    │  │ • Overrides  │  │ • Benchmark  │      │
│  │ • Venues     │  │ • Sync       │  │ • Rankings   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                          │                                   │
│  ┌──────────────────────▼────────────────────────┐         │
│  │       Centralized Configuration               │         │
│  │  • Settings  • Staff Pools  • Suppliers       │         │
│  └───────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
   ┌──────▼──────┐               ┌───────▼───────┐
   │  Database   │               │   External    │
   │             │               │   Systems     │
   │ • Orgs      │               │               │
   │ • Venues    │               │ • ERP         │
   │ • Configs   │               │ • BI Tools    │
   └─────────────┘               └───────────────┘
```

### 2.2 Data Isolation Strategy

**Approach:** Row-Level Security with `venueId` + `organizationId`

**Benefits:**
- Single database, simplified maintenance
- Cross-location queries efficient (single JOIN)
- Venue-level data isolation (cannot see other venues' data)

**Implementation:**
- All tables include `venueId` (required) and/or `organizationId` (for chain-wide resources)
- Prisma middleware enforces row-level filtering
- API layer validates user has access to requested venueId

---

## 3. Data Model

### 3.1 Organizational Hierarchy

#### Organization (new)
```prisma
model Organization {
  id            String   @id @default(cuid())
  
  // Basic info
  name          String
  slug          String   @unique
  description   String?
  logoUrl       String?
  
  // Business details
  businessType  OrganizationType
  taxId         String?  // EIN for US businesses
  
  // Subscription (SaaS billing)
  plan          SubscriptionPlan @default(STARTER)
  maxVenues     Int @default(1)
  billingEmail  String
  
  // Settings
  timezone      String @default("America/New_York")
  currency      String @default("USD")
  
  // Status
  isActive      Boolean @default(true)
  
  // Relations
  regions       Region[]
  venues        Venue[]
  users         OrganizationUser[]
  masterMenus   MasterMenu[]
  suppliers     Supplier[] // Chain-wide suppliers
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([slug])
}

enum OrganizationType {
  INDEPENDENT  // Single location (can upgrade to CHAIN)
  CHAIN        // Multi-location, same brand
  FRANCHISE    // Multi-location, licensed brand
  MANAGEMENT_GROUP // Operates multiple brands
}

enum SubscriptionPlan {
  STARTER      // 1-3 venues
  PROFESSIONAL // 4-20 venues
  ENTERPRISE   // 20+ venues, custom pricing
}
```

#### Region (new - optional grouping)
```prisma
model Region {
  id            String   @id @default(cuid())
  
  organizationId String
  organization  Organization @relation(fields: [organizationId], references: [id])
  
  // Basic info
  name          String
  description   String?
  
  // Manager
  managerId     String?  // Regional manager userId
  manager       User? @relation(fields: [managerId], references: [id])
  
  // Relations
  venues        Venue[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([organizationId])
}
```

#### Venue (enhanced)
```prisma
model Venue {
  id            String   @id @default(cuid())
  
  // Hierarchy
  organizationId String
  organization  Organization @relation(fields: [organizationId], references: [id])
  regionId      String?
  region        Region? @relation(fields: [regionId], references: [id])
  
  // Basic info (existing fields)
  name          String
  slug          String   @unique
  // ... existing Venue fields ...
  
  // Multi-location specific
  venueCode     String?  // Short code (e.g., "NYC01", "LA02")
  isTestVenue   Boolean @default(false) // For staging/testing
  openedAt      DateTime? // Grand opening date
  
  // Master menu association
  masterMenuId  String?
  masterMenu    MasterMenu? @relation(fields: [masterMenuId], references: [id])
  
  // ... existing relations ...
  
  @@index([organizationId])
  @@index([regionId])
}
```

#### OrganizationUser (new - chain-level permissions)
```prisma
model OrganizationUser {
  id            String   @id @default(cuid())
  
  organizationId String
  organization  Organization @relation(fields: [organizationId], references: [id])
  
  userId        String
  user          User @relation(fields: [userId], references: [id])
  
  // Role at organization level
  role          OrgRole
  
  // Permissions
  permissions   Json // Flexible permissions object
  
  // Venue access (if not org-wide)
  venueAccess   VenueAccess[] // Specific venues this user can access
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([organizationId, userId])
  @@index([userId])
}

enum OrgRole {
  OWNER         // Full access to all venues and settings
  ADMIN         // Manage most settings, cannot delete org
  REGIONAL_MANAGER // Manage venues in assigned region(s)
  MULTI_UNIT_MANAGER // Manage specific venues
  SUPPORT       // Read-only access for troubleshooting
}

model VenueAccess {
  id            String   @id @default(cuid())
  
  orgUserId     String
  orgUser       OrganizationUser @relation(fields: [orgUserId], references: [id])
  
  venueId       String
  venue         Venue @relation(fields: [venueId], references: [id])
  
  role          VenueRole // Manager, Staff, etc.
  
  @@unique([orgUserId, venueId])
  @@index([venueId])
}
```

---

## 4. Centralized Menu Management

### 4.1 Master Menu Concept

**Problem:** 50 locations, each with 100 menu items. Updating prices = 5,000 manual changes.

**Solution:** Master menu with inheritance + overrides.

**Flow:**
1. Create **Master Menu** at org level
2. Assign master menu to venues
3. Venues **inherit** all items automatically
4. Venues can **override** specific fields (price, availability, name)
5. Push updates from master → all venues (respecting overrides)

#### MasterMenu (new)
```prisma
model MasterMenu {
  id            String   @id @default(cuid())
  
  organizationId String
  organization  Organization @relation(fields: [organizationId], references: [id])
  
  // Basic info
  name          String
  description   String?
  version       Int @default(1) // Increment on updates
  
  // Status
  isActive      Boolean @default(true)
  publishedAt   DateTime?
  
  // Relations
  items         MasterMenuItem[]
  venues        Venue[] // Venues using this master menu
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([organizationId])
}

model MasterMenuItem {
  id            String   @id @default(cuid())
  
  masterMenuId  String
  masterMenu    MasterMenu @relation(fields: [masterMenuId], references: [id])
  
  // Item details (same structure as MenuItem)
  name          String
  description   String?
  category      String
  price         Decimal  @db.Decimal(10,2)
  imageUrl      String?
  
  // Options/modifiers (stored as JSON for flexibility)
  modifierGroups Json?
  
  // Dietary tags
  tags          String[] // ["vegetarian", "gluten-free"]
  
  // Status
  isActive      Boolean @default(true)
  
  // Relations
  overrides     MenuItemOverride[] // Venue-specific overrides
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([masterMenuId])
}

model MenuItemOverride {
  id            String   @id @default(cuid())
  
  masterMenuItemId String
  masterMenuItem   MasterMenuItem @relation(fields: [masterMenuItemId], references: [id])
  
  venueId       String
  venue         Venue @relation(fields: [venueId], references: [id])
  
  // Overridden fields (null = use master value)
  name          String?
  description   String?
  price         Decimal? @db.Decimal(10,2)
  imageUrl      String?
  isActive      Boolean? // Can disable item at specific location
  
  updatedAt     DateTime @updatedAt
  
  @@unique([masterMenuItemId, venueId])
  @@index([venueId])
}
```

### 4.2 Menu Sync Logic

**Push Update to Venues:**
```typescript
// services/multi-location/menu-sync.ts

interface MenuSyncInput {
  masterMenuId: string;
  venueIds?: string[]; // If omitted, sync to all venues
  syncMode: 'FULL' | 'DELTA'; // FULL = reset all, DELTA = update changed only
}

export async function syncMasterMenuToVenues(input: MenuSyncInput): Promise<void> {
  const { masterMenuId, venueIds, syncMode } = input;
  
  const masterMenu = await prisma.masterMenu.findUnique({
    where: { id: masterMenuId },
    include: { items: true }
  });
  
  if (!masterMenu) throw new Error('Master menu not found');
  
  // Get target venues
  const targetVenues = venueIds 
    ? await prisma.venue.findMany({ where: { id: { in: venueIds } } })
    : await prisma.venue.findMany({ where: { masterMenuId } });
  
  for (const venue of targetVenues) {
    await syncVenueMenu(masterMenu, venue, syncMode);
  }
}

async function syncVenueMenu(
  masterMenu: MasterMenu,
  venue: Venue,
  syncMode: 'FULL' | 'DELTA'
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Get existing menu items at venue
    const existingItems = await tx.menuItem.findMany({
      where: { venueId: venue.id }
    });
    
    if (syncMode === 'FULL') {
      // Delete all existing items (careful!)
      await tx.menuItem.deleteMany({
        where: { venueId: venue.id }
      });
    }
    
    // Get overrides for this venue
    const overrides = await tx.menuItemOverride.findMany({
      where: { venueId: venue.id }
    });
    
    const overrideMap = new Map(
      overrides.map(o => [o.masterMenuItemId, o])
    );
    
    // Upsert menu items
    for (const masterItem of masterMenu.items) {
      const override = overrideMap.get(masterItem.id);
      
      // Build final item (master + overrides)
      const finalItem = {
        name: override?.name || masterItem.name,
        description: override?.description || masterItem.description,
        price: override?.price || masterItem.price,
        imageUrl: override?.imageUrl || masterItem.imageUrl,
        category: masterItem.category,
        tags: masterItem.tags,
        modifierGroups: masterItem.modifierGroups,
        isActive: override?.isActive !== undefined ? override.isActive : masterItem.isActive,
        masterMenuItemId: masterItem.id // Link to master
      };
      
      await tx.menuItem.upsert({
        where: {
          venueId_masterMenuItemId: {
            venueId: venue.id,
            masterMenuItemId: masterItem.id
          }
        },
        create: {
          venueId: venue.id,
          ...finalItem
        },
        update: finalItem
      });
    }
  });
  
  logger.info('Menu synced', { venueId: venue.id, masterMenuId: masterMenu.id });
}
```

### 4.3 Override Management

**API: Create Override**
```typescript
createMenuItemOverride: protectedProcedure
  .input(z.object({
    masterMenuItemId: z.string(),
    venueId: z.string(),
    overrides: z.object({
      name: z.string().optional(),
      price: z.number().positive().optional(),
      isActive: z.boolean().optional()
    })
  }))
  .mutation(async ({ input, ctx }) => {
    // Validate user has access to venue
    await validateVenueAccess(ctx.session.user.id, input.venueId);
    
    const override = await prisma.menuItemOverride.upsert({
      where: {
        masterMenuItemId_venueId: {
          masterMenuItemId: input.masterMenuItemId,
          venueId: input.venueId
        }
      },
      create: {
        masterMenuItemId: input.masterMenuItemId,
        venueId: input.venueId,
        ...input.overrides
      },
      update: input.overrides
    });
    
    // Re-sync menu item at this venue
    await syncSingleMenuItem(input.masterMenuItemId, input.venueId);
    
    return override;
  });
```

---

## 5. Cross-Location Analytics

### 5.1 Aggregated Dashboard

**Metrics Aggregated Across Venues:**
- Total Revenue (sum)
- Total Orders (count)
- Avg Check Size (weighted average)
- Labor Cost % (aggregated)
- COGS % (aggregated)
- Customer Count (unique across venues)

**Implementation:**
```typescript
// services/multi-location/analytics-aggregator.ts

interface ChainAnalytics {
  organizationId: string;
  period: { start: Date; end: Date };
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    avgCheckSize: number;
    laborCostPercent: number;
    cogsPercent: number;
    uniqueCustomers: number;
  };
  byVenue: Array<{
    venueId: string;
    venueName: string;
    revenue: number;
    orders: number;
    avgCheckSize: number;
  }>;
  byRegion?: Array<{
    regionId: string;
    regionName: string;
    revenue: number;
    venueCount: number;
  }>;
}

export async function getChainAnalytics(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<ChainAnalytics> {
  // Get all venues in org
  const venues = await prisma.venue.findMany({
    where: { organizationId, isActive: true },
    include: { region: true }
  });
  
  const venueIds = venues.map(v => v.id);
  
  // Aggregate orders
  const ordersAgg = await prisma.order.aggregate({
    where: {
      venueId: { in: venueIds },
      status: 'COMPLETED',
      createdAt: { gte: startDate, lte: endDate }
    },
    _sum: { total: true },
    _count: { id: true },
    _avg: { total: true }
  });
  
  // Get unique customers (across all venues)
  const uniqueCustomers = await prisma.order.groupBy({
    by: ['userId'],
    where: {
      venueId: { in: venueIds },
      status: 'COMPLETED',
      createdAt: { gte: startDate, lte: endDate }
    }
  });
  
  // Get labor cost (from scheduling system)
  const laborCost = await calculateChainLaborCost(venueIds, startDate, endDate);
  
  // Get COGS (from inventory system)
  const cogs = await calculateChainCOGS(venueIds, startDate, endDate);
  
  const totalRevenue = ordersAgg._sum.total?.toNumber() || 0;
  const totalOrders = ordersAgg._count.id;
  const avgCheckSize = ordersAgg._avg.total?.toNumber() || 0;
  
  // By-venue breakdown
  const byVenue = await Promise.all(
    venues.map(async (venue) => {
      const venueOrders = await prisma.order.aggregate({
        where: {
          venueId: venue.id,
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { total: true },
        _count: { id: true },
        _avg: { total: true }
      });
      
      return {
        venueId: venue.id,
        venueName: venue.name,
        revenue: venueOrders._sum.total?.toNumber() || 0,
        orders: venueOrders._count.id,
        avgCheckSize: venueOrders._avg.total?.toNumber() || 0
      };
    })
  );
  
  // By-region breakdown (if regions exist)
  const regions = [...new Set(venues.filter(v => v.regionId).map(v => v.regionId))];
  const byRegion = await Promise.all(
    regions.map(async (regionId) => {
      const regionVenues = venues.filter(v => v.regionId === regionId);
      const regionVenueIds = regionVenues.map(v => v.id);
      
      const regionOrders = await prisma.order.aggregate({
        where: {
          venueId: { in: regionVenueIds },
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { total: true }
      });
      
      return {
        regionId: regionId!,
        regionName: regionVenues[0]?.region?.name || 'Unknown',
        revenue: regionOrders._sum.total?.toNumber() || 0,
        venueCount: regionVenues.length
      };
    })
  );
  
  return {
    organizationId,
    period: { start: startDate, end: endDate },
    metrics: {
      totalRevenue,
      totalOrders,
      avgCheckSize,
      laborCostPercent: totalRevenue > 0 ? (laborCost / totalRevenue) * 100 : 0,
      cogsPercent: totalRevenue > 0 ? (cogs / totalRevenue) * 100 : 0,
      uniqueCustomers: uniqueCustomers.length
    },
    byVenue: byVenue.sort((a, b) => b.revenue - a.revenue),
    byRegion: byRegion.sort((a, b) => b.revenue - a.revenue)
  };
}
```

### 5.2 Drill-Down Capabilities

**User Flow:**
1. View chain-wide dashboard (total revenue: $2.5M)
2. Click "By Region" → See Northeast: $1.2M, West: $1.3M
3. Click "Northeast" → See individual venues: NYC01, BOS01, etc.
4. Click "NYC01" → Full venue-level analytics

**API:**
```typescript
getChainDashboard: protectedProcedure
  .input(z.object({
    organizationId: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    groupBy: z.enum(['venue', 'region', 'dayOfWeek']).optional()
  }))
  .query(async ({ input, ctx }) => {
    // Validate user has org access
    await validateOrgAccess(ctx.session.user.id, input.organizationId);
    
    return getChainAnalytics(
      input.organizationId,
      input.startDate,
      input.endDate
    );
  });
```

---

## 6. Benchmarking & Rankings

### 6.1 Performance Metrics

**Key Benchmarks:**
- **Sales/Square Foot:** Normalize for venue size
- **Sales/Seat:** Normalize for capacity
- **Labor%:** Compare staffing efficiency
- **COGS%:** Identify best/worst food cost management
- **Customer Satisfaction:** Avg rating, review count

**Ranking System:**
```typescript
interface VenueRanking {
  venueId: string;
  venueName: string;
  rank: number;
  percentile: number; // 0-100 (100 = top performer)
  value: number;
  target: number; // Org-wide target
  variance: number; // % above/below target
}

export async function rankVenues(
  organizationId: string,
  metric: 'revenue' | 'laborPercent' | 'cogsPercent' | 'avgRating',
  period: { start: Date; end: Date }
): Promise<VenueRanking[]> {
  const venues = await prisma.venue.findMany({
    where: { organizationId, isActive: true }
  });
  
  // Calculate metric for each venue
  const venueMetrics = await Promise.all(
    venues.map(async (venue) => {
      const value = await calculateVenueMetric(venue.id, metric, period);
      return { venueId: venue.id, venueName: venue.name, value };
    })
  );
  
  // Sort (descending for revenue/rating, ascending for costs)
  const isLowerBetter = ['laborPercent', 'cogsPercent'].includes(metric);
  venueMetrics.sort((a, b) => isLowerBetter ? a.value - b.value : b.value - a.value);
  
  // Calculate target (median or org-wide goal)
  const target = venueMetrics.reduce((sum, v) => sum + v.value, 0) / venueMetrics.length;
  
  // Build rankings
  return venueMetrics.map((vm, index) => ({
    venueId: vm.venueId,
    venueName: vm.venueName,
    rank: index + 1,
    percentile: ((venueMetrics.length - index) / venueMetrics.length) * 100,
    value: vm.value,
    target,
    variance: ((vm.value - target) / target) * 100
  }));
}
```

### 6.2 Best Practices Identification

**Scenario:** NYC01 has 18% labor cost, while BOS01 has 28%.

**Analysis Tool:**
```typescript
interface BestPracticeInsight {
  topPerformer: {
    venueId: string;
    venueName: string;
    metric: string;
    value: number;
  };
  avgPerformer: {
    value: number;
  };
  recommendations: string[];
}

export async function identifyBestPractices(
  organizationId: string,
  metric: string
): Promise<BestPracticeInsight> {
  const rankings = await rankVenues(organizationId, metric as any, {
    start: subDays(new Date(), 30),
    end: new Date()
  });
  
  const topPerformer = rankings[0];
  const avgValue = rankings.reduce((sum, r) => sum + r.value, 0) / rankings.length;
  
  // Generate recommendations based on metric
  const recommendations: string[] = [];
  
  if (metric === 'laborPercent') {
    recommendations.push(
      `${topPerformer.venueName} achieves ${topPerformer.value.toFixed(1)}% labor cost vs ${avgValue.toFixed(1)}% average.`,
      `Key factors: demand forecasting, shift optimization, cross-training.`,
      `Action: Schedule knowledge-sharing session with ${topPerformer.venueName} manager.`
    );
  }
  
  return {
    topPerformer: {
      venueId: topPerformer.venueId,
      venueName: topPerformer.venueName,
      metric,
      value: topPerformer.value
    },
    avgPerformer: {
      value: avgValue
    },
    recommendations
  };
}
```

---

## 7. Multi-Location Staff Management

### 7.1 Shared Staff Profiles

**Problem:** Employee works at 3 locations. Separate profiles = data fragmentation.

**Solution:** Single `Employee` profile with multi-venue assignments.

#### Employee (enhanced)
```prisma
model Employee {
  id            String   @id @default(cuid())
  
  // Belongs to organization (not specific venue)
  organizationId String
  organization  Organization @relation(fields: [organizationId], references: [id])
  
  userId        String?
  user          User? @relation(fields: [userId], references: [id])
  
  // Basic info
  firstName     String
  lastName      String
  email         String
  phone         String
  
  // Employment
  employeeId    String?  // Company employee ID
  hireDate      DateTime
  terminationDate DateTime?
  status        EmployeeStatus @default(ACTIVE)
  
  // Multi-venue assignments
  venueAssignments EmployeeVenueAssignment[]
  shifts        Shift[] // Can be scheduled at any assigned venue
  
  // ... existing fields ...
  
  @@index([organizationId])
  @@index([email])
}

model EmployeeVenueAssignment {
  id            String   @id @default(cuid())
  
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id])
  
  venueId       String
  venue         Venue @relation(fields: [venueId], references: [id])
  
  // Role at this venue
  role          String // "Server", "Cook", "Manager"
  
  // Status
  isPrimary     Boolean @default(false) // Home location
  canWorkAt     Boolean @default(true)
  
  assignedAt    DateTime @default(now())
  
  @@unique([employeeId, venueId])
  @@index([venueId])
}
```

### 7.2 Cross-Location Scheduling

**Use Case:** NYC01 is short-staffed. Pull employee from BOS01.

**Implementation:**
```typescript
findAvailableStaff: protectedProcedure
  .input(z.object({
    venueId: z.string(),
    date: z.date(),
    role: z.string(),
    includeNearbyVenues: z.boolean().default(false),
    maxDistance: z.number().default(50) // miles
  }))
  .query(async ({ input }) => {
    const venue = await prisma.venue.findUnique({
      where: { id: input.venueId }
    });
    
    if (!venue) throw new Error('Venue not found');
    
    // Get employees assigned to this venue
    let employeeIds = await prisma.employeeVenueAssignment.findMany({
      where: { venueId: input.venueId, canWorkAt: true },
      select: { employeeId: true }
    }).then(results => results.map(r => r.employeeId));
    
    // If including nearby venues
    if (input.includeNearbyVenues) {
      const nearbyVenues = await findNearbyVenues(
        venue.organizationId,
        venue.latitude,
        venue.longitude,
        input.maxDistance
      );
      
      const nearbyEmployeeIds = await prisma.employeeVenueAssignment.findMany({
        where: {
          venueId: { in: nearbyVenues.map(v => v.id) },
          canWorkAt: true
        },
        select: { employeeId: true }
      }).then(results => results.map(r => r.employeeId));
      
      employeeIds = [...new Set([...employeeIds, ...nearbyEmployeeIds])];
    }
    
    // Filter by availability
    const available = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        status: 'ACTIVE',
        // Check availability table
        availability: {
          some: {
            dayOfWeek: input.date.getDay(),
            isAvailable: true
          }
        },
        // Ensure not already scheduled
        shifts: {
          none: {
            date: input.date
          }
        }
      },
      include: {
        venueAssignments: {
          include: { venue: true }
        }
      }
    });
    
    return available.map(emp => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      primaryVenue: emp.venueAssignments.find(va => va.isPrimary)?.venue.name,
      distance: input.includeNearbyVenues 
        ? calculateDistance(venue, emp.venueAssignments.find(va => va.isPrimary)?.venue)
        : 0
    }));
  });
```

---

## 8. Venue Cloning & Configuration Templates

### 8.1 Clone Venue Setup

**Use Case:** Opening new location. Clone NYC01 config to NYC02.

**What Gets Cloned:**
- Menu (from master or venue-specific)
- Settings (hours, tax rates, policies)
- Employee roles (not specific employees)
- Inventory items & par levels
- Loyalty rewards

**What Doesn't Get Cloned:**
- Orders, transactions, analytics
- Customer data
- Specific employees

**Implementation:**
```typescript
cloneVenue: protectedProcedure
  .input(z.object({
    sourceVenueId: z.string(),
    newVenue: z.object({
      name: z.string(),
      slug: z.string(),
      address: z.string(),
      // ... other venue fields
    }),
    cloneOptions: z.object({
      includeMenu: z.boolean().default(true),
      includeSettings: z.boolean().default(true),
      includeInventory: z.boolean().default(true),
      includeRewards: z.boolean().default(true)
    })
  }))
  .mutation(async ({ input, ctx }) => {
    const sourceVenue = await prisma.venue.findUnique({
      where: { id: input.sourceVenueId },
      include: {
        menuItems: true,
        inventoryItems: true,
        loyaltyRewards: true
      }
    });
    
    if (!sourceVenue) throw new Error('Source venue not found');
    
    // Create new venue
    const newVenue = await prisma.venue.create({
      data: {
        ...input.newVenue,
        organizationId: sourceVenue.organizationId,
        regionId: sourceVenue.regionId,
        masterMenuId: sourceVenue.masterMenuId,
        // Clone settings
        timezone: sourceVenue.timezone,
        currency: sourceVenue.currency,
        taxRate: sourceVenue.taxRate,
        // ... other settings
      }
    });
    
    // Clone menu (if not using master menu)
    if (input.cloneOptions.includeMenu && !sourceVenue.masterMenuId) {
      await prisma.menuItem.createMany({
        data: sourceVenue.menuItems.map(item => ({
          ...item,
          id: undefined, // Generate new ID
          venueId: newVenue.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      });
    }
    
    // Clone inventory items
    if (input.cloneOptions.includeInventory) {
      await prisma.inventoryItem.createMany({
        data: sourceVenue.inventoryItems.map(item => ({
          ...item,
          id: undefined,
          venueId: newVenue.id,
          // Reset stock to 0
          stockLevels: undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      });
    }
    
    // Clone loyalty rewards
    if (input.cloneOptions.includeRewards) {
      await prisma.loyaltyReward.createMany({
        data: sourceVenue.loyaltyRewards.map(reward => ({
          ...reward,
          id: undefined,
          venueId: newVenue.id,
          redeemedCount: 0, // Reset usage
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      });
    }
    
    return newVenue;
  });
```

---

## 9. User Interface Flows

### 9.1 Chain Dashboard (Owner View)

**Route:** `/org/[orgId]/dashboard`

```
┌──────────────────────────────────────────────────────────────┐
│  [Org Logo] Acme Restaurant Group         [Settings] [👤]    │
├──────────────────────────────────────────────────────────────┤
│  Overview  |  Venues  |  Menus  |  Staff  |  Analytics       │
├──────────────────────────────────────────────────────────────┤
│  All Locations (12 venues)         [+ Add New Location]      │
│                                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Total Revenue│ │ Avg/Location│ │ Labor %    │           │
│  │  $2.5M      │ │  $208K      │ │  24.5%     │           │
│  │ +12% vs LM  │ │ +8% vs LM   │ │ Target: 22%│           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                               │
│  Performance by Location:                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Rank | Venue      | Region    | Revenue  | Labor% | ⋮ │ │
│  │ 1    | NYC-SoHo   | Northeast | $385K    | 18.2%  | ⋮ │ │
│  │ 2    | LA-DTLA    | West      | $320K    | 21.5%  | ⋮ │ │
│  │ 3    | SF-Mission | West      | $298K    | 19.8%  | ⋮ │ │
│  │ ...                                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Revenue by Region:                                          │
│  [Bar Chart: Northeast $1.2M | West $1.3M]                  │
└──────────────────────────────────────────────────────────────┘
```

### 9.2 Master Menu Management

**Route:** `/org/[orgId]/menus/master`

```
┌──────────────────────────────────────────────────────────────┐
│  Master Menus                              [+ Create Master] │
├──────────────────────────────────────────────────────────────┤
│  Active Master Menus:                                        │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Core Menu v3                      12 locations          │ │
│  │ 48 items  |  Last updated: Nov 20  |  [Edit] [Sync]    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Items (48):                                  [+ Add Item]   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Classic Burger         $14.99      Active   [Edit] ⋮   │ │
│  │   Overrides at: NYC-SoHo ($16.99), LA ($15.99)        │ │
│  │                                                         │ │
│  │ Caesar Salad           $10.99      Active   [Edit] ⋮   │ │
│  │   No overrides                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Push Updates to All Venues]                                │
└──────────────────────────────────────────────────────────────┘
```

### 9.3 Multi-Venue Staff Scheduler

**Route:** `/org/[orgId]/schedule`

```
┌──────────────────────────────────────────────────────────────┐
│  Schedule (Week of Nov 25)         [All Venues ▼] [Week ▼]  │
├──────────────────────────────────────────────────────────────┤
│  Filter: [NYC-SoHo] [LA-DTLA] [SF-Mission]                  │
│                                                               │
│  Mon | Tue | Wed | Thu | Fri | Sat | Sun                    │
│  ─────────────────────────────────────────────────────       │
│  NYC-SoHo:                                                   │
│    Sarah K. (Server)    11am-7pm   ✅ Confirmed             │
│    Mike L. (Cook)       10am-6pm   ⚠️ Needs approval        │
│                                                               │
│  LA-DTLA:                                                    │
│    Jessica M. (Manager) 9am-5pm    ✅ Confirmed             │
│    [⚠️ 2 open shifts]                                        │
│                                                               │
│  💡 Suggestion: Mike L. available in SF-Mission (20 mi away) │
└──────────────────────────────────────────────────────────────┘
```

---

## 10. Implementation Roadmap

**Phase 1: Core Hierarchy (Sprint 1-2, 2 weeks)**
- [ ] Data model (Organization, Region, enhanced Venue)
- [ ] Organization creation flow
- [ ] Venue-to-org association
- [ ] Permission system (OrgRole, VenueAccess)

**Phase 2: Master Menu (Sprint 3-4, 2 weeks)**
- [ ] MasterMenu, MasterMenuItem models
- [ ] Menu sync engine (push updates to venues)
- [ ] Override management
- [ ] UI: Master menu editor

**Phase 3: Cross-Location Analytics (Sprint 5-6, 2 weeks)**
- [ ] Aggregation queries (revenue, orders, metrics by venue/region)
- [ ] Chain dashboard UI
- [ ] Drill-down navigation
- [ ] Export reports (CSV, PDF)

**Phase 4: Benchmarking (Sprint 7, 1 week)**
- [ ] Ranking system (by revenue, labor%, COGS%)
- [ ] Best practices identifier
- [ ] Variance alerts ("NYC02 labor 10% above avg")

**Phase 5: Multi-Location Staff (Sprint 8-9, 2 weeks)**
- [ ] EmployeeVenueAssignment model
- [ ] Cross-location scheduling
- [ ] Nearby staff finder (distance-based)
- [ ] Multi-venue timesheet aggregation

**Phase 6: Venue Cloning (Sprint 10, 1 week)**
- [ ] Clone venue API
- [ ] Configuration templates
- [ ] Bulk updates (push settings to multiple venues)

**Total Timeline:** 10 sprints (20 weeks)

---

## 11. Non-Functional Requirements

### 11.1 Performance

| Metric | Target |
|--------|--------|
| Chain dashboard load (12 venues) | < 2 seconds |
| Menu sync (50 items → 10 venues) | < 10 seconds |
| Cross-location analytics query | < 3 seconds |
| Venue ranking calculation | < 1 second |

**Optimization:**
- Pre-aggregate metrics daily (materialized views or summary tables)
- Cache chain-level stats in Redis (TTL 1 hour)
- Batch menu sync operations

### 11.2 Scalability

**Target:** Support 1,000-venue enterprise chains

**Strategy:**
- Horizontal scaling (read replicas for analytics)
- Partitioning by `organizationId` if single-tenant database approach
- Async processing for batch operations (menu sync, report generation)

### 11.3 Security

**Row-Level Security:**
- All queries filtered by `organizationId` + `venueId`
- Users can only access venues in their `VenueAccess` list
- Owners/admins see all venues in org

**Audit Logging:**
- Track menu changes (who pushed updates, what changed)
- Track permission changes (who granted access to whom)

---

## 12. Success Metrics

**6-Month Post-Launch KPIs:**

| Metric | Target |
|--------|--------|
| Adoption Rate | 80% of multi-location customers |
| Time to Add New Location | < 1 hour (vs 2-3 days manual) |
| Menu Update Efficiency | 95% faster (push once vs update each) |
| Cross-Location Staff Utilization | 20% increase in shared shifts |
| Cost Savings (centralization) | 15-20% reduction in admin labor |

---

## Appendix: Sample Queries

### A.1 Get Organization Hierarchy

```sql
SELECT 
  o.name AS org_name,
  r.name AS region_name,
  v.name AS venue_name,
  v.venueCode
FROM "Organization" o
LEFT JOIN "Region" r ON o.id = r.organizationId
LEFT JOIN "Venue" v ON r.id = v.regionId
WHERE o.id = $1
ORDER BY r.name, v.name;
```

### A.2 Cross-Location Revenue

```sql
SELECT 
  v.name AS venue_name,
  DATE_TRUNC('day', o.createdAt) AS date,
  SUM(o.total) AS daily_revenue
FROM "Order" o
JOIN "Venue" v ON o.venueId = v.id
WHERE v.organizationId = $1
  AND o.status = 'COMPLETED'
  AND o.createdAt >= $2
  AND o.createdAt <= $3
GROUP BY v.name, DATE_TRUNC('day', o.createdAt)
ORDER BY date, venue_name;
```

---

**Document Status:** ✅ Complete  
**Next Steps:** Review with enterprise customers → Begin Phase 1 implementation
