# Table & Floor Management - Feature Deep Dive

## Executive Summary

**Feature Name:** Table & Floor Management System  
**Category:** Operations & Host Management  
**Priority:** P0-P1 - Core Operations (Sprint 9)  
**Complexity:** Medium (floor plan editor, real-time status, state management)  
**Primary Value:** Efficient table turnover, optimized seating, improved host workflow

### The Core Problem

**Traditional table management is manual and error-prone:**

**The Paper Floor Plan Problem:**
- Hosts use laminated paper floor plans with dry-erase markers
- Messy, difficult to read after busy shift
- No visibility into table status remotely
- Servers and managers can't see who's seated where
- No data on turn times, occupancy rates

**Manual Seating Issues:**
- Host forgets which server has which section
- Servers get unevenly distributed (Server A: 8 tables, Server B: 2 tables)
- No visibility into how long tables have been occupied
- Can't track dirty tables (need cleaning)
- Reserved tables get accidentally seated

**Industry Impact:**
- 15-20% of table capacity lost to poor seating efficiency
- Average turn time: 60-90 min when could be 45-60 min with better visibility
- Server burnout from uneven table distribution
- Customer frustration from long waits when tables are available but dirty

### The Solution

Crowdiant's Table & Floor Management uses:
1. **Visual floor plan editor** (drag-and-drop table configuration)
2. **Real-time table status** (color-coded: available, occupied, dirty, reserved)
3. **Smart seating** (auto-assign servers, track party size, optimize sections)
4. **Turn time tracking** (elapsed timers, analytics on avg turn time)
5. **Server balance** (equitable table distribution across sections)
6. **Table combining** (merge tables for large parties)
7. **Socket.io updates** (all devices see changes instantly)

**Result:** 20% faster table turns, 15% higher capacity utilization, equitable server workload

---

## Part 1: The Host Workflow Problem

### Before Digital Table Management

**Typical busy Friday night scenario (paper system):**

1. **6:15 PM** - Party of 4 arrives, 10-minute wait
2. **Host checks paper floor plan** - Table 12 has "X" (occupied? dirty? can't tell)
3. **Host walks to dining room** - Table 12 is empty but dirty
4. **Host returns to host stand** - "Sorry, still waiting for cleanup"
5. **6:22 PM** - Busser clears Table 12, forgets to tell host
6. **6:28 PM** - Party asks "Is our table ready?" - Host has to check again
7. **6:32 PM** - Finally seated, party frustrated (17 min wait for table that was available at 6:22)

**Key failures:**
- No real-time status (host can't see dirty tables cleared)
- Manual communication (busser → host, error-prone)
- Wasted capacity (table sat empty 6 minutes)

### After Digital Table Management

**Same scenario with Crowdiant:**

1. **6:15 PM** - Party of 4 arrives
2. **Host checks tablet** - Table 12 shows GREY (dirty)
3. **Host sees** - Table 7 is GREEN (available, clean)
4. **Host taps Table 7** → "Seat Party" → Party size: 4 → Assign: Server Sarah
5. **6:16 PM** - Sarah's POS shows notification: "New party at Table 7"
6. **Busser clears Table 12** → Taps "Table Clean" → Status changes to GREEN instantly
7. **Next party** - Host sees Table 12 now available, seats immediately

**Key improvements:**
- Real-time visibility (all staff see same status)
- Instant notifications (server knows table seated)
- No wasted capacity (tables turn faster)

---

## Part 2: Floor Plan Configuration

### Visual Floor Plan Editor

**Drag-and-drop table placement:**

```
┌──────────────────────────────────────────────────┐
│ Floor Plan Editor - Main Dining Room             │
├──────────────────────────────────────────────────┤
│                                                   │
│  [+ Add Table]  [Save]  [Print]                  │
│                                                   │
│  ┌──────────────────────────────────────────┐   │
│  │                                           │   │
│  │    [Round]      [Square]                 │   │
│  │     Table        Table     [Booth]       │   │
│  │      #5          #12       #23-24        │   │
│  │     (4)          (2)       (6)           │   │
│  │                                           │   │
│  │              Kitchen                      │   │
│  │  [Bar]        [.........]                │   │
│  │  #1-10                                    │   │
│  │  (10)                                     │   │
│  │                                           │   │
│  │    [Round]      [Round]     [Square]     │   │
│  │     Table        Table       Table       │   │
│  │      #8          #9          #15         │   │
│  │     (4)          (4)          (2)        │   │
│  │                                           │   │
│  │              Patio Section                │   │
│  │  [Round] [Round] [Round] [Round]         │   │
│  │  #30     #31     #32     #33             │   │
│  │  (4)     (4)     (4)     (4)              │   │
│  │                                           │   │
│  └──────────────────────────────────────────┘   │
│                                                   │
│  Properties for Table #5:                        │
│  • Name: Table 5                                 │
│  • Capacity: 4 seats                             │
│  • Type: Standard Round                          │
│  • Section: Sarah's Section (1)                  │
│  • Position: (x: 120, y: 80)                     │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Table Configuration

```typescript
interface Table {
  id: string;
  venueId: string;
  floorPlanId: string;
  
  // Identity
  number: string;           // "5" or "Bar 1-3"
  name?: string;            // Optional display name
  
  // Physical properties
  shape: 'ROUND' | 'SQUARE' | 'RECTANGLE' | 'BOOTH' | 'BAR';
  capacity: number;         // Max seats
  minCapacity?: number;     // Min seats (for efficient seating)
  
  // Location
  positionX: number;        // Canvas coordinates
  positionY: number;
  width: number;
  height: number;
  rotation: number;         // Degrees (for rectangles)
  
  // Organization
  sectionId: string;        // Which server section
  zoneType: 'INDOOR' | 'OUTDOOR' | 'PATIO' | 'BAR' | 'PRIVATE';
  
  // Status
  status: TableStatus;
  currentParty?: {
    size: number;
    seatedAt: Date;
    customerName?: string;
    reservationId?: string;
  };
  assignedServerId?: string;
  
  // Features
  isCombineable: boolean;   // Can merge with adjacent tables
  isWheelchairAccessible: boolean;
  hasHighChair: boolean;
  hasOutdoorHeating: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

enum TableStatus {
  AVAILABLE = 'AVAILABLE',       // Green - ready to seat
  OCCUPIED = 'OCCUPIED',         // Yellow - party dining
  RESERVED = 'RESERVED',         // Red - upcoming reservation
  DIRTY = 'DIRTY',               // Grey - needs cleaning
  BLOCKED = 'BLOCKED',           // Black - out of service
}
```

### Multiple Floor Plans

**Support different layouts:**

```typescript
interface FloorPlan {
  id: string;
  venueId: string;
  
  // Basic info
  name: string;              // "Main Dining Room", "Patio", "Event Space"
  isActive: boolean;
  isDefault: boolean;
  
  // Layout
  width: number;             // Canvas dimensions
  height: number;
  backgroundImage?: string;  // Optional floor plan image
  
  // Tables
  tables: Table[];
  
  // Sections (server zones)
  sections: Section[];
  
  // Schedule
  activeTimeRanges?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

// Example: Different layouts for different times
const floorPlans = [
  {
    name: 'Lunch Service',
    active: { dayOfWeek: [1,2,3,4,5], startTime: '11:00', endTime: '15:00' },
    tables: 35, // Smaller capacity
  },
  {
    name: 'Dinner Service',
    active: { dayOfWeek: [0,1,2,3,4,5,6], startTime: '17:00', endTime: '23:00' },
    tables: 50, // Full capacity
  },
  {
    name: 'Brunch (Weekend)',
    active: { dayOfWeek: [0,6], startTime: '09:00', endTime: '15:00' },
    tables: 40,
  },
];
```

---

## Part 3: Real-Time Table Status

### Color-Coded Status Display

**Instant visibility for hosts:**

```
┌─────────────────────────────────────────────────┐
│ Table Management - Live View         6:42 PM     │
├─────────────────────────────────────────────────┤
│                                                  │
│  Capacity: 42 / 62 (68%)                        │
│  Available: 12 tables                            │
│  Occupied: 28 tables                             │
│  Dirty: 2 tables                                 │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │                                          │   │
│  │   🟢 T5      🟡 T12     🟢 T7            │   │
│  │   (4)       (2) 15m     (4)              │   │
│  │   Sarah     Mike        Sarah            │   │
│  │                                          │   │
│  │   🟡 T8      🟢 T9      🟡 T15           │   │
│  │   (4) 32m   (4)        (2) 8m            │   │
│  │   Mike      Sarah      John              │   │
│  │                                          │   │
│  │   ⚫ T20     🔴 T21     ⚪ T22            │   │
│  │   OUT       RESERVED   DIRTY             │   │
│  │             7:00 PM                      │   │
│  │                                          │   │
│  │   🟡 Bar 1-5  (5 seats occupied)         │   │
│  │   Jennifer   18m, 32m, 8m, 45m, 12m     │   │
│  │                                          │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  Legend:                                        │
│  🟢 Available   🟡 Occupied   🔴 Reserved       │
│  ⚪ Dirty       ⚫ Blocked                       │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Socket.io Real-Time Updates

**All devices sync instantly:**

```typescript
// When table status changes
async function updateTableStatus(
  tableId: string,
  newStatus: TableStatus,
  metadata?: any
): Promise<void> {
  const table = await getTable(tableId);
  
  // Update database
  await updateTable(tableId, {
    status: newStatus,
    ...metadata,
  });
  
  // Emit to all connected devices at this venue
  io.to(`venue:${table.venueId}:tables`).emit('table:status-changed', {
    tableId,
    status: newStatus,
    metadata,
    timestamp: new Date(),
  });
  
  // Also emit to specific roles
  io.to(`venue:${table.venueId}:hosts`).emit('table:status-changed', {...});
  io.to(`venue:${table.venueId}:servers`).emit('table:status-changed', {...});
}

// Client subscribes to table updates
socket.on('table:status-changed', (data) => {
  // Update UI instantly
  updateTableInUI(data.tableId, data.status, data.metadata);
  
  // Play notification sound (if host view)
  if (data.status === TableStatus.AVAILABLE && isHostView) {
    playNotification('table-available.mp3');
  }
});
```

### Table Details Modal

**Click table for full details:**

```
┌─────────────────────────────────────┐
│ Table 12 - Details                  │
├─────────────────────────────────────┤
│                                     │
│ Status: 🟡 Occupied                 │
│                                     │
│ Party Info:                         │
│ • Size: 2 guests                    │
│ • Customer: Sarah Johnson           │
│ • Seated: 6:27 PM (15 min ago)      │
│                                     │
│ Server: Mike Davis                  │
│ Section: Section 2                  │
│                                     │
│ Tab Status:                         │
│ • Tab ID: #TAB-1842                 │
│ • Current total: $42.50             │
│ • Last order: 8 minutes ago         │
│                                     │
│ Actions:                            │
│ [Clear Table]                       │
│ [Transfer to Server]                │
│ [Mark as Dirty]                     │
│ [Extend Reservation]                │
│                                     │
└─────────────────────────────────────┘
```

---

## Part 4: Smart Seating & Server Assignment

### Auto-Assign Servers by Section

**Equitable table distribution:**

```typescript
interface Section {
  id: string;
  venueId: string;
  name: string;              // "Section 1", "Patio Section"
  color: string;             // Visual identifier
  
  // Server assignment
  assignedServerIds: string[];
  
  // Tables in this section
  tableIds: string[];
  
  // Rotation settings
  rotationType: 'ROUND_ROBIN' | 'FAIR_SHARE' | 'MANUAL';
}

// Seat party with auto-server assignment
async function seatParty(input: SeatPartyInput): Promise<void> {
  const { tableId, partySize, customerName } = input;
  const table = await getTable(tableId);
  const section = await getSection(table.sectionId);
  
  // Get server with fewest current tables
  const server = await getNextAvailableServer(section);
  
  // Update table
  await updateTable(tableId, {
    status: TableStatus.OCCUPIED,
    assignedServerId: server.id,
    currentParty: {
      size: partySize,
      seatedAt: new Date(),
      customerName,
    },
  });
  
  // Create tab
  const tab = await createTab({
    venueId: table.venueId,
    tableId: table.id,
    customerId: input.customerId,
    serverId: server.id,
    partySize,
  });
  
  // Notify server
  await notifyServer(server.id, {
    type: 'NEW_TABLE_SEATED',
    tableNumber: table.number,
    partySize,
    customerName,
    tabId: tab.id,
  });
  
  // Emit real-time update
  emitTableStatusChange(table);
}

// Fair share algorithm (equitable distribution)
async function getNextAvailableServer(section: Section): Promise<Server> {
  const servers = await getServers(section.assignedServerIds);
  
  // Count current tables for each server
  const serverTableCounts = await Promise.all(
    servers.map(async (server) => ({
      server,
      tableCount: await countActiveTablesForServer(server.id),
    }))
  );
  
  // Sort by fewest tables
  serverTableCounts.sort((a, b) => a.tableCount - b.tableCount);
  
  // Return server with fewest tables
  return serverTableCounts[0].server;
}
```

### Party Size Matching

**Optimize table utilization:**

```typescript
async function suggestBestTable(
  partySize: number,
  venueId: string
): Promise<Table[]> {
  const availableTables = await getTables({
    venueId,
    status: TableStatus.AVAILABLE,
  });
  
  // Score each table by fit
  const scored = availableTables.map(table => ({
    table,
    score: calculateTableFitScore(table, partySize),
  }));
  
  // Sort by best fit
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.table);
}

function calculateTableFitScore(table: Table, partySize: number): number {
  let score = 100;
  
  // Perfect fit (party size = capacity)
  if (table.capacity === partySize) {
    score += 50;
  }
  
  // Good fit (1-2 extra seats)
  else if (table.capacity === partySize + 1 || table.capacity === partySize + 2) {
    score += 30;
  }
  
  // Acceptable fit (3+ extra seats)
  else if (table.capacity > partySize + 2) {
    score += 10;
    // Penalty for wasting capacity
    score -= (table.capacity - partySize) * 5;
  }
  
  // Too small (shouldn't happen, filtered out)
  else {
    score -= 100;
  }
  
  // Bonus for features
  if (table.hasHighChair && partySize includes children) {
    score += 20;
  }
  if (table.isWheelchairAccessible && requested) {
    score += 20;
  }
  
  return score;
}

// UI display
<SuggestedTables>
  <h3>Best tables for party of {partySize}:</h3>
  {suggestedTables.map(table => (
    <TableOption key={table.id} onClick={() => seatParty(table.id)}>
      <TableIcon shape={table.shape} />
      <TableNumber>{table.number}</TableNumber>
      <Capacity>{table.capacity} seats</Capacity>
      <Section>{table.section.name}</Section>
      <Status>✓ Perfect fit</Status>
    </TableOption>
  ))}
</SuggestedTables>
```

---

## Part 5: Turn Time Tracking & Analytics

### Elapsed Time Display

**Show how long tables have been occupied:**

```typescript
function TableElapsedTimer({ seatedAt }: { seatedAt: Date }) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const minutes = differenceInMinutes(new Date(), seatedAt);
      setElapsed(minutes);
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [seatedAt]);
  
  // Color-code by duration
  const color = 
    elapsed < 45 ? 'green' :
    elapsed < 75 ? 'yellow' :
    'red';
  
  return (
    <span className={`text-${color}-600 font-semibold`}>
      {elapsed}m
    </span>
  );
}
```

### Turn Time Analytics

**Track average turn times:**

```typescript
interface TurnTimeMetrics {
  // Averages
  avgTurnTimeMinutes: number;
  avgTurnByPartySize: Record<number, number>;
  avgTurnByMealPeriod: Record<string, number>;
  avgTurnByServer: Record<string, number>;
  
  // Distribution
  turnTimePercentiles: {
    p50: number; // Median
    p75: number;
    p90: number;
    p95: number;
  };
  
  // Trends
  turnTimeByHour: Record<string, number>;
  turnTimeByDayOfWeek: Record<string, number>;
  
  // Goals
  targetTurnTime: number;      // Manager-set goal
  percentMeetingTarget: number; // % of tables meeting goal
}

// Daily report
const turnTimeReport = {
  date: '2025-11-26',
  avgTurnTime: 58.3, // minutes
  
  byPartySize: {
    2: 42.5,
    4: 58.2,
    6: 72.8,
    8: 91.3,
  },
  
  byMealPeriod: {
    lunch: 48.2,
    dinner: 68.7,
  },
  
  slowestTables: [
    { table: 'Table 12', turnTime: 127, partySize: 2 }, // Outlier
    { table: 'Table 8', turnTime: 98, partySize: 4 },
  ],
  
  fastestServer: {
    name: 'Sarah',
    avgTurnTime: 52.3,
  },
};
```

### Turn Time Alerts

**Notify when tables exceed target:**

```typescript
async function monitorTableTurnTimes(): Promise<void> {
  const occupiedTables = await getTables({ status: TableStatus.OCCUPIED });
  const targetTurnTime = await getVenueTurnTimeTarget(venueId);
  
  for (const table of occupiedTables) {
    const elapsedMinutes = differenceInMinutes(new Date(), table.currentParty.seatedAt);
    
    // Alert at 15 minutes past target
    if (elapsedMinutes === targetTurnTime + 15) {
      await notifyManager({
        type: 'LONG_TABLE_DURATION',
        message: `${table.number} has been occupied for ${elapsedMinutes} minutes (target: ${targetTurnTime})`,
        tableId: table.id,
        serverId: table.assignedServerId,
      });
    }
    
    // Escalate at 30 minutes past target
    if (elapsedMinutes === targetTurnTime + 30) {
      await notifyManager({
        type: 'URGENT_TABLE_DURATION',
        priority: 'HIGH',
        message: `${table.number} URGENT: ${elapsedMinutes} min (target: ${targetTurnTime})`,
      });
    }
  }
}
```

---

## Part 6: Advanced Features

### Table Combining for Large Parties

**Merge adjacent tables:**

```typescript
async function combineTables(
  tableIds: string[],
  partySize: number
): Promise<CombinedTable> {
  const tables = await getTables(tableIds);
  
  // Validate all tables are available
  const allAvailable = tables.every(t => t.status === TableStatus.AVAILABLE);
  if (!allAvailable) {
    throw new Error('All tables must be available to combine');
  }
  
  // Create combined table
  const combined = await createCombinedTable({
    tableIds,
    capacity: tables.reduce((sum, t) => sum + t.capacity, 0),
    combinedName: `Tables ${tables.map(t => t.number).join('-')}`,
  });
  
  // Mark individual tables as part of combination
  await Promise.all(
    tableIds.map(id => updateTable(id, {
      status: TableStatus.OCCUPIED,
      combinedTableId: combined.id,
    }))
  );
  
  return combined;
}

// UI for host
<CombineTablesButton onClick={() => {
  selectTables([12, 13, 14]); // Multi-select
  combineTables([12, 13, 14], 12); // Party of 12
}}>
  Combine Tables
</CombineTablesButton>
```

### Server Table Transfers

**Reassign table to different server:**

```typescript
async function transferTable(
  tableId: string,
  newServerId: string,
  reason: string
): Promise<void> {
  const table = await getTable(tableId);
  const tab = await getTabByTableId(tableId);
  
  // Update table
  await updateTable(tableId, {
    assignedServerId: newServerId,
  });
  
  // Update tab
  await updateTab(tab.id, {
    serverId: newServerId,
  });
  
  // Log transfer
  await createAuditLog({
    action: 'TABLE_TRANSFER',
    tableId,
    fromServerId: table.assignedServerId,
    toServerId: newServerId,
    reason,
  });
  
  // Notify both servers
  await notifyServer(table.assignedServerId, {
    type: 'TABLE_TRANSFERRED_AWAY',
    message: `${table.number} transferred to ${newServer.name}`,
  });
  
  await notifyServer(newServerId, {
    type: 'TABLE_TRANSFERRED_TO_YOU',
    message: `${table.number} transferred to you from ${oldServer.name}`,
    tableId,
    tabId: tab.id,
  });
}

// UI in manager dashboard
<TableTransferModal table={table}>
  <select onChange={(e) => setNewServer(e.target.value)}>
    {servers.map(s => (
      <option value={s.id}>
        {s.name} ({s.activeTableCount} tables)
      </option>
    ))}
  </select>
  
  <textarea placeholder="Reason for transfer (optional)" />
  
  <button onClick={() => transferTable(table.id, newServerId, reason)}>
    Transfer Table
  </button>
</TableTransferModal>
```

### Clear Table Workflow

**Busser clears table, marks as dirty:**

```typescript
async function clearTable(tableId: string, busserId: string): Promise<void> {
  const table = await getTable(tableId);
  
  // Update to dirty status
  await updateTable(tableId, {
    status: TableStatus.DIRTY,
    currentParty: null,
    assignedServerId: null,
  });
  
  // Log turn time
  const turnTime = differenceInMinutes(new Date(), table.currentParty.seatedAt);
  await logTurnTime({
    tableId,
    partySize: table.currentParty.size,
    turnTimeMinutes: turnTime,
    clearedBy: busserId,
  });
  
  // Emit real-time update
  emitTableStatusChange(table);
}

// Busser marks clean
async function markTableClean(tableId: string, busserId: string): Promise<void> {
  await updateTable(tableId, {
    status: TableStatus.AVAILABLE,
  });
  
  // Notify hosts
  await notifyHosts({
    type: 'TABLE_AVAILABLE',
    tableNumber: table.number,
    capacity: table.capacity,
  });
  
  emitTableStatusChange(table);
}
```

---

## Part 7: Manager Analytics Dashboard

### Occupancy & Capacity Metrics

```
┌────────────────────────────────────────────────┐
│ Table Performance - Today                       │
├────────────────────────────────────────────────┤
│                                                 │
│ 📊 Capacity Utilization: 68%                   │
│ • Total seats: 120                              │
│ • Occupied seats: 82                            │
│ • Available seats: 38                           │
│                                                 │
│ ⏱️ Avg Turn Time: 58.3 min (target: 55 min)    │
│ • Party of 2: 42.5 min ✓                       │
│ • Party of 4: 58.2 min ⚠️                       │
│ • Party of 6+: 72.8 min ⚠️                      │
│                                                 │
│ 🔄 Table Turns                                 │
│ • Total turns today: 127                        │
│ • Avg turns per table: 4.2                      │
│ • Peak turn rate: 8 tables/hour (7 PM)         │
│                                                 │
│ 🏆 Top Performing Servers (turn time)          │
│ 1. Sarah: 52.3 min avg                          │
│ 2. Mike: 56.8 min avg                           │
│ 3. Jennifer: 59.1 min avg                       │
│                                                 │
│ ⚠️ Slow Tables Today                           │
│ • Table 12: 127 min (party of 2) ← outlier     │
│ • Table 8: 98 min (party of 4)                  │
│                                                 │
│ 💡 Recommendations                             │
│ • Peak occupancy: 6-8 PM (add busser)           │
│ • Table 12 consistently slow (check server)     │
│ • Party of 6+ avg 18 min over target            │
│                                                 │
└────────────────────────────────────────────────┘
```

---

## Conclusion

Table & Floor Management is the **operational foundation** for efficient restaurant flow:

1. **Visual floor plan** (drag-and-drop configuration, multiple layouts)
2. **Real-time status** (color-coded tables, Socket.io updates)
3. **Smart seating** (auto-assign servers, party size matching)
4. **Turn time tracking** (elapsed timers, analytics, alerts)
5. **Server balance** (equitable table distribution)
6. **Advanced features** (table combining, transfers, busser workflow)

**Without table management:** 15-20% capacity lost, manual errors, uneven server workload  
**With table management:** 20% faster turns, 15% higher utilization, equitable distribution

**Key Innovation:** Using **real-time Socket.io + visual floor plans + smart algorithms** to digitize the entire host workflow, eliminating paper and manual communication.

**Integration Points:**
- Express Checkout (tables linked to tabs)
- POS System (server assignments, tab management)
- Analytics (turn time, occupancy, server performance)
- Reservations (reserved table status)
