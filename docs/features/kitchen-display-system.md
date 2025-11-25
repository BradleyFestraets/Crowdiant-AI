# Kitchen Display System (KDS) - Feature Deep Dive

## Executive Summary

**Feature Name:** Kitchen Display System (KDS)  
**Category:** Operations & Real-Time Communication  
**Priority:** P0 - Critical (Sprint 7)  
**Complexity:** High (real-time Socket.io, multi-station support, timing algorithms)  
**Primary Value:** Replace paper tickets with digital workflow, reduce errors, improve speed

### The Core Problem

**Traditional kitchen ticket systems have fundamental flaws:**

**Paper Ticket Problems:**
- Tickets print, get lost, or become unreadable (grease, heat, water)
- No real-time updates if order changes (customer adds/removes items)
- Can't prioritize dynamically (VIP orders, late orders, takeout pickups)
- Special instructions buried in small print
- No performance analytics (how long did that burger take?)
- Kitchen can't communicate back to servers easily

**Manual Whiteboard Systems:**
- Require constant erasing/updating
- Difficult to track timing
- Hard to enforce consistency across shifts
- No data capture for analytics

**Industry Impact:**
- 15-20% of orders have timing issues (late, wrong sequence)
- 8-12% of orders have prep errors (missing items, allergies missed)
- Kitchen chaos during rush = stressed staff, slower service

### The Solution

Crowdiant's Kitchen Display System uses:
1. **Real-time order routing** (Socket.io pushes orders to kitchen instantly)
2. **Visual queue management** (color-coded by urgency, FIFO display)
3. **Station filtering** (grill sees grill items, fryer sees fryer items)
4. **Allergy highlighting** (red banners for allergies, impossible to miss)
5. **Timing intelligence** (auto-calculated prep times, late order alerts)
6. **Bump system** (tap to advance status, bump to complete)
7. **Kitchen-to-server communication** (flag issues, request runners)

**Result:** 25% faster ticket times, 50% fewer errors, full analytics

---

## Part 1: The Kitchen Workflow Problem

### Before KDS: Paper Ticket Chaos

**Typical rush hour scenario (paper tickets):**

1. **Order placed** → Ticket prints at expo station
2. **Expo reads ticket** → Calls out "Burger, medium rare, no onions!"
3. **Grill cook responds** → "Heard!"
4. **5 minutes later** → Expo: "Where's that burger?"
5. **Grill cook** → "Which one? I have 3 burgers going!"
6. **Expo** → *looks at crumpled ticket* "Table 7!"
7. **Grill cook** → "Oh, that one's medium well..."
8. **Result:** Remake burger, table waits 15 more minutes

**Key failures:**
- No visual queue (cook doesn't know order sequence)
- Verbal communication fails during noise/chaos
- Modifications not communicated (ticket already printed)
- Can't track timing (when did order arrive?)

### After KDS: Digital Workflow

**Same scenario with KDS:**

1. **Order placed** → Appears on grill station display instantly
2. **Grill cook sees** → "Burger, MR, no onions, Table 7" (with elapsed timer: 0:12)
3. **Cook taps card** → Status: Preparing (yellow)
4. **5 minutes later** → Timer shows 5:30, still yellow (target: 8 min)
5. **7 minutes later** → Cook taps "Ready" → Server notified via Socket.io
6. **Result:** Burger cooked correctly, served in 8 minutes

**Key improvements:**
- Visual queue with timers
- Clear instructions per station
- Real-time status updates
- Automatic notifications

---

## Part 2: Real-Time Order Routing

### Socket.io Architecture

**Order flow from POS to Kitchen:**

```
Customer Orders via App/POS
    ↓
tRPC mutation: order.create
    ↓
PostgreSQL: Insert order + items
    ↓
Socket.io emit: kitchen:new-order
    ↓
Kitchen Displays subscribe: venue:${venueId}:kitchen
    ↓
Order card appears instantly on all subscribed displays
```

### Event-Driven Order Management

```typescript
// When order is created
async function createOrder(input: CreateOrderInput) {
  const order = await db.order.create({
    data: {
      venueId: input.venueId,
      tabId: input.tabId,
      items: {
        create: input.items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
          stationId: item.stationId, // grill, fryer, expo, bar
        })),
      },
    },
  });
  
  // Emit to kitchen displays
  io.to(`venue:${input.venueId}:kitchen`).emit('kitchen:new-order', {
    orderId: order.id,
    orderNumber: order.displayNumber,
    tableName: order.tab.tableName,
    customerName: order.tab.customer?.name,
    items: order.items,
    createdAt: order.createdAt,
    orderType: order.tab.orderType, // dine-in, takeout, delivery
  });
  
  return order;
}

// Kitchen display subscribes
socket.on('kitchen:new-order', (data) => {
  // Add order card to queue
  addOrderToQueue(data);
  
  // Play notification sound
  playNewOrderSound();
  
  // Show desktop notification (if permission granted)
  showNotification(`New Order #${data.orderNumber}`);
});
```

### Multi-Station Routing

**Orders automatically routed to correct stations:**

```typescript
interface KitchenStation {
  id: string;
  name: string;
  type: 'GRILL' | 'FRYER' | 'EXPO' | 'SALAD' | 'BAR' | 'DESSERT';
  displayId: string; // Which tablet/screen
}

// Menu items have station assignments
interface MenuItem {
  id: string;
  name: string;
  stationId: string;
  prepTimeMinutes: number;
}

// Example: Burger goes to grill, fries go to fryer
const order = {
  items: [
    { name: 'Burger', stationId: 'grill-1', prepTime: 8 },
    { name: 'Fries', stationId: 'fryer-1', prepTime: 5 },
    { name: 'Salad', stationId: 'salad-1', prepTime: 3 },
  ],
};

// Order appears on 3 different displays simultaneously
io.to(`venue:${venueId}:station:grill-1`).emit('kitchen:new-order', grillItems);
io.to(`venue:${venueId}:station:fryer-1`).emit('kitchen:new-order', fryerItems);
io.to(`venue:${venueId}:station:salad-1`).emit('kitchen:new-order', saladItems);
```

---

## Part 3: Kitchen Display Layout

### Full-Screen Queue View

**Optimized for glanceable viewing from 10 feet away:**

```
┌──────────────────────────────────────────────────────────────────┐
│ KITCHEN DISPLAY - GRILL STATION              12:34 PM            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│ │ #102 Table 5    │  │ #103 Sarah J.   │  │ #104 Table 12   │  │
│ │ ⏱️ 3:45 🟡       │  │ ⏱️ 8:12 🔴       │  │ ⏱️ 1:20 🟢       │  │
│ │                 │  │                 │  │                 │  │
│ │ • Burger MR     │  │ • Steak MW ⚠️    │  │ • Chicken Breast│  │
│ │   NO ONIONS     │  │   GLUTEN ALLERGY│  │ • Pork Chop     │  │
│ │ • Burger W      │  │ • Salmon        │  │                 │  │
│ │                 │  │   Extra lemon   │  │ 🍽️ Dine-In      │  │
│ │ 🍽️ Dine-In      │  │ 🥡 Takeout      │  │                 │  │
│ │                 │  │                 │  │ [PREPARING]     │  │
│ │ [TAP TO START]  │  │ [PREPARING]     │  │                 │  │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                   │
│ ┌─────────────────┐  ┌─────────────────┐                       │
│ │ #105 Table 8    │  │ #106 John D.    │                       │
│ │ ⏱️ 0:22 🟢       │  │ ⏱️ 12:04 🔴      │                       │
│ │                 │  │                 │                       │
│ │ • Burger MR     │  │ • Ribeye R ⚠️    │                       │
│ │   Add bacon     │  │   NUT ALLERGY   │                       │
│ │                 │  │   NO BUTTER     │                       │
│ │ 🍽️ Dine-In      │  │ 🍽️ Dine-In      │                       │
│ │                 │  │                 │                       │
│ │ [RECEIVED]      │  │ [LATE! 🚨]      │                       │
│ └─────────────────┘  └─────────────────┘                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Order Card Design

**Each card shows:**

```typescript
interface OrderCard {
  // Header
  orderNumber: string;        // #102
  tableName: string;          // "Table 5" or "Sarah J."
  elapsedTime: string;        // "3:45"
  urgencyColor: 'green' | 'yellow' | 'red';
  
  // Items
  items: Array<{
    name: string;
    quantity: number;
    modifiers: string[];      // "NO ONIONS", "Extra cheese"
    specialInstructions: string;
    hasAllergy: boolean;      // Red banner if true
    allergyType?: string;     // "GLUTEN ALLERGY"
    prepTimeMinutes: number;
  }>;
  
  // Footer
  orderType: 'dine-in' | 'takeout' | 'delivery';
  orderTypeIcon: string;      // 🍽️ 🥡 🚗
  status: 'RECEIVED' | 'PREPARING' | 'READY';
  statusLabel: string;        // "[TAP TO START]"
  isLate: boolean;            // Show 🚨 if true
}
```

### Color-Coded Urgency

**Automatic color changes based on elapsed time:**

```typescript
function getUrgencyColor(
  elapsedMinutes: number,
  targetPrepTime: number
): 'green' | 'yellow' | 'red' {
  const percentComplete = (elapsedMinutes / targetPrepTime) * 100;
  
  if (percentComplete < 60) {
    return 'green';   // 0-6 min of 10 min target
  } else if (percentComplete < 90) {
    return 'yellow';  // 6-9 min of 10 min target
  } else {
    return 'red';     // 9+ min of 10 min target
  }
}

// Visual styling
const urgencyStyles = {
  green: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  yellow: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  red: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    animation: 'pulse', // Pulsing red for extra urgency
  },
};
```

---

## Part 4: Bump System (Order Status Management)

### Three-Stage Status Flow

**Order lifecycle in kitchen:**

```
RECEIVED (white/gray)
    ↓ (cook taps card)
PREPARING (yellow)
    ↓ (cook taps "Ready")
READY (green)
    ↓ (expo taps "Bump" or "Delivered")
BUMPED (removed from display, archived)
```

### Tap-to-Advance Interaction

```typescript
async function advanceOrderStatus(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  
  let newStatus: OrderStatus;
  
  switch (order.status) {
    case OrderStatus.RECEIVED:
      newStatus = OrderStatus.PREPARING;
      break;
    
    case OrderStatus.PREPARING:
      newStatus = OrderStatus.READY;
      // Notify server via Socket.io
      io.to(`venue:${order.venueId}:servers`).emit('order:ready', {
        orderId: order.id,
        orderNumber: order.displayNumber,
        tableName: order.tab.tableName,
      });
      break;
    
    case OrderStatus.READY:
      // Ready to bump (requires confirmation)
      return; // Handle in separate bumpOrder function
  }
  
  // Update status
  await updateOrderStatus(orderId, newStatus);
  
  // Emit status change
  io.to(`venue:${order.venueId}:kitchen`).emit('order:status-changed', {
    orderId,
    status: newStatus,
    updatedAt: new Date(),
  });
}
```

### Bump Confirmation

**Prevent accidental bumps:**

```typescript
// UI component
function BumpButton({ orderId }: { orderId: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  
  const handleBump = () => {
    setShowConfirm(true);
  };
  
  const handleConfirm = async () => {
    await bumpOrder(orderId);
    setShowConfirm(false);
  };
  
  return (
    <>
      <button onClick={handleBump}>
        BUMP ORDER
      </button>
      
      {showConfirm && (
        <ConfirmDialog
          title="Bump Order #102?"
          message="This will remove the order from the display."
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

// API handler
async function bumpOrder(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  
  // Update status to BUMPED
  await updateOrder(orderId, {
    status: OrderStatus.BUMPED,
    bumpedAt: new Date(),
  });
  
  // Remove from kitchen displays
  io.to(`venue:${order.venueId}:kitchen`).emit('order:bumped', {
    orderId,
  });
  
  // Archive for analytics (not deleted)
  await archiveOrder(orderId);
}
```

### Individual Item Tracking

**Mark items ready separately for complex orders:**

```typescript
interface OrderItem {
  id: string;
  name: string;
  status: 'PENDING' | 'PREPARING' | 'READY';
  readyAt?: Date;
}

// Example: Steak and salmon on same ticket
const order = {
  items: [
    { name: 'Steak MW', status: 'PREPARING' }, // Still cooking
    { name: 'Salmon', status: 'READY' },       // Done
  ],
};

// Visual indicator
<OrderCard>
  <Item status="preparing">Steak MW ⏳</Item>
  <Item status="ready">Salmon ✅</Item>
</OrderCard>

// Order not fully ready until all items marked
const canBump = order.items.every(i => i.status === 'READY');
```

---

## Part 5: Allergy & Special Instruction Highlighting

### High-Visibility Allergy Banners

**Impossible to miss:**

```
┌─────────────────────────┐
│ #103 Sarah J.           │
│ ⏱️ 8:12 🔴              │
│                         │
│ ┌─────────────────────┐ │
│ │ ⚠️ GLUTEN ALLERGY ⚠️ │ │ <- Red banner, bold, large text
│ └─────────────────────┘ │
│                         │
│ • Steak MW              │
│   NO BUTTER (contains  │
│   wheat in seasoning)   │
│ • Salmon GF             │
│                         │
│ 🥡 Takeout              │
│ [PREPARING]             │
└─────────────────────────┘
```

### Allergy Detection Logic

```typescript
// Menu items have allergen tags
interface MenuItem {
  id: string;
  name: string;
  allergens: Array<'GLUTEN' | 'DAIRY' | 'NUTS' | 'SHELLFISH' | 'SOY' | 'EGGS'>;
}

// Customer profiles store allergies
interface Customer {
  id: string;
  allergyNotes?: string; // "Severe gluten allergy"
  allergens: string[];   // ['GLUTEN', 'DAIRY']
}

// Order creation checks for conflicts
async function createOrder(input: CreateOrderInput) {
  const customer = await getCustomer(input.customerId);
  
  if (customer.allergens.length > 0) {
    const items = await getMenuItems(input.items.map(i => i.menuItemId));
    
    // Flag any items with conflicting allergens
    const conflicts = items.filter(item =>
      item.allergens.some(a => customer.allergens.includes(a))
    );
    
    if (conflicts.length > 0) {
      // Highlight in kitchen display
      await flagAllergyConflict(orderId, conflicts, customer.allergens);
      
      // Notify server for verification
      await notifyServer({
        type: 'ALLERGY_CONFLICT',
        orderId,
        items: conflicts.map(c => c.name),
        allergens: customer.allergens,
      });
    }
  }
}
```

### Special Instruction Formatting

**Large, clear text for modifications:**

```typescript
function formatSpecialInstructions(
  instructions: string,
  hasAllergy: boolean
): JSX.Element {
  // Break into bullet points
  const lines = instructions.split('\n').filter(Boolean);
  
  return (
    <div className={cn(
      "text-lg font-semibold",
      hasAllergy ? "text-red-600" : "text-gray-700"
    )}>
      {lines.map((line, i) => (
        <div key={i} className="flex items-center gap-2">
          {hasAllergy && <AlertTriangle className="w-5 h-5" />}
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## Part 6: Station-Based Filtering

### Multi-Station Configuration

**Each display shows only relevant items:**

```typescript
interface VenueKitchenLayout {
  stations: Array<{
    id: string;
    name: string;
    type: 'GRILL' | 'FRYER' | 'EXPO' | 'SALAD' | 'BAR' | 'DESSERT';
    displayDevice: string; // Tablet ID or IP address
    menuCategories: string[]; // Which menu categories this station handles
  }>;
}

// Example: Sports bar with 3 stations
const layout: VenueKitchenLayout = {
  stations: [
    {
      id: 'grill-1',
      name: 'Grill Station',
      type: 'GRILL',
      displayDevice: 'ipad-kitchen-1',
      menuCategories: ['Burgers', 'Steaks', 'Chicken'],
    },
    {
      id: 'fryer-1',
      name: 'Fryer Station',
      type: 'FRYER',
      displayDevice: 'ipad-kitchen-2',
      menuCategories: ['Appetizers', 'Sides'],
    },
    {
      id: 'expo-1',
      name: 'Expo Station',
      type: 'EXPO',
      displayDevice: 'monitor-kitchen-expo',
      menuCategories: ['*'], // Sees all orders for coordination
    },
  ],
};

// When order arrives, route to correct station(s)
async function routeOrderToStations(order: Order) {
  const stations = await getVenueStations(order.venueId);
  
  for (const station of stations) {
    // Filter items relevant to this station
    const stationItems = order.items.filter(item =>
      station.menuCategories.includes(item.menuItem.category) ||
      station.menuCategories.includes('*') // Expo sees everything
    );
    
    if (stationItems.length > 0) {
      io.to(`venue:${order.venueId}:station:${station.id}`).emit('kitchen:new-order', {
        ...order,
        items: stationItems, // Only items for this station
      });
    }
  }
}
```

### Station Toggle for Multi-Role Staff

**Staff can switch stations on same device:**

```
┌──────────────────────────────────────┐
│ Station: [GRILL ▼]     12:34 PM      │ <- Dropdown to switch
├──────────────────────────────────────┤
│ Showing: Grill items only            │
│                                      │
│ [Show All Stations] (Expo view)      │
└──────────────────────────────────────┘
```

---

## Part 7: Timing Intelligence & Late Order Alerts

### Automatic Prep Time Calculation

**System learns from historical data:**

```typescript
interface MenuItemPrepTime {
  menuItemId: string;
  baselinePrepMinutes: number;   // Set by venue manager
  actualAvgPrepMinutes: number;  // Learned from historical data
  p50PrepMinutes: number;        // Median prep time
  p90PrepMinutes: number;        // 90th percentile (late orders)
  
  // Contextual factors
  prepTimeByHour: Record<string, number>; // Slower during rush
  prepTimeByDay: Record<string, number>;  // Slower on weekends
  prepTimeByStation: Record<string, number>; // Some cooks faster
}

// Calculate expected completion time
async function calculateExpectedCompletion(
  orderId: string
): Promise<Date> {
  const order = await getOrder(orderId);
  const now = new Date();
  
  // Get prep times for all items
  const itemPrepTimes = await Promise.all(
    order.items.map(async (item) => {
      const stats = await getMenuItemStats(item.menuItemId);
      
      // Use contextual prep time based on current conditions
      const hour = now.getHours();
      const dayOfWeek = now.getDay();
      
      return stats.prepTimeByHour[hour] || stats.actualAvgPrepMinutes;
    })
  );
  
  // Longest item determines completion time (parallel prep assumed)
  const maxPrepTime = Math.max(...itemPrepTimes);
  
  return addMinutes(order.createdAt, maxPrepTime);
}
```

### Late Order Alerts

**Visual and audio alerts when orders exceed target time:**

```typescript
function LateOrderAlert({ order }: { order: Order }) {
  const elapsedMinutes = differenceInMinutes(new Date(), order.createdAt);
  const targetMinutes = order.expectedPrepMinutes;
  const isLate = elapsedMinutes > targetMinutes;
  
  // Escalating alerts
  const minutesLate = elapsedMinutes - targetMinutes;
  
  if (!isLate) return null;
  
  return (
    <div className={cn(
      "absolute top-0 right-0 px-3 py-1 font-bold",
      minutesLate < 5 && "bg-orange-500",
      minutesLate >= 5 && "bg-red-600 animate-pulse"
    )}>
      🚨 LATE {minutesLate} MIN
    </div>
  );
}

// Audio alert (optional, configurable)
useEffect(() => {
  if (isLate && minutesLate % 5 === 0) {
    playAlert('late-order.mp3');
  }
}, [minutesLate]);

// Manager notification
if (minutesLate > 10) {
  await notifyManager({
    type: 'LATE_ORDER',
    orderId: order.id,
    orderNumber: order.displayNumber,
    minutesLate,
    tableName: order.tab.tableName,
  });
}
```

### Estimated Time of Completion (ETC)

**Show servers when food will be ready:**

```typescript
interface OrderETC {
  orderId: string;
  estimatedCompletionTime: Date;
  confidenceLevel: 'high' | 'medium' | 'low';
  
  // Show on server POS
  etcDisplay: string; // "~8 minutes" or "12:45 PM"
}

// Dynamically update ETC as status changes
socket.on('order:status-changed', ({ orderId, status }) => {
  if (status === 'PREPARING') {
    // Refine ETC based on actual start time
    const newETC = calculateRefinedETC(orderId);
    updateServerPOS(orderId, newETC);
  }
  
  if (status === 'READY') {
    // Food is ready now
    notifyServer(`Order #${orderNumber} is ready for pickup!`);
  }
});
```

---

## Part 8: Kitchen-to-Server Communication

### Issue Flagging

**Kitchen can notify servers of problems:**

```typescript
enum KitchenIssueType {
  OUT_OF_STOCK = 'OUT_OF_STOCK',           // "86'd" an item
  TAKING_LONGER = 'TAKING_LONGER',         // Prep running late
  NEED_CLARIFICATION = 'NEED_CLARIFICATION', // Special instruction unclear
  NEED_RUNNER = 'NEED_RUNNER',             // Food ready, need expo
}

async function flagOrderIssue(
  orderId: string,
  issueType: KitchenIssueType,
  message: string
): Promise<void> {
  const order = await getOrder(orderId);
  
  // Log issue
  await createKitchenIssue({
    orderId,
    issueType,
    message,
    createdBy: 'kitchen',
  });
  
  // Notify server assigned to that table
  const server = await getAssignedServer(order.tab.tableId);
  
  io.to(`user:${server.id}`).emit('kitchen:issue', {
    orderId,
    orderNumber: order.displayNumber,
    tableName: order.tab.tableName,
    issueType,
    message,
    timestamp: new Date(),
  });
  
  // Show notification on server POS
  showNotification(server.id, {
    type: 'warning',
    title: 'Kitchen Issue',
    body: `${order.tab.tableName}: ${message}`,
  });
}

// UI Component
function FlagIssueButton({ orderId }: { orderId: string }) {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowModal(true)}>
        🚩 Flag Issue
      </button>
      
      {showModal && (
        <IssueModal
          orderId={orderId}
          onSubmit={(type, message) => {
            flagOrderIssue(orderId, type, message);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
```

### Request Runner System

**Kitchen alerts servers when food is ready for pickup:**

```typescript
// Kitchen marks order ready
await advanceOrderStatus(orderId); // PREPARING → READY

// Emit to all servers
io.to(`venue:${venueId}:servers`).emit('order:ready', {
  orderId,
  orderNumber: order.displayNumber,
  tableName: order.tab.tableName,
  items: order.items.map(i => i.name),
});

// Server POS shows alert
<RunnerAlert>
  <AlertBanner color="green">
    Order #102 (Table 5) is ready! 🍽️
  </AlertBanner>
  <ActionButton>Mark as Picked Up</ActionButton>
</RunnerAlert>

// Server marks as picked up
async function markOrderPickedUp(orderId: string, serverId: string) {
  await updateOrder(orderId, {
    pickedUpAt: new Date(),
    pickedUpBy: serverId,
  });
  
  // Notify kitchen (acknowledgment)
  io.to(`venue:${venueId}:kitchen`).emit('order:picked-up', {
    orderId,
    pickedUpBy: serverId,
  });
}
```

---

## Part 9: Configuration & Display Settings

### Venue-Specific KDS Settings

```typescript
interface KDSSettings {
  // Display preferences
  displayMode: 'COMPACT' | 'STANDARD' | 'LARGE_TEXT';
  fontSize: number; // 16-24px
  orderCardSize: 'SMALL' | 'MEDIUM' | 'LARGE';
  showElapsedTimers: boolean;
  showEstimatedCompletion: boolean;
  
  // Urgency thresholds
  yellowThresholdPercent: number; // default: 60%
  redThresholdPercent: number;    // default: 90%
  
  // Audio alerts
  newOrderSound: boolean;
  lateOrderSound: boolean;
  soundVolume: number; // 0-100
  
  // Auto-advance
  autoAdvanceToPrep: boolean; // Auto-mark PREPARING when order arrives
  autoBumpAfterReady: number | null; // Auto-bump after X min in READY state
  
  // Station configuration
  stations: KitchenStation[];
  
  // Order visibility
  hideCompletedOrders: boolean;
  maxVisibleOrders: number; // Scroll if more than X orders
}
```

### Display Calibration

**Per-device adjustments for different screen sizes:**

```typescript
// iPad 12.9" (landscape)
const ipadLargeLayout = {
  ordersPerRow: 3,
  orderCardWidth: 380,
  fontSize: 18,
};

// Large TV monitor (1080p)
const tvLayout = {
  ordersPerRow: 4,
  orderCardWidth: 450,
  fontSize: 24, // Readable from 15 feet
};

// Small tablet (10")
const smallTabletLayout = {
  ordersPerRow: 2,
  orderCardWidth: 320,
  fontSize: 16,
};
```

---

## Part 10: Analytics & Performance Tracking

### Kitchen Performance Metrics

```typescript
interface KitchenAnalytics {
  // Speed metrics
  avgPrepTime: number;           // Minutes from order to ready
  avgPrepTimeByItem: Record<string, number>;
  avgPrepTimeByStation: Record<string, number>;
  avgPrepTimeByHour: Record<string, number>;
  
  // Quality metrics
  lateOrderCount: number;
  lateOrderPercentage: number;   // % of orders exceeding target time
  onTimePercentage: number;      // % delivered within target
  
  // Efficiency metrics
  ordersPerHour: number;
  avgOrdersInQueue: number;
  peakQueueLength: number;
  avgWaitTimeBeforePrep: number; // How long before cook starts
  
  // Error tracking
  remakeCount: number;           // Orders that were remade
  remakeReasons: Record<string, number>; // Wrong temp, missing item, etc.
}

// Daily dashboard
const dailyReport = {
  date: '2025-11-26',
  totalOrders: 247,
  avgPrepTime: 11.2, // minutes
  onTimePercentage: 87.4,
  lateOrders: 31,
  
  // Peak hour analysis
  rushHourPerformance: {
    timeRange: '6:00 PM - 8:00 PM',
    ordersPerHour: 62,
    avgPrepTime: 14.5, // Slower during rush
    lateOrderPercentage: 18.2,
  },
  
  // Top performers
  fastestItems: [
    { name: 'Salad', avgPrepTime: 3.2 },
    { name: 'Fries', avgPrepTime: 4.8 },
  ],
  slowestItems: [
    { name: 'Ribeye', avgPrepTime: 18.3 },
    { name: 'Pasta', avgPrepTime: 15.7 },
  ],
};
```

### Manager Dashboard View

```
┌────────────────────────────────────────────────┐
│ Kitchen Performance - Today                     │
├────────────────────────────────────────────────┤
│                                                 │
│ ⏱️ Avg Prep Time: 11.2 min (target: 10 min)    │
│ ✅ On-Time: 87.4% (216/247 orders)             │
│ 🔴 Late: 12.6% (31 orders)                     │
│                                                 │
│ 📊 Hourly Breakdown                            │
│ 11 AM: 18 orders, 9.3 min avg                  │
│ 12 PM: 42 orders, 10.1 min avg                 │
│ 1 PM: 38 orders, 9.8 min avg                   │
│ 6 PM: 62 orders, 14.5 min avg ⚠️ (rush hour)   │
│                                                 │
│ 🍳 Station Performance                         │
│ Grill: 11.8 min avg (123 orders)               │
│ Fryer: 8.2 min avg (94 orders)                 │
│ Salad: 3.5 min avg (87 orders)                 │
│                                                 │
│ 🏆 Top 3 Fastest Items                         │
│ 1. Salad - 3.2 min                              │
│ 2. Fries - 4.8 min                              │
│ 3. Burger - 7.9 min                             │
│                                                 │
│ ⚠️ Needs Attention                             │
│ • Ribeye taking 18+ min (target: 15 min)       │
│ • Rush hour prep time 45% slower               │
│ • 3 remakes today (2 wrong temp, 1 missing)    │
│                                                 │
└────────────────────────────────────────────────┘
```

---

## Conclusion

The Kitchen Display System is the **operational backbone** that enables Crowdiant's speed and accuracy:

1. **Eliminates paper tickets** (no lost/illegible orders)
2. **Real-time routing** (orders appear instantly on correct stations)
3. **Visual queue management** (color-coded urgency, timers)
4. **Allergy safety** (impossible-to-miss red banners)
5. **Kitchen-server communication** (flag issues, request runners)
6. **Performance analytics** (track speed, identify bottlenecks)

**Without KDS:** 15-20% timing issues, 8-12% prep errors  
**With KDS:** 87%+ on-time rate, 50% fewer errors, full visibility

**Key Innovation:** Using **Socket.io real-time updates + station filtering + timing intelligence** to create a digital workflow that's faster, safer, and more measurable than paper tickets.

**Integration Points:**
- Express Checkout (orders flow from tabs to kitchen)
- Trust System (fast kitchen = better CX = higher trust)
- Analytics (every order tracked for performance insights)
- Staff Scheduling (identify slow periods, optimize staffing)
