# Technical Specification: Inventory Waste Reduction

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** November 26, 2025  
**Owner:** Crowdiant OS Platform Team

---

## 1. Executive Summary

### 1.1 Purpose

The Inventory Waste Reduction system leverages AI-driven demand forecasting, intelligent par-level management, and real-time tracking to minimize food waste, optimize purchasing, and improve profitability. By integrating with POS sales data, menu engineering insights, and supplier ordering systems, this feature transforms inventory from a manual, error-prone process into a strategic operational advantage.

### 1.2 Business Goals

- **Reduce Food Waste:** Target 15-25% reduction in waste costs within 90 days
- **Optimize Cash Flow:** Reduce over-ordering by 20%; improve inventory turnover ratio
- **Increase Profitability:** Direct impact on COGS (Cost of Goods Sold) percentage
- **Save Labor Time:** Reduce manual counting and ordering time from 8-10 hours/week to 2-3 hours
- **Ensure Availability:** Minimize stockouts during service (target <2% of items per week)

### 1.3 Core Capabilities

1. **Real-Time Inventory Tracking:** Automatic deduction on sale, manual adjustments, waste logging
2. **Smart Par Levels:** Dynamic calculation based on demand forecasts, lead times, safety stock
3. **Waste Analytics:** Track waste by category, time, reason; identify patterns
4. **Predictive Ordering:** Generate suggested purchase orders based on forecasted demand
5. **Supplier Integration:** Send POs electronically; track deliveries; reconcile invoices
6. **Cost Tracking:** Monitor COGS, theoretical vs actual usage, variance alerts

### 1.4 Integration Points

- **POS System** → Real-time item sales deduct inventory
- **Menu Management** → Recipe costing links menu items to ingredients
- **Demand Forecasting** (from Scheduling Intelligence) → Predicts future usage
- **Supplier Systems** → Electronic ordering, invoice reconciliation
- **Analytics Dashboard** → Waste reports, COGS trends, profitability by item

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Inventory Waste Reduction System                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐       │
│  │  Real-Time  │  │   Smart     │  │  Predictive  │       │
│  │  Tracker    │  │   Par Level │  │  Ordering    │       │
│  │             │  │  Calculator │  │  Engine      │       │
│  │ • Deduction │  │             │  │              │       │
│  │ • Waste log │  │ • Forecast  │  │ • Usage      │       │
│  │ • Counts    │  │ • Safety    │  │   forecast   │       │
│  │ • Receive   │  │ • Lead time │  │ • Supplier   │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘       │
│         │                │                 │               │
│         └────────────────┴─────────────────┘               │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
   ┌──────▼──────┐                  ┌──────▼──────┐
   │  Database   │                  │  External   │
   │             │                  │  Systems    │
   │ • Inventory │                  │             │
   │ • Waste     │                  │ • Suppliers │
   │ • Orders    │                  │ • Demand    │
   │ • Recipes   │                  │   Forecast  │
   └─────────────┘                  └─────────────┘
```

### 2.2 Component Responsibilities

#### 2.2.1 Real-Time Tracker
- **Input:** POS sales, manual adjustments, waste entries, deliveries
- **Output:** Current stock levels, transaction history
- **Trigger:** Event-driven (sale, waste log) + scheduled reconciliation
- **Latency:** < 2s for stock level updates

#### 2.2.2 Smart Par Level Calculator
- **Input:** Historical usage, demand forecast, lead times, safety stock multiplier
- **Output:** Dynamic par levels per item
- **Refresh:** Daily at 3am + on-demand recalculation
- **Algorithm:** Statistical analysis with seasonal adjustments

#### 2.2.3 Predictive Ordering Engine
- **Input:** Current stock, par levels, forecast, supplier schedules
- **Output:** Suggested purchase orders grouped by supplier
- **Mode:** Auto-generate or assistant mode (review before sending)
- **Frequency:** Configurable (daily, weekly, on-threshold)

---

## 3. Data Model

### 3.1 Core Entities

#### InventoryItem (new)
```prisma
model InventoryItem {
  id            String   @id @default(cuid())
  venueId       String
  venue         Venue    @relation(fields: [venueId], references: [id])
  
  // Basic info
  name          String
  sku           String?  // Internal SKU
  category      ItemCategory
  unit          UnitOfMeasure
  
  // Supplier & ordering
  supplierId    String?
  supplier      Supplier? @relation(fields: [supplierId], references: [id])
  supplierSku   String?
  packSize      Decimal?  @db.Decimal(10,3) // e.g., 5 lb bag
  packUnit      UnitOfMeasure?
  
  // Cost
  unitCost      Decimal  @db.Decimal(10,4) // Cost per unit
  lastCostUpdate DateTime?
  
  // Storage & handling
  storageLocation String?  // "Walk-in cooler", "Dry storage"
  shelfLifeDays   Int?
  
  // Par levels (dynamic)
  parLevel      Decimal?  @db.Decimal(10,2) // Target stock level
  parLevelMin   Decimal?  @db.Decimal(10,2) // Reorder point
  parLevelMax   Decimal?  @db.Decimal(10,2) // Max capacity
  leadTimeDays  Int @default(2)
  
  // Status
  isActive      Boolean @default(true)
  isTracked     Boolean @default(true) // Some items may not need tracking
  
  // Relations
  stockLevels   StockLevel[]
  wasteLogs     WasteLog[]
  recipeItems   RecipeItem[]
  purchaseOrderItems PurchaseOrderItem[]
  transactions  InventoryTransaction[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([venueId, sku])
  @@index([venueId, category])
  @@index([supplierId])
}

enum ItemCategory {
  PROTEIN
  PRODUCE
  DAIRY
  DRY_GOODS
  BEVERAGE_ALCOHOL
  BEVERAGE_NON_ALCOHOL
  PAPER_GOODS
  CLEANING
  SMALLWARES
  OTHER
}

enum UnitOfMeasure {
  EACH
  LB
  OZ
  KG
  G
  GAL
  QT
  L
  ML
  CASE
  BAG
  BOX
}
```

#### StockLevel (new - current inventory snapshot)
```prisma
model StockLevel {
  id            String   @id @default(cuid())
  venueId       String
  venue         Venue    @relation(fields: [venueId], references: [id])
  
  itemId        String
  item          InventoryItem @relation(fields: [itemId], references: [id])
  
  // Current quantity
  quantity      Decimal  @db.Decimal(10,3)
  unit          UnitOfMeasure
  
  // Valuation
  totalValue    Decimal  @db.Decimal(10,2)
  
  // Timestamps
  lastCountDate DateTime?
  lastReceiveDate DateTime?
  lastUsedDate  DateTime?
  
  updatedAt     DateTime @updatedAt
  
  @@unique([venueId, itemId])
  @@index([venueId])
}
```

#### InventoryTransaction (new - audit trail)
```prisma
model InventoryTransaction {
  id            String   @id @default(cuid())
  venueId       String
  venue         Venue    @relation(fields: [venueId], references: [id])
  
  itemId        String
  item          InventoryItem @relation(fields: [itemId], references: [id])
  
  // Transaction details
  type          TransactionType
  quantity      Decimal  @db.Decimal(10,3)
  unit          UnitOfMeasure
  
  // Before/after
  quantityBefore Decimal @db.Decimal(10,3)
  quantityAfter  Decimal @db.Decimal(10,3)
  
  // Cost tracking
  unitCost      Decimal? @db.Decimal(10,4)
  totalCost     Decimal? @db.Decimal(10,2)
  
  // References
  orderId       String?  // POS order if SALE
  purchaseOrderId String?  // PO if RECEIVE
  wasteLogId    String?  // Waste log if WASTE
  
  // Metadata
  notes         String?
  performedBy   String
  
  createdAt     DateTime @default(now())
  
  @@index([venueId, itemId, createdAt])
  @@index([type, createdAt])
}

enum TransactionType {
  SALE          // Auto-deduction from POS
  WASTE         // Logged waste
  RECEIVE       // Delivery received
  COUNT         // Physical count adjustment
  TRANSFER_IN   // From another location
  TRANSFER_OUT  // To another location
  PREP          // Used in prep/recipe
  RETURN        // Returned to supplier
}
```

#### WasteLog (new)
```prisma
model WasteLog {
  id            String   @id @default(cuid())
  venueId       String
  venue         Venue    @relation(fields: [venueId], references: [id])
  
  itemId        String
  item          InventoryItem @relation(fields: [itemId], references: [id])
  
  // Waste details
  quantity      Decimal  @db.Decimal(10,3)
  unit          UnitOfMeasure
  reason        WasteReason
  
  // Cost
  wastedValue   Decimal  @db.Decimal(10,2)
  
  // Context
  loggedBy      String
  notes         String?
  photoUrl      String?  // Optional photo evidence
  
  createdAt     DateTime @default(now())
  
  @@index([venueId, createdAt])
  @@index([itemId, reason])
}

enum WasteReason {
  SPOILAGE
  EXPIRATION
  OVER_PREP
  DROPPED
  BURNT
  QUALITY_ISSUE
  CONTAMINATION
  OVER_PORTIONING
  CUSTOMER_COMPLAINT
  OTHER
}
```

#### PurchaseOrder (new)
```prisma
model PurchaseOrder {
  id            String   @id @default(cuid())
  venueId       String
  venue         Venue    @relation(fields: [venueId], references: [id])
  
  supplierId    String
  supplier      Supplier @relation(fields: [supplierId], references: [id])
  
  // Order details
  poNumber      String   // Auto-generated or manual
  orderDate     DateTime @default(now())
  expectedDate  DateTime?
  receivedDate  DateTime?
  
  // Status
  status        POStatus @default(DRAFT)
  
  // Financial
  subtotal      Decimal  @db.Decimal(10,2)
  tax           Decimal? @db.Decimal(10,2)
  shipping      Decimal? @db.Decimal(10,2)
  total         Decimal  @db.Decimal(10,2)
  
  // Relations
  items         PurchaseOrderItem[]
  
  // Metadata
  createdBy     String
  approvedBy    String?
  approvedAt    DateTime?
  notes         String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([venueId, poNumber])
  @@index([venueId, status])
  @@index([supplierId, status])
}

enum POStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  SENT
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}
```

#### PurchaseOrderItem (new)
```prisma
model PurchaseOrderItem {
  id              String   @id @default(cuid())
  
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  
  itemId          String
  item            InventoryItem @relation(fields: [itemId], references: [id])
  
  // Order details
  quantity        Decimal  @db.Decimal(10,3)
  unit            UnitOfMeasure
  unitCost        Decimal  @db.Decimal(10,4)
  lineTotal       Decimal  @db.Decimal(10,2)
  
  // Receiving
  quantityReceived Decimal? @db.Decimal(10,3)
  receivedBy      String?
  receivedAt      DateTime?
  
  notes           String?
  
  @@index([purchaseOrderId])
  @@index([itemId])
}
```

#### Supplier (new)
```prisma
model Supplier {
  id            String   @id @default(cuid())
  venueId       String?  // null = chain-wide supplier
  venue         Venue?   @relation(fields: [venueId], references: [id])
  
  // Basic info
  name          String
  contactName   String?
  email         String?
  phone         String?
  
  // Address
  addressLine1  String?
  addressLine2  String?
  city          String?
  state         String?
  zip           String?
  
  // Ordering
  leadTimeDays  Int @default(2)
  minOrderAmount Decimal? @db.Decimal(10,2)
  deliveryDays  String?  // "Mon,Wed,Fri"
  
  // Payment terms
  paymentTerms  String?  // "Net 30", "COD"
  accountNumber String?
  
  // Status
  isActive      Boolean @default(true)
  
  // Relations
  items         InventoryItem[]
  purchaseOrders PurchaseOrder[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([venueId])
}
```

#### RecipeItem (new - links menu items to ingredients)
```prisma
model RecipeItem {
  id            String   @id @default(cuid())
  
  menuItemId    String
  menuItem      MenuItem @relation(fields: [menuItemId], references: [id])
  
  inventoryItemId String
  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id])
  
  // Usage per serving
  quantity      Decimal  @db.Decimal(10,3)
  unit          UnitOfMeasure
  
  // Cost
  costPerServing Decimal @db.Decimal(10,4)
  
  // Optional grouping (e.g., "Burger Patty", "Burger Toppings")
  componentName String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([menuItemId])
  @@index([inventoryItemId])
}
```

---

## 4. Real-Time Inventory Tracking

### 4.1 Automatic Deduction on Sale

**Event Flow:**
```
POS Order Created → Items Sold → Deduction Calculator → Stock Level Update → Transaction Log
```

**Implementation:**
```typescript
// services/inventory/deduction-service.ts

interface DeductionInput {
  orderId: string;
  venueId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
}

export async function processOrderDeduction(input: DeductionInput): Promise<void> {
  const { orderId, venueId, items } = input;
  
  // Get recipes for all menu items
  const recipes = await prisma.recipeItem.findMany({
    where: {
      menuItemId: { in: items.map(i => i.menuItemId) }
    },
    include: {
      inventoryItem: true
    }
  });
  
  // Calculate total deduction per inventory item
  const deductions = new Map<string, number>();
  
  for (const orderItem of items) {
    const recipeItems = recipes.filter(r => r.menuItemId === orderItem.menuItemId);
    
    for (const recipeItem of recipeItems) {
      const current = deductions.get(recipeItem.inventoryItemId) || 0;
      deductions.set(
        recipeItem.inventoryItemId,
        current + (recipeItem.quantity.toNumber() * orderItem.quantity)
      );
    }
  }
  
  // Apply deductions atomically
  await prisma.$transaction(async (tx) => {
    for (const [itemId, qty] of deductions.entries()) {
      const stockLevel = await tx.stockLevel.findUnique({
        where: { venueId_itemId: { venueId, itemId } }
      });
      
      if (!stockLevel) continue; // Item not tracked
      
      const newQuantity = stockLevel.quantity.toNumber() - qty;
      
      // Update stock level
      await tx.stockLevel.update({
        where: { id: stockLevel.id },
        data: {
          quantity: newQuantity,
          lastUsedDate: new Date()
        }
      });
      
      // Log transaction
      await tx.inventoryTransaction.create({
        data: {
          venueId,
          itemId,
          type: 'SALE',
          quantity: -qty,
          unit: stockLevel.unit,
          quantityBefore: stockLevel.quantity.toNumber(),
          quantityAfter: newQuantity,
          orderId,
          performedBy: 'SYSTEM'
        }
      });
      
      // Check for low stock alert
      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId }
      });
      
      if (item && item.parLevelMin && newQuantity < item.parLevelMin.toNumber()) {
        await emitLowStockAlert(venueId, itemId, newQuantity, item.parLevelMin.toNumber());
      }
    }
  });
}
```

### 4.2 Waste Logging

**UI Flow:**
1. Staff opens waste log form
2. Selects item (autocomplete search)
3. Enters quantity + reason
4. Optional: photo upload
5. Submits → deducts from stock

**API:**
```typescript
logWaste: protectedProcedure
  .input(z.object({
    venueId: z.string(),
    itemId: z.string(),
    quantity: z.number().positive(),
    unit: z.nativeEnum(UnitOfMeasure),
    reason: z.nativeEnum(WasteReason),
    notes: z.string().optional(),
    photoUrl: z.string().url().optional()
  }))
  .mutation(async ({ input, ctx }) => {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: input.itemId }
    });
    
    const wastedValue = item.unitCost.toNumber() * input.quantity;
    
    await prisma.$transaction(async (tx) => {
      // Create waste log
      const wasteLog = await tx.wasteLog.create({
        data: {
          venueId: input.venueId,
          itemId: input.itemId,
          quantity: input.quantity,
          unit: input.unit,
          reason: input.reason,
          wastedValue,
          loggedBy: ctx.session.user.id,
          notes: input.notes,
          photoUrl: input.photoUrl
        }
      });
      
      // Deduct from stock
      const stockLevel = await tx.stockLevel.findUnique({
        where: { venueId_itemId: { venueId: input.venueId, itemId: input.itemId } }
      });
      
      if (stockLevel) {
        const newQty = stockLevel.quantity.toNumber() - input.quantity;
        
        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { quantity: newQty }
        });
        
        await tx.inventoryTransaction.create({
          data: {
            venueId: input.venueId,
            itemId: input.itemId,
            type: 'WASTE',
            quantity: -input.quantity,
            unit: input.unit,
            quantityBefore: stockLevel.quantity.toNumber(),
            quantityAfter: newQty,
            wasteLogId: wasteLog.id,
            totalCost: wastedValue,
            performedBy: ctx.session.user.id
          }
        });
      }
    });
    
    // Emit analytics event
    await trackMetric('waste_logged', {
      venueId: input.venueId,
      category: item.category,
      reason: input.reason,
      value: wastedValue
    });
  });
```

### 4.3 Physical Count & Reconciliation

**Process:**
1. Manager initiates count session
2. Staff counts items (mobile-friendly UI)
3. System calculates variance (counted vs system)
4. Approve adjustments → updates stock levels

**Variance Detection:**
```typescript
function calculateVariance(systemQty: number, countedQty: number): {
  variance: number;
  variancePercent: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
} {
  const variance = countedQty - systemQty;
  const variancePercent = (Math.abs(variance) / systemQty) * 100;
  
  let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (variancePercent > 20) severity = 'HIGH';
  else if (variancePercent > 10) severity = 'MEDIUM';
  
  return { variance, variancePercent, severity };
}
```

---

## 5. Smart Par Level Calculation

### 5.1 Algorithm Overview

Par levels are dynamically calculated using:
1. **Historical Usage:** Average daily consumption over last 30/60/90 days
2. **Demand Forecast:** Predicted usage for next 7-14 days (from Scheduling Intelligence forecasting engine)
3. **Lead Time:** Supplier delivery time + safety buffer
4. **Seasonality:** Adjust for day-of-week, holiday, event patterns
5. **Waste Rate:** Factor in historical waste percentage

**Formula:**
```
Par Level = (Avg Daily Usage × Lead Time Days × Safety Factor) + Buffer Stock

Where:
  Avg Daily Usage = Historical usage adjusted for forecast
  Safety Factor = 1.2-1.5 (configurable by category)
  Buffer Stock = Statistical safety stock based on demand variability
```

### 5.2 Implementation

```typescript
// services/inventory/par-level-calculator.ts

interface ParLevelCalculation {
  parLevel: number;
  parLevelMin: number; // Reorder point
  parLevelMax: number; // Maximum capacity
  confidence: number; // 0-1 confidence score
  basis: {
    avgDailyUsage: number;
    forecastAdjustment: number;
    leadTimeDays: number;
    safetyFactor: number;
    bufferStock: number;
  };
}

export async function calculateParLevel(
  itemId: string,
  venueId: string
): Promise<ParLevelCalculation> {
  // 1. Get historical usage (last 90 days)
  const usage = await prisma.inventoryTransaction.aggregate({
    where: {
      itemId,
      venueId,
      type: 'SALE',
      createdAt: {
        gte: subDays(new Date(), 90)
      }
    },
    _sum: { quantity: true }
  });
  
  const totalUsage = Math.abs(usage._sum.quantity?.toNumber() || 0);
  const avgDailyUsage = totalUsage / 90;
  
  // 2. Get demand forecast (next 14 days)
  const forecast = await getDemandForecast(venueId, 14);
  const forecastMultiplier = forecast.avgMultiplier || 1.0;
  
  // 3. Adjust for forecast
  const adjustedDailyUsage = avgDailyUsage * forecastMultiplier;
  
  // 4. Get item metadata
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId }
  });
  
  if (!item) throw new Error('Item not found');
  
  // 5. Get safety factor by category
  const safetyFactors: Record<ItemCategory, number> = {
    PROTEIN: 1.3,
    PRODUCE: 1.5, // Higher due to spoilage risk
    DAIRY: 1.4,
    DRY_GOODS: 1.2,
    BEVERAGE_ALCOHOL: 1.2,
    BEVERAGE_NON_ALCOHOL: 1.3,
    PAPER_GOODS: 1.1,
    CLEANING: 1.1,
    SMALLWARES: 1.0,
    OTHER: 1.2
  };
  
  const safetyFactor = safetyFactors[item.category] || 1.2;
  
  // 6. Calculate buffer stock (statistical safety stock)
  const usageStdDev = await getUsageStandardDeviation(itemId, venueId, 90);
  const bufferStock = usageStdDev * Math.sqrt(item.leadTimeDays) * 1.65; // 95% service level
  
  // 7. Calculate par levels
  const parLevelMin = (adjustedDailyUsage * item.leadTimeDays * safetyFactor) + bufferStock;
  const parLevel = parLevelMin * 1.3; // Target is 30% above minimum
  const parLevelMax = parLevel * 1.5; // Max capacity
  
  // 8. Confidence score (based on data availability)
  const dataPoints = Math.min(90, totalUsage > 0 ? 90 : 0);
  const confidence = dataPoints / 90;
  
  return {
    parLevel: Math.ceil(parLevel),
    parLevelMin: Math.ceil(parLevelMin),
    parLevelMax: Math.ceil(parLevelMax),
    confidence,
    basis: {
      avgDailyUsage,
      forecastAdjustment: forecastMultiplier,
      leadTimeDays: item.leadTimeDays,
      safetyFactor,
      bufferStock
    }
  };
}

async function getUsageStandardDeviation(
  itemId: string,
  venueId: string,
  days: number
): Promise<number> {
  // Get daily usage for last N days
  const dailyUsage: number[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const usage = await prisma.inventoryTransaction.aggregate({
      where: {
        itemId,
        venueId,
        type: 'SALE',
        createdAt: { gte: dayStart, lte: dayEnd }
      },
      _sum: { quantity: true }
    });
    
    dailyUsage.push(Math.abs(usage._sum.quantity?.toNumber() || 0));
  }
  
  // Calculate standard deviation
  const mean = dailyUsage.reduce((a, b) => a + b, 0) / dailyUsage.length;
  const variance = dailyUsage.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyUsage.length;
  
  return Math.sqrt(variance);
}
```

### 5.3 Automated Par Level Updates

**Cron Job:** Daily at 3am
```typescript
// cron/update-par-levels.ts

export async function updateAllParLevels(): Promise<void> {
  const venues = await prisma.venue.findMany({ where: { isActive: true } });
  
  for (const venue of venues) {
    const items = await prisma.inventoryItem.findMany({
      where: { venueId: venue.id, isActive: true, isTracked: true }
    });
    
    for (const item of items) {
      try {
        const calc = await calculateParLevel(item.id, venue.id);
        
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: {
            parLevel: calc.parLevel,
            parLevelMin: calc.parLevelMin,
            parLevelMax: calc.parLevelMax
          }
        });
        
        logger.info('Par level updated', { itemId: item.id, calc });
      } catch (error) {
        logger.error('Failed to update par level', { itemId: item.id, error });
      }
    }
  }
}
```

---

## 6. Predictive Ordering Engine

### 6.1 Purchase Order Generation

**Trigger Conditions:**
1. **Scheduled:** Daily/weekly generation based on supplier delivery days
2. **Threshold:** Item falls below reorder point (parLevelMin)
3. **Manual:** Manager requests PO for specific items

**Algorithm:**
```typescript
// services/inventory/ordering-engine.ts

interface OrderSuggestion {
  supplierId: string;
  items: Array<{
    itemId: string;
    itemName: string;
    currentStock: number;
    parLevel: number;
    suggestedQuantity: number;
    packSize: number;
    packUnit: string;
    packQuantity: number; // Rounded to pack size
    unitCost: number;
    lineTotal: number;
  }>;
  subtotal: number;
  meetsMinimum: boolean;
}

export async function generateOrderSuggestions(
  venueId: string,
  supplierId?: string
): Promise<OrderSuggestion[]> {
  // Get items needing reorder
  const items = await prisma.inventoryItem.findMany({
    where: {
      venueId,
      isActive: true,
      isTracked: true,
      ...(supplierId && { supplierId })
    },
    include: {
      stockLevels: true,
      supplier: true
    }
  });
  
  // Group by supplier
  const ordersBySuppli er = new Map<string, OrderSuggestion>();
  
  for (const item of items) {
    if (!item.supplierId || !item.supplier) continue;
    
    const stockLevel = item.stockLevels[0];
    if (!stockLevel) continue;
    
    const currentStock = stockLevel.quantity.toNumber();
    const parLevel = item.parLevel?.toNumber() || 0;
    
    // Check if below reorder point
    if (currentStock >= (item.parLevelMin?.toNumber() || parLevel * 0.7)) {
      continue;
    }
    
    // Calculate order quantity (bring to par level)
    const suggestedQuantity = parLevel - currentStock;
    
    // Round to pack size
    const packSize = item.packSize?.toNumber() || 1;
    const packQuantity = Math.ceil(suggestedQuantity / packSize);
    const actualQuantity = packQuantity * packSize;
    
    const unitCost = item.unitCost.toNumber();
    const lineTotal = actualQuantity * unitCost;
    
    // Add to supplier's order
    if (!ordersBySuppli er.has(item.supplierId)) {
      ordersBySuppli er.set(item.supplierId, {
        supplierId: item.supplierId,
        items: [],
        subtotal: 0,
        meetsMinimum: false
      });
    }
    
    const order = ordersBySuppli er.get(item.supplierId)!;
    order.items.push({
      itemId: item.id,
      itemName: item.name,
      currentStock,
      parLevel,
      suggestedQuantity,
      packSize,
      packUnit: item.packUnit || item.unit,
      packQuantity,
      unitCost,
      lineTotal
    });
    order.subtotal += lineTotal;
  }
  
  // Check minimum order amounts
  for (const order of ordersBySuppli er.values()) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: order.supplierId }
    });
    
    const minOrderAmount = supplier?.minOrderAmount?.toNumber() || 0;
    order.meetsMinimum = order.subtotal >= minOrderAmount;
  }
  
  return Array.from(ordersBySuppli er.values());
}
```

### 6.2 Purchase Order Workflow

**States:** DRAFT → PENDING_APPROVAL → APPROVED → SENT → RECEIVED

```typescript
createPurchaseOrder: protectedProcedure
  .input(z.object({
    venueId: z.string(),
    supplierId: z.string(),
    items: z.array(z.object({
      itemId: z.string(),
      quantity: z.number().positive(),
      unit: z.nativeEnum(UnitOfMeasure),
      unitCost: z.number().positive()
    })),
    expectedDate: z.date().optional(),
    notes: z.string().optional()
  }))
  .mutation(async ({ input, ctx }) => {
    // Calculate totals
    const subtotal = input.items.reduce((sum, item) => 
      sum + (item.quantity * item.unitCost), 0
    );
    
    const tax = subtotal * 0.08; // 8% default, venue-configurable
    const total = subtotal + tax;
    
    // Generate PO number
    const poNumber = await generatePONumber(input.venueId);
    
    // Create PO
    const po = await prisma.purchaseOrder.create({
      data: {
        venueId: input.venueId,
        supplierId: input.supplierId,
        poNumber,
        status: 'DRAFT',
        subtotal,
        tax,
        total,
        expectedDate: input.expectedDate,
        createdBy: ctx.session.user.id,
        notes: input.notes,
        items: {
          create: input.items.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unit: item.unit,
            unitCost: item.unitCost,
            lineTotal: item.quantity * item.unitCost
          }))
        }
      },
      include: { items: true }
    });
    
    return po;
  });

receivePurchaseOrder: protectedProcedure
  .input(z.object({
    poId: z.string(),
    items: z.array(z.object({
      poItemId: z.string(),
      quantityReceived: z.number().positive(),
      unitCost: z.number().positive().optional() // If different from ordered
    }))
  }))
  .mutation(async ({ input, ctx }) => {
    await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: input.poId },
        include: { items: true }
      });
      
      if (!po) throw new Error('PO not found');
      
      for (const receivedItem of input.items) {
        const poItem = po.items.find(i => i.id === receivedItem.poItemId);
        if (!poItem) continue;
        
        // Update PO item
        await tx.purchaseOrderItem.update({
          where: { id: receivedItem.poItemId },
          data: {
            quantityReceived: receivedItem.quantityReceived,
            receivedBy: ctx.session.user.id,
            receivedAt: new Date()
          }
        });
        
        // Update stock level
        const stockLevel = await tx.stockLevel.findUnique({
          where: {
            venueId_itemId: {
              venueId: po.venueId,
              itemId: poItem.itemId
            }
          }
        });
        
        if (stockLevel) {
          const newQty = stockLevel.quantity.toNumber() + receivedItem.quantityReceived;
          
          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: {
              quantity: newQty,
              lastReceiveDate: new Date()
            }
          });
          
          // Log transaction
          await tx.inventoryTransaction.create({
            data: {
              venueId: po.venueId,
              itemId: poItem.itemId,
              type: 'RECEIVE',
              quantity: receivedItem.quantityReceived,
              unit: poItem.unit,
              quantityBefore: stockLevel.quantity.toNumber(),
              quantityAfter: newQty,
              purchaseOrderId: po.id,
              unitCost: receivedItem.unitCost || poItem.unitCost.toNumber(),
              totalCost: receivedItem.quantityReceived * (receivedItem.unitCost || poItem.unitCost.toNumber()),
              performedBy: ctx.session.user.id
            }
          });
        }
      }
      
      // Update PO status
      const allReceived = po.items.every(item => 
        input.items.some(r => r.poItemId === item.id)
      );
      
      await tx.purchaseOrder.update({
        where: { id: input.poId },
        data: {
          status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
          receivedDate: allReceived ? new Date() : undefined
        }
      });
    });
  });
```

---

## 7. Waste Analytics & Reporting

### 7.1 Waste Dashboard Metrics

**Key Metrics:**
1. **Total Waste Value:** $ lost per day/week/month
2. **Waste by Category:** Breakdown by protein, produce, etc.
3. **Waste by Reason:** Spoilage, over-prep, quality issues
4. **Waste Percentage:** Waste value / total inventory value
5. **Top Wasters:** Items with highest waste frequency/value
6. **Trend Analysis:** Week-over-week, month-over-month

**Query Example:**
```typescript
getWasteAnalytics: protectedProcedure
  .input(z.object({
    venueId: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    groupBy: z.enum(['day', 'week', 'month', 'category', 'reason', 'item'])
  }))
  .query(async ({ input }) => {
    const wasteLogs = await prisma.wasteLog.findMany({
      where: {
        venueId: input.venueId,
        createdAt: {
          gte: input.startDate,
          lte: input.endDate
        }
      },
      include: { item: true }
    });
    
    // Aggregate by groupBy parameter
    const aggregated = new Map<string, {
      totalValue: number;
      totalQuantity: number;
      count: number;
    }>();
    
    for (const log of wasteLogs) {
      let key: string;
      switch (input.groupBy) {
        case 'day':
          key = format(log.createdAt, 'yyyy-MM-dd');
          break;
        case 'week':
          key = format(startOfWeek(log.createdAt), 'yyyy-MM-dd');
          break;
        case 'month':
          key = format(log.createdAt, 'yyyy-MM');
          break;
        case 'category':
          key = log.item.category;
          break;
        case 'reason':
          key = log.reason;
          break;
        case 'item':
          key = log.item.name;
          break;
      }
      
      const current = aggregated.get(key) || { totalValue: 0, totalQuantity: 0, count: 0 };
      current.totalValue += log.wastedValue.toNumber();
      current.totalQuantity += log.quantity.toNumber();
      current.count++;
      aggregated.set(key, current);
    }
    
    return {
      summary: {
        totalWasteValue: wasteLogs.reduce((sum, log) => sum + log.wastedValue.toNumber(), 0),
        totalCount: wasteLogs.length,
        avgWastePerDay: wasteLogs.length / differenceInDays(input.endDate, input.startDate)
      },
      breakdown: Array.from(aggregated.entries()).map(([key, value]) => ({
        key,
        ...value
      })).sort((a, b) => b.totalValue - a.totalValue)
    };
  });
```

### 7.2 Cost of Goods Sold (COGS) Tracking

**Formula:**
```
COGS = Beginning Inventory + Purchases - Ending Inventory - Waste

COGS % = (COGS / Total Sales) × 100
```

**Theoretical vs Actual Usage:**
```typescript
interface UsageVariance {
  itemId: string;
  itemName: string;
  theoreticalUsage: number; // Based on recipes × sales
  actualUsage: number; // Based on inventory deductions
  variance: number;
  variancePercent: number;
  possibleCauses: string[];
}

export async function calculateUsageVariance(
  venueId: string,
  startDate: Date,
  endDate: Date
): Promise<UsageVariance[]> {
  // Get all sales in period
  const orders = await prisma.order.findMany({
    where: {
      venueId,
      status: 'COMPLETED',
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      items: {
        include: {
          menuItem: {
            include: { recipeItems: true }
          }
        }
      }
    }
  });
  
  // Calculate theoretical usage (recipes × qty sold)
  const theoreticalUsage = new Map<string, number>();
  
  for (const order of orders) {
    for (const orderItem of order.items) {
      for (const recipeItem of orderItem.menuItem.recipeItems) {
        const currentUsage = theoreticalUsage.get(recipeItem.inventoryItemId) || 0;
        theoreticalUsage.set(
          recipeItem.inventoryItemId,
          currentUsage + (recipeItem.quantity.toNumber() * orderItem.quantity)
        );
      }
    }
  }
  
  // Get actual usage (transactions)
  const results: UsageVariance[] = [];
  
  for (const [itemId, theoretical] of theoreticalUsage.entries()) {
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        venueId,
        itemId,
        type: { in: ['SALE', 'WASTE', 'PREP'] },
        createdAt: { gte: startDate, lte: endDate }
      }
    });
    
    const actualUsage = Math.abs(
      transactions.reduce((sum, t) => sum + t.quantity.toNumber(), 0)
    );
    
    const variance = actualUsage - theoretical;
    const variancePercent = (variance / theoretical) * 100;
    
    // Determine possible causes
    const possibleCauses: string[] = [];
    if (variancePercent > 10) {
      possibleCauses.push('Over-portioning');
      possibleCauses.push('Waste not logged');
      possibleCauses.push('Recipe inaccurate');
    }
    if (variancePercent < -10) {
      possibleCauses.push('Under-portioning');
      possibleCauses.push('Theft/loss');
      possibleCauses.push('Count error');
    }
    
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    
    results.push({
      itemId,
      itemName: item?.name || 'Unknown',
      theoreticalUsage: theoretical,
      actualUsage,
      variance,
      variancePercent,
      possibleCauses
    });
  }
  
  return results.sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));
}
```

---

## 8. User Interface Flows

### 8.1 Inventory Dashboard

**Route:** `/dashboard/inventory`

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│  Inventory Overview                         [+ Add Item]      │
├──────────────────────────────────────────────────────────────┤
│  Summary Cards:                                               │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │ Total Value   │ │ Low Stock     │ │ Waste (MTD)   │     │
│  │ $42,350       │ │ 12 items      │ │ $1,250        │     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
├──────────────────────────────────────────────────────────────┤
│  Quick Actions:                                               │
│  [Log Waste] [Physical Count] [Create PO] [Receive Order]   │
├──────────────────────────────────────────────────────────────┤
│  Items Table:                                                 │
│  Name          | Category  | Stock | Par  | Status | Actions│
│  Ground Beef   | Protein   | 25 lb | 40   | 🟡 Low  | ⋮     │
│  Tomatoes      | Produce   | 15 lb | 20   | 🟡 Low  | ⋮     │
│  Cheddar       | Dairy     | 8 lb  | 10   | 🟢 OK   | ⋮     │
│  ...                                                          │
└──────────────────────────────────────────────────────────────┘
```

**Stock Status Indicators:**
- 🟢 OK: >= parLevel
- 🟡 Low: < parLevel but >= parLevelMin
- 🔴 Critical: < parLevelMin
- ⚫ Out: = 0

### 8.2 Waste Logging Flow

**Modal/Page:** Quick capture form

```typescript
interface WasteLogForm {
  item: InventoryItem;           // Autocomplete search
  quantity: number;
  unit: UnitOfMeasure;
  reason: WasteReason;           // Dropdown
  notes?: string;
  photo?: File;                  // Optional camera capture
}
```

**Steps:**
1. Click "Log Waste" button
2. Search/select item (autocomplete with fuzzy search)
3. Enter quantity (numeric input with unit selector)
4. Select reason from dropdown
5. Optional: add notes, take photo
6. Submit → toast confirmation, stock updated

**Photo Upload:**
- Mobile: Native camera capture
- Desktop: File upload or webcam
- Stored in S3/Cloudinary, URL saved to `WasteLog.photoUrl`

### 8.3 Purchase Order Creation

**Multi-Step Wizard:**

**Step 1: Select Supplier**
- Dropdown of active suppliers
- Shows delivery days, lead time, minimum order
- Button: "Auto-Generate Suggestions" → runs ordering engine

**Step 2: Add Items**
- Table with suggested items (if auto-generated)
- Manual add: search item, enter quantity
- Shows: current stock, par level, suggested qty, pack size, cost
- Real-time subtotal calculation

**Step 3: Review & Submit**
- Summary table with line items
- Subtotal, tax, shipping, total
- Expected delivery date picker
- Notes field
- Actions: "Save as Draft" | "Submit for Approval" | "Send to Supplier"

**Status Badges:**
- Draft (gray) → Pending Approval (yellow) → Approved (blue) → Sent (purple) → Received (green)

### 8.4 Receiving Workflow

**Page:** `/inventory/purchase-orders/[id]/receive`

```
┌──────────────────────────────────────────────────────────────┐
│  Receive Purchase Order #PO-2025-001                         │
│  Supplier: Sysco  |  Expected: Nov 26  |  Sent: Nov 24      │
├──────────────────────────────────────────────────────────────┤
│  Items:                                                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Ground Beef (80/20)                                    │ │
│  │ Ordered: 40 lb  |  Cost: $4.50/lb  |  Total: $180     │ │
│  │ Received: [___] lb  (✓ Full  ⚠ Partial  ✗ Missing)    │ │
│  │ Actual Cost: [_____] (if different)                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Tomatoes (Roma)                                        │ │
│  │ Ordered: 20 lb  |  Cost: $2.00/lb  |  Total: $40      │ │
│  │ Received: [___] lb  (✓ Full  ⚠ Partial  ✗ Missing)    │ │
│  │ Actual Cost: [_____] (if different)                    │ │
│  └────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  [Complete Receipt] [Save Progress]                         │
└──────────────────────────────────────────────────────────────┘
```

**Validation:**
- Flags items with >10% variance (received vs ordered)
- Optional: photo of packing slip
- Updates stock levels in real-time

---

## 9. External Integrations

### 9.1 Demand Forecasting Integration

**Source:** Staff Scheduling Intelligence forecasting engine (Section 3 of spec #6)

**API Contract:**
```typescript
interface DemandForecastRequest {
  venueId: string;
  startDate: Date;
  days: number; // Forecast horizon (7-30 days)
}

interface DemandForecastResponse {
  avgMultiplier: number; // Overall forecast vs baseline (e.g., 1.15 = 15% increase)
  daily: Array<{
    date: Date;
    expectedCovers: number;
    multiplier: number; // vs baseline
  }>;
}

export async function getDemandForecast(
  venueId: string,
  days: number
): Promise<DemandForecastResponse> {
  // Call scheduling intelligence forecasting service
  const forecast = await fetch(`/api/scheduling/forecast`, {
    method: 'POST',
    body: JSON.stringify({ venueId, startDate: new Date(), days })
  });
  
  const data = await forecast.json();
  
  // Calculate average multiplier
  const avgMultiplier = data.daily.reduce((sum: number, d: any) => 
    sum + d.multiplier, 0) / data.daily.length;
  
  return {
    avgMultiplier,
    daily: data.daily
  };
}
```

**Usage in Inventory:**
- Par level calculation (adjust for forecasted demand)
- Purchase order timing (increase orders before busy period)
- Waste prediction (alert on over-ordering before slow period)

### 9.2 Supplier Integration

**Electronic Ordering:**

**Option A: Email-based**
- Generate PDF PO
- Email to supplier via `nodemailer`
- Subject: "PO #PO-2025-001 - [Venue Name]"
- Attachment: PDF with line items

**Option B: API Integration**
- Sysco, US Foods, etc. may have APIs
- POST `/supplier-api/orders` with JSON payload
- Receive order confirmation webhook

**Invoice Reconciliation:**
- Upload supplier invoice (PDF/image)
- OCR extract line items (AWS Textract, Google Vision)
- Match to PO items
- Flag variances (price, quantity differences)

### 9.3 Accounting System Integration

**Export to QuickBooks/Xero:**

```typescript
interface COGSExport {
  date: Date;
  category: string;
  description: string;
  amount: number;
  accountCode: string; // e.g., "5000" for COGS
}

export async function exportCOGSToAccounting(
  venueId: string,
  startDate: Date,
  endDate: Date
): Promise<COGSExport[]> {
  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      venueId,
      type: { in: ['SALE', 'WASTE'] },
      createdAt: { gte: startDate, lte: endDate }
    },
    include: { item: true }
  });
  
  const exports: COGSExport[] = transactions.map(t => ({
    date: t.createdAt,
    category: t.item.category,
    description: `${t.type} - ${t.item.name}`,
    amount: t.totalCost?.toNumber() || 0,
    accountCode: t.type === 'WASTE' ? '6100' : '5000' // Waste vs COGS
  }));
  
  // Send to QuickBooks API
  await fetch('https://quickbooks.api.intuit.com/v3/company/123/journalentry', {
    method: 'POST',
    headers: { Authorization: `Bearer ${qbToken}` },
    body: JSON.stringify({ entries: exports })
  });
  
  return exports;
}
```

---

## 10. Non-Functional Requirements & Implementation

### 10.1 Performance

| Metric | Target |
|--------|--------|
| Stock level update (on sale) | < 2 seconds |
| Par level calculation (single item) | < 500ms |
| Par level batch update (all items) | < 5 minutes |
| Dashboard load time | < 1 second |
| PO generation (50 items) | < 3 seconds |
| Waste analytics query | < 2 seconds |

**Optimization Strategies:**
- **Caching:** Redis cache for current stock levels (invalidate on transaction)
- **Batch Processing:** Use BullMQ for par level updates, forecast sync
- **Database Indexing:** Composite indexes on `venueId + itemId + createdAt`
- **Read Replicas:** Analytics queries hit read replica

### 10.2 Data Retention

- **Transactions:** Keep 3 years, then archive to S3 (Parquet format)
- **Waste Logs:** Keep 2 years (regulatory compliance)
- **Purchase Orders:** Keep 7 years (tax/audit requirements)
- **Stock Levels:** Current snapshot only (history in transactions)

### 10.3 Security & Permissions

**Roles:**
- **Admin:** Full access (create items, suppliers, POs, see all reports)
- **Manager:** Create POs, log waste, physical counts, reports
- **Kitchen Staff:** Log waste only
- **Viewer:** Read-only dashboard access

**Row-Level Security:**
```typescript
// Prisma middleware to enforce venueId filtering
prisma.$use(async (params, next) => {
  if (params.model === 'InventoryItem' && params.action === 'findMany') {
    params.args.where = {
      ...params.args.where,
      venueId: ctx.session.user.venueId // From JWT
    };
  }
  return next(params);
});
```

### 10.4 Implementation Roadmap

**Phase 1: Foundation (Sprint 1-2, 2 weeks)**
- [ ] Database schema (Prisma models)
- [ ] Core CRUD APIs (items, stock levels, transactions)
- [ ] Basic UI (inventory list, add item)
- [ ] Automatic deduction on sale

**Phase 2: Waste Tracking (Sprint 3, 1 week)**
- [ ] Waste log API + UI
- [ ] Photo upload (S3)
- [ ] Waste dashboard (charts, metrics)

**Phase 3: Smart Par Levels (Sprint 4-5, 2 weeks)**
- [ ] Par level calculator
- [ ] Demand forecast integration
- [ ] Automated daily updates (cron)
- [ ] Low stock alerts (Email/SMS)

**Phase 4: Purchasing (Sprint 6-7, 2 weeks)**
- [ ] Supplier management
- [ ] Purchase order creation (manual + auto-suggest)
- [ ] PO approval workflow
- [ ] Receiving UI
- [ ] Email PO to suppliers

**Phase 5: Analytics (Sprint 8, 1 week)**
- [ ] COGS tracking
- [ ] Theoretical vs actual usage
- [ ] Variance reports
- [ ] Export to accounting (QuickBooks/Xero)

**Phase 6: Advanced Features (Sprint 9-10, 2 weeks)**
- [ ] Recipe costing
- [ ] Multi-location inventory transfers
- [ ] Supplier invoice reconciliation (OCR)
- [ ] Predictive waste alerts

**Total Estimated Timeline:** 10 sprints (20 weeks)

### 10.5 Testing Strategy

**Unit Tests:**
- Par level calculation algorithm
- Deduction logic (recipe qty × order qty)
- Variance detection
- PO total calculations

**Integration Tests:**
- End-to-end sale → deduction → low stock alert
- PO creation → approval → receiving → stock update
- Waste log → transaction → analytics

**Load Tests:**
- 1000 concurrent stock updates (simulate busy dinner rush)
- Batch par level calculation (500 items)

**User Acceptance Tests:**
- Manager creates PO from suggestions
- Kitchen staff logs waste with photo
- Physical count reconciliation flow

---

## 11. Success Metrics

**3-Month Post-Launch KPIs:**

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Food Waste % | 8-12% | < 6% | Waste value / COGS |
| Stockout Rate | 5-8% | < 2% | Items out of stock per week |
| Inventory Turnover | 4x/year | 6x/year | COGS / Avg Inventory Value |
| Time on Ordering | 8-10 hrs/wk | 2-3 hrs/wk | User survey + time tracking |
| COGS % | 32-35% | 28-30% | COGS / Total Revenue |
| Order Accuracy | 75% | 95% | Orders received vs ordered |

**Adoption Metrics:**
- 90% of venues log waste daily
- 80% use auto-generated PO suggestions
- 95% of items have accurate par levels

---

## 12. Future Enhancements

### 12.1 AI-Powered Recommendations

- **Waste Prediction:** "Tomatoes have 20% waste rate on Mondays. Consider reducing prep by 2 lbs."
- **Menu Engineering:** "Margherita Pizza has 12% COGS. Consider price increase to $14.99."
- **Seasonality:** "Demand for salads increases 30% in summer. Adjust par levels in May."

### 12.2 Advanced Supplier Management

- **Price Comparison:** Compare quotes from multiple suppliers
- **Vendor Scorecards:** Rate suppliers on quality, timeliness, pricing
- **Contract Management:** Track price locks, minimum commitments

### 12.3 Mobile-First Enhancements

- **Barcode Scanning:** Scan items during receiving or counting
- **Voice Input:** "Log 2 pounds of ground beef as waste due to spoilage"
- **Offline Mode:** Log waste/counts without internet, sync later

---

**END OF SPECIFICATION**

---

## Appendix A: Sample Queries

### A.1 Get Low Stock Items

```sql
SELECT 
  ii.name,
  ii.category,
  sl.quantity AS current_stock,
  ii.parLevelMin AS reorder_point,
  (ii.parLevelMin - sl.quantity) AS shortage,
  s.name AS supplier_name,
  s.leadTimeDays
FROM "InventoryItem" ii
JOIN "StockLevel" sl ON ii.id = sl.itemId
LEFT JOIN "Supplier" s ON ii.supplierId = s.id
WHERE ii.venueId = $1
  AND sl.quantity < ii.parLevelMin
  AND ii.isActive = true
ORDER BY (ii.parLevelMin - sl.quantity) DESC;
```

### A.2 Waste Summary by Category (Last 30 Days)

```sql
SELECT 
  ii.category,
  COUNT(*) AS waste_count,
  SUM(wl.quantity) AS total_quantity,
  SUM(wl.wastedValue) AS total_value,
  AVG(wl.wastedValue) AS avg_value_per_incident
FROM "WasteLog" wl
JOIN "InventoryItem" ii ON wl.itemId = ii.id
WHERE wl.venueId = $1
  AND wl.createdAt >= NOW() - INTERVAL '30 days'
GROUP BY ii.category
ORDER BY total_value DESC;
```

### A.3 COGS by Day

```sql
SELECT 
  DATE(it.createdAt) AS date,
  SUM(it.totalCost) AS daily_cogs
FROM "InventoryTransaction" it
WHERE it.venueId = $1
  AND it.type IN ('SALE', 'WASTE')
  AND it.createdAt >= $2
  AND it.createdAt <= $3
GROUP BY DATE(it.createdAt)
ORDER BY date;
```

---

**Document Status:** ✅ Complete  
**Next Steps:** Review with product/engineering teams → Begin Phase 1 implementation  
**Questions/Feedback:** Contact Crowdiant Platform Team
