# Walk-Away Detection & Recovery - Feature Deep Dive

## Executive Summary

**Feature Name:** Walk-Away Detection & Recovery  
**Category:** Revenue Protection & Customer Experience  
**Priority:** P0 - Critical (Sprint 3)  
**Complexity:** Medium-High (background jobs, SMS integration, state management)  
**Primary Value:** Eliminate $0 walk-aways while maintaining hospitality-first approach

### The Core Problem

**Traditional tab systems have two failure modes:**

**Mode 1: Customer Forgets**
- Customer genuinely forgets they have an open tab
- Leaves restaurant assuming they paid
- Restaurant realizes hours/days later
- Result: $0 revenue from that visit (walk-away)

**Mode 2: Intentional Theft**
- Bad actor deliberately leaves without paying
- Relies on chaos of busy restaurant
- Hard to prove intent
- Result: $0 revenue + potential trust system abuse

**Industry Impact:**
- 2-5% of tabs result in walk-aways at traditional bars
- Average walk-away: $35-75
- For venue with $50K monthly revenue: $1,000-2,500 lost monthly

### The Solution

Crowdiant's Walk-Away Detection uses:
1. **Behavioral signals** (inactivity, table cleared, time exceeded)
2. **SMS warnings** (hospitality-first: assume good faith)
3. **Grace periods** (10-15 min before auto-close)
4. **Pre-authorization capture** (payment already secured)
5. **Trust score impact** (negative trust event if pattern emerges)

**Result:** ~$0 walk-aways while maintaining positive customer experience

---

## Part 1: The Psychology of Walk-Aways

### Innocent vs. Intentional

**Innocent Walk-Aways (80% of cases):**
- Customer had a card/ID at bar, forgets to close out
- Express Checkout customer thinks they already paid
- Distracted by phone call, emergency, friends leaving
- Venue was busy, customer couldn't find server

**Customer Experience:** Embarrassment, guilt, wants to make it right

**Intentional Walk-Aways (20% of cases):**
- Dine-and-dash attempt
- Testing if restaurant has tracking
- Dispute over service, decides not to pay
- Thought someone else paid

**Customer Experience:** Knows exactly what they're doing

### Why Traditional Solutions Fail

**Solution 1: Physical Card/ID Holding**
- Doesn't work for Express Checkout (customer keeps card)
- Customer can't drive home without ID
- Liability if card lost/stolen by staff

**Solution 2: Manual Tracking**
- Staff watches for people leaving
- Requires constant vigilance during rush
- Confrontational ("Did you pay?")
- Doesn't scale

**Solution 3: Accept the Loss**
- Cheaper than enforcement (staff time, legal)
- But accumulates: $2K+ monthly for busy venue
- Enables bad actors

---

## Part 2: Detection Algorithm

### Signal-Based Detection

Walk-away detection uses **multiple signals**, not just time:

```typescript
interface WalkAwaySignals {
  // Time-based signals
  timeSinceLastOrder: number;       // Minutes since last item added
  timeSinceTabOpen: number;         // Total tab duration
  timeExceedsAverage: boolean;      // Longer than typical visit?
  
  // Staff signals
  tableMarkedCleared: boolean;      // Server cleared table
  serverReportedDeparture: boolean; // "I think they left"
  
  // Customer signals
  lastActivityType: 'ORDER' | 'VIEW_TAB' | 'NONE';
  tabViewedRecently: boolean;       // Customer checked tab in last 10 min
  customerLeftVenue: boolean;       // GPS/beacon data (future feature)
  
  // Contextual signals
  peakHours: boolean;               // More likely to forget during rush
  largeParty: boolean;              // Groups more likely to have confusion
  alcoholServed: boolean;           // Higher walk-away risk after drinks
}

function calculateWalkAwayProbability(signals: WalkAwaySignals): number {
  let probability = 0;
  
  // Time-based scoring
  if (signals.timeSinceLastOrder > 30) probability += 0.3;
  if (signals.timeSinceLastOrder > 60) probability += 0.2;
  if (signals.timeExceedsAverage) probability += 0.2;
  
  // Staff signals (strongest)
  if (signals.tableMarkedCleared) probability += 0.5;
  if (signals.serverReportedDeparture) probability += 0.7;
  
  // Customer signals
  if (!signals.tabViewedRecently) probability += 0.1;
  if (signals.lastActivityType === 'NONE') probability += 0.2;
  
  // Contextual modifiers
  if (signals.peakHours) probability *= 1.2; // 20% increase
  if (signals.largeParty) probability *= 1.1; // 10% increase
  
  return Math.min(probability, 1.0);
}

// Trigger walk-away detection if probability > 0.7
const WALK_AWAY_THRESHOLD = 0.7;
```

### Configurable Triggers

**Venues can adjust sensitivity:**

```typescript
interface WalkAwaySettings {
  // Time thresholds
  inactivityMinutes: number;        // default: 30
  gracePeriodMinutes: number;       // default: 15
  maxTabDurationMinutes: number;    // default: 180 (3 hours)
  
  // Detection mode
  detectionMode: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  
  // Staff input required?
  requireStaffConfirmation: boolean; // default: false
  
  // Auto-close enabled?
  autoCloseEnabled: boolean;         // default: true
  
  // Tip handling
  defaultTipPercent: number;         // default: 0% (or last interaction's tip)
}

// Detection mode presets
const DETECTION_MODES = {
  AGGRESSIVE: {
    inactivityMinutes: 20,
    gracePeriodMinutes: 10,
    threshold: 0.6,
  },
  BALANCED: {
    inactivityMinutes: 30,
    gracePeriodMinutes: 15,
    threshold: 0.7,
  },
  CONSERVATIVE: {
    inactivityMinutes: 45,
    gracePeriodMinutes: 20,
    threshold: 0.8,
  },
};
```

---

## Part 3: Walk-Away State Machine

### Tab Lifecycle with Walk-Away States

```
PENDING_AUTH
    ↓ (card authorized)
OPEN
    ↓ (customer stops ordering)
IDLE (monitoring starts)
    ↓ (inactivity threshold met)
WALK_AWAY_DETECTED
    ↓ (SMS warning sent)
WALK_AWAY_GRACE_PERIOD
    ├─ (customer responds "WAIT") → OPEN
    ├─ (customer self-closes) → CLOSING
    ├─ (server closes) → CLOSING
    └─ (grace period expires) → AUTO_CLOSING
        ↓
    AUTO_CLOSED
        ↓ (payment captured)
    CLOSED
```

### State Transition Logic

```typescript
enum TabStatus {
  PENDING_AUTH = 'PENDING_AUTH',
  OPEN = 'OPEN',
  IDLE = 'IDLE',
  WALK_AWAY_DETECTED = 'WALK_AWAY_DETECTED',
  WALK_AWAY_GRACE_PERIOD = 'WALK_AWAY_GRACE_PERIOD',
  AUTO_CLOSING = 'AUTO_CLOSING',
  AUTO_CLOSED = 'AUTO_CLOSED',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
}

async function handleTabStateTransition(
  tabId: string,
  event: TabEvent
): Promise<TabStatus> {
  const tab = await getTab(tabId);
  
  switch (tab.status) {
    case TabStatus.OPEN:
      if (event.type === 'INACTIVITY_DETECTED') {
        await updateTabStatus(tabId, TabStatus.IDLE);
        await startIdleMonitoring(tabId);
      }
      break;
    
    case TabStatus.IDLE:
      if (event.type === 'NEW_ORDER') {
        // Customer still active - back to OPEN
        await updateTabStatus(tabId, TabStatus.OPEN);
        await cancelIdleMonitoring(tabId);
      } else if (event.type === 'WALK_AWAY_THRESHOLD_MET') {
        await updateTabStatus(tabId, TabStatus.WALK_AWAY_DETECTED);
        await sendWalkAwayWarning(tabId);
      }
      break;
    
    case TabStatus.WALK_AWAY_DETECTED:
      // Immediately after detection, enter grace period
      await updateTabStatus(tabId, TabStatus.WALK_AWAY_GRACE_PERIOD);
      await scheduleAutoClose(tabId, GRACE_PERIOD_MINUTES);
      break;
    
    case TabStatus.WALK_AWAY_GRACE_PERIOD:
      if (event.type === 'CUSTOMER_RESPONDED_WAIT') {
        // Customer said they're still there
        await updateTabStatus(tabId, TabStatus.OPEN);
        await cancelAutoClose(tabId);
        await logTrustEvent(tab.customerId, 'FALSE_WALK_AWAY_POSITIVE');
      } else if (event.type === 'CUSTOMER_SELF_CLOSED') {
        await updateTabStatus(tabId, TabStatus.CLOSING);
        await cancelAutoClose(tabId);
      } else if (event.type === 'GRACE_PERIOD_EXPIRED') {
        await updateTabStatus(tabId, TabStatus.AUTO_CLOSING);
        await autoCloseTab(tabId);
      }
      break;
    
    case TabStatus.AUTO_CLOSING:
      if (event.type === 'PAYMENT_CAPTURED') {
        await updateTabStatus(tabId, TabStatus.AUTO_CLOSED);
        await sendReceipt(tabId);
        await logTrustEvent(tab.customerId, 'WALK_AWAY_AUTO_CLOSED');
      }
      break;
  }
}
```

---

## Part 4: SMS Warning System

### The Hospitality-First Warning

**Key principle:** Assume good faith, give customer opportunity to respond

**SMS Template (first warning):**
```
Hi [Name]! 👋

We noticed you may have left [Venue Name] with an open tab.

Your current balance: $42.50

If you're still dining with us:
• Reply WAIT and we'll keep your tab open

If you've left:
• Reply CLOSE to close your tab now
• Or your tab will auto-close in 15 minutes

Questions? Call us: (555) 123-4567

- The team at [Venue Name]
```

### Two-Way SMS Conversation

**Customer can respond with:**
- `WAIT` or `STILL HERE` → Cancels auto-close, returns to OPEN
- `CLOSE` or `DONE` → Triggers close flow (tip selection)
- `STATUS` or `BALANCE` → Returns current tab total
- `HELP` → Returns venue phone number

```typescript
async function handleSMSResponse(
  from: string,
  message: string
): Promise<void> {
  const tab = await findTabByPhone(from);
  
  if (!tab) {
    await sendSMS(from, "We couldn't find an open tab for this number. Call us if you need help: [venue phone]");
    return;
  }
  
  const normalized = message.trim().toUpperCase();
  
  if (['WAIT', 'STILL HERE', 'STAY', 'OPEN'].includes(normalized)) {
    await cancelAutoClose(tab.id);
    await updateTabStatus(tab.id, TabStatus.OPEN);
    await sendSMS(from, "Great! We'll keep your tab open. Reply CLOSE when you're ready to pay.");
    
  } else if (['CLOSE', 'DONE', 'PAY', 'FINISH'].includes(normalized)) {
    // Initiate close flow via SMS
    await sendSMS(from, `Your tab total is $${tab.total}. Add a tip?\n\n1️⃣ 15% ($${tip15})\n2️⃣ 18% ($${tip18})\n3️⃣ 20% ($${tip20})\n4️⃣ No tip\n\nReply with a number or custom amount.`);
    await updateTabStatus(tab.id, TabStatus.CLOSING);
    
  } else if (['STATUS', 'BALANCE', 'TOTAL'].includes(normalized)) {
    const items = await getTabItems(tab.id);
    const itemsList = items.map(i => `${i.name}: $${i.price}`).join('\n');
    await sendSMS(from, `Your tab:\n\n${itemsList}\n\nSubtotal: $${tab.subtotal}\nTax: $${tab.tax}\nTotal: $${tab.total}`);
    
  } else if (['HELP', '?'].includes(normalized)) {
    await sendSMS(from, `Need help? Call us at ${tab.venue.phone} or visit our front desk.`);
    
  } else {
    // Unknown command
    await sendSMS(from, "Sorry, we didn't understand. Reply WAIT to keep tab open, CLOSE to pay, or HELP for assistance.");
  }
}
```

### Escalation: Second Warning

**If customer doesn't respond to first warning:**

```
Hi [Name], this is a final reminder.

Your tab at [Venue Name] will auto-close in 5 minutes.

Current balance: $42.50

We'll charge your card on file and email your receipt.

Reply WAIT if you need more time.

Thank you!
```

---

## Part 5: Auto-Close Execution

### Capture Pre-Authorization

**When grace period expires:**

```typescript
async function autoCloseTab(tabId: string): Promise<void> {
  const tab = await getTab(tabId);
  
  // Calculate final amount
  const finalAmount = tab.subtotal + tab.tax;
  const tipAmount = calculateDefaultTip(tab); // 0% or last interaction's tip
  const totalAmount = finalAmount + tipAmount;
  
  try {
    // Capture pre-authorization
    const payment = await stripe.paymentIntents.capture(tab.paymentIntentId, {
      amount_to_capture: totalAmount,
      metadata: {
        tab_id: tabId,
        close_reason: 'AUTO_CLOSE_WALK_AWAY',
        tip_amount: tipAmount,
      },
    });
    
    // Update tab status
    await updateTab(tabId, {
      status: TabStatus.AUTO_CLOSED,
      closedAt: new Date(),
      closeReason: 'AUTO_CLOSE_WALK_AWAY',
      finalAmount: totalAmount,
      tipAmount,
      paymentCaptured: true,
    });
    
    // Send receipt
    await sendReceipt(tab.customerId, {
      tabId,
      amount: totalAmount,
      tip: tipAmount,
      method: 'Auto-closed after walk-away detection',
    });
    
    // Log trust event
    await logTrustEvent(tab.customerId, tab.venueId, {
      type: 'WALK_AWAY_AUTO_CLOSED',
      impact: -150, // Negative trust points
      metadata: {
        tabId,
        amount: totalAmount,
        warningsSent: 2,
        responded: false,
      },
    });
    
    // Notify venue staff
    await notifyStaff(tab.venueId, {
      type: 'AUTO_CLOSE_COMPLETED',
      tabId,
      customer: tab.customerId,
      amount: totalAmount,
    });
    
  } catch (error) {
    // Payment capture failed
    await handleAutoCloseFailure(tabId, error);
  }
}
```

### Handle Auto-Close Failures

**If payment capture fails:**

```typescript
async function handleAutoCloseFailure(
  tabId: string,
  error: Error
): Promise<void> {
  const tab = await getTab(tabId);
  
  // Update tab status
  await updateTab(tabId, {
    status: TabStatus.PAYMENT_REQUIRED,
    closeError: error.message,
  });
  
  // Notify venue owner immediately
  await sendUrgentAlert(tab.venueId, {
    type: 'AUTO_CLOSE_PAYMENT_FAILED',
    tabId,
    customer: tab.customerId,
    amount: tab.total,
    error: error.message,
    action: 'Contact customer or write off',
  });
  
  // Send SMS to customer
  await sendSMS(tab.customerPhone, 
    `Hi ${tab.customerName}, we couldn't process payment for your tab at ${tab.venue.name}. ` +
    `Please call us at ${tab.venue.phone} to resolve. Amount due: $${tab.total}`
  );
  
  // Log severe trust event
  await logTrustEvent(tab.customerId, tab.venueId, {
    type: 'WALK_AWAY_PAYMENT_FAILED',
    impact: -200, // Severe penalty
    metadata: {
      tabId,
      amount: tab.total,
      error: error.message,
    },
  });
  
  // Flag customer for manual review
  await flagCustomerForReview(tab.customerId, 'walk_away_payment_failed');
}
```

---

## Part 6: Manager Override & Controls

### Manager Dashboard - Active Walk-Aways

**Real-time view of tabs in walk-away states:**

```
┌───────────────────────────────────────────────────┐
│ Walk-Away Alerts                                   │
├───────────────────────────────────────────────────┤
│                                                    │
│ ⚠️ Table 7 - Sarah Johnson                        │
│ Status: Grace Period (8 min remaining)            │
│ Balance: $42.50                                    │
│ SMS sent: 7 minutes ago (no response)             │
│ [Cancel Auto-Close] [Close Now] [View Tab]        │
│                                                    │
│ ⚠️ Table 12 - John Smith                          │
│ Status: Idle (monitoring)                          │
│ Balance: $68.00                                    │
│ Last order: 34 minutes ago                         │
│ [Mark as Departed] [Add Order] [Ignore]           │
│                                                    │
│ ⚠️ Bar Tab - Mike Davis                           │
│ Status: Auto-Closing (payment processing)          │
│ Balance: $35.75                                    │
│ Auto-close triggered: 1 minute ago                 │
│ [Processing...cannot cancel]                       │
│                                                    │
└───────────────────────────────────────────────────┘
```

### Manager Actions

**1. Cancel Auto-Close**
```typescript
async function managerCancelAutoClose(
  managerId: string,
  tabId: string,
  reason: string
): Promise<void> {
  const tab = await getTab(tabId);
  
  if (tab.status !== TabStatus.WALK_AWAY_GRACE_PERIOD) {
    throw new Error('Can only cancel during grace period');
  }
  
  // Cancel scheduled auto-close
  await cancelAutoClose(tabId);
  
  // Return to open status
  await updateTab(tabId, {
    status: TabStatus.OPEN,
    autoCloseCancelled: true,
    autoCloseCancelledBy: managerId,
    autoCloseCancelReason: reason,
  });
  
  // Log event
  await logAudit({
    action: 'CANCEL_AUTO_CLOSE',
    performedBy: managerId,
    tabId,
    reason,
  });
  
  // Send SMS to customer
  await sendSMS(tab.customerPhone,
    `Good news! Your tab at ${tab.venue.name} is still open. ` +
    `Take your time - no rush to close out.`
  );
}
```

**2. Force Close Now**
```typescript
async function managerForceClose(
  managerId: string,
  tabId: string,
  tipAmount: number
): Promise<void> {
  const tab = await getTab(tabId);
  
  // Skip grace period, close immediately
  await updateTab(tabId, {
    status: TabStatus.CLOSING,
    forceClosedBy: managerId,
  });
  
  // Capture payment
  await capturePayment(tabId, tipAmount);
  
  // Log event
  await logAudit({
    action: 'FORCE_CLOSE_TAB',
    performedBy: managerId,
    tabId,
    tipAmount,
  });
}
```

**3. Write Off (No Charge)**
```typescript
async function managerWriteOff(
  managerId: string,
  tabId: string,
  reason: string
): Promise<void> {
  const tab = await getTab(tabId);
  
  // Cancel payment, release pre-auth
  await releasePreAuthorization(tab.paymentIntentId);
  
  // Mark as written off
  await updateTab(tabId, {
    status: TabStatus.CLOSED,
    writtenOff: true,
    writtenOffBy: managerId,
    writtenOffReason: reason,
    finalAmount: 0,
  });
  
  // Log financial event
  await logFinancialEvent({
    type: 'WRITE_OFF',
    amount: tab.total,
    tabId,
    approvedBy: managerId,
    reason,
  });
  
  // No negative trust impact (venue chose to write off)
}
```

---

## Part 7: Recovery & Customer Communication

### Post-Auto-Close Customer Experience

**SMS receipt after auto-close:**
```
Hi [Name], your tab at [Venue Name] has been closed.

Receipt:
• Subtotal: $38.50
• Tax: $3.08
• Tip: $0.00
• Total: $41.58

Charged to card ending in 4242.

We noticed you may have left without closing out - no worries! Your payment was processed automatically.

View full receipt: [link]

Questions? Call us: (555) 123-4567
```

**Email receipt (detailed):**
```html
<h2>Your tab at [Venue Name]</h2>

<p>Hi [Name],</p>

<p>Your tab was automatically closed after we detected you may have left the venue. No worries - this is a normal part of our Express Checkout system!</p>

<h3>Receipt Details</h3>
<table>
  <tr><td>Item</td><td>Price</td></tr>
  <tr><td>Burger</td><td>$14.00</td></tr>
  <tr><td>Fries</td><td>$5.50</td></tr>
  <tr><td>Beer (2)</td><td>$19.00</td></tr>
  <tr><td><strong>Subtotal</strong></td><td><strong>$38.50</strong></td></tr>
  <tr><td>Tax</td><td>$3.08</td></tr>
  <tr><td>Tip</td><td>$0.00</td></tr>
  <tr><td><strong>Total</strong></td><td><strong>$41.58</strong></td></tr>
</table>

<p>Charged to Visa ending in 4242 on [date].</p>

<p><strong>Want to add a tip?</strong> <a href="[link]">Click here</a> to add a tip within 24 hours.</p>

<p>Thanks for dining with us!</p>
```

### Post-Close Tip Addition

**Allow customers to add tip after auto-close:**

```typescript
async function addPostCloseTip(
  tabId: string,
  tipAmount: number
): Promise<void> {
  const tab = await getTab(tabId);
  
  // Only allow within 24 hours
  const hoursSinceClosed = differenceInHours(new Date(), tab.closedAt);
  if (hoursSinceClosed > 24) {
    throw new Error('Cannot add tip more than 24 hours after close');
  }
  
  // Only allow if originally auto-closed with $0 tip
  if (tab.closeReason !== 'AUTO_CLOSE_WALK_AWAY' || tab.tipAmount > 0) {
    throw new Error('Tip already included');
  }
  
  // Create separate charge for tip (Stripe best practice)
  const payment = await stripe.charges.create({
    amount: tipAmount,
    currency: 'usd',
    customer: tab.stripeCustomerId,
    description: `Tip for tab ${tabId}`,
    metadata: {
      original_tab_id: tabId,
      tip_added_post_close: true,
    },
  });
  
  // Update tab record
  await updateTab(tabId, {
    tipAmount,
    tipAddedPostClose: true,
    tipAddedAt: new Date(),
  });
  
  // Positive trust event (customer added tip after auto-close)
  await logTrustEvent(tab.customerId, tab.venueId, {
    type: 'POST_CLOSE_TIP_ADDED',
    impact: +50, // Positive trust boost
    metadata: {
      tabId,
      tipAmount,
    },
  });
  
  // Send thank you SMS
  await sendSMS(tab.customerPhone,
    `Thank you for adding a tip! Your total is now $${tab.finalAmount + tipAmount}. ` +
    `We appreciate your business at ${tab.venue.name}!`
  );
}
```

---

## Part 8: Analytics & Optimization

### Key Metrics

**Walk-Away Detection Performance:**
```typescript
interface WalkAwayMetrics {
  // Detection accuracy
  truePositives: number;    // Correctly detected walk-aways
  falsePositives: number;   // Customer was still there
  trueNegatives: number;    // Correctly didn't trigger
  falseNegatives: number;   // Missed actual walk-aways
  
  // Response rates
  smsResponseRate: number;  // % who responded to SMS
  autoCloseRate: number;    // % that went to auto-close
  cancelRate: number;       // % cancelled by staff/customer
  
  // Financial impact
  revenueRecovered: number; // $ that would have been lost
  avgAutoCloseAmount: number;
  tipRecoveryRate: number;  // % of auto-closes with tips added
  
  // Customer experience
  avgGracePeriodDuration: number; // How long before auto-close
  complaintsReceived: number;     // Customer complaints about auto-close
}
```

### Dashboard for Venue Owner

```
┌────────────────────────────────────────────────────┐
│ Walk-Away Detection Performance (Last 30 Days)      │
├────────────────────────────────────────────────────┤
│                                                     │
│ 💰 Revenue Protected: $2,340                       │
│                                                     │
│ 🎯 Detection Accuracy                              │
│ • Walk-aways detected: 18                           │
│ • False alarms: 2 (customer was still there)       │
│ • Accuracy: 90%                                     │
│                                                     │
│ 📊 Auto-Close Outcomes                             │
│ • Auto-closed: 12 (67%)                             │
│ • Customer responded "WAIT": 4 (22%)                │
│ • Staff cancelled: 2 (11%)                          │
│                                                     │
│ 💬 SMS Engagement                                   │
│ • Customers who responded: 14/18 (78%)              │
│ • Avg response time: 4.2 minutes                    │
│                                                     │
│ 💵 Tip Recovery                                     │
│ • Tips added post-close: 3 customers                │
│ • Avg tip added: $6.80                              │
│                                                     │
│ 😊 Customer Satisfaction                            │
│ • Complaints: 0                                     │
│ • Positive feedback: 5                              │
│                                                     │
└────────────────────────────────────────────────────┘
```

### Continuous Optimization

**Algorithm learns from false positives:**

```typescript
async function optimizeDetectionThreshold(venueId: string): Promise<void> {
  const metrics = await getWalkAwayMetrics(venueId, { days: 90 });
  
  // Calculate false positive rate
  const falsePositiveRate = metrics.falsePositives / 
    (metrics.falsePositives + metrics.truePositives);
  
  if (falsePositiveRate > 0.15) {
    // Too many false alarms - increase threshold
    await updateVenueSettings(venueId, {
      walkAwayThreshold: Math.min(0.9, currentThreshold + 0.05),
      inactivityMinutes: currentInactivity + 5,
    });
    
    await notifyVenueOwner(venueId, {
      type: 'DETECTION_OPTIMIZED',
      message: 'Walk-away detection threshold adjusted to reduce false alarms',
      newSettings: { threshold: newThreshold },
    });
  } else if (falsePositiveRate < 0.05 && metrics.truePositives < 5) {
    // Very low false alarm rate but not detecting much - decrease threshold
    await updateVenueSettings(venueId, {
      walkAwayThreshold: Math.max(0.5, currentThreshold - 0.05),
      inactivityMinutes: currentInactivity - 5,
    });
  }
}
```

---

## Part 9: Edge Cases & Special Scenarios

### Edge Case 1: Long Meals (3+ Hours)

**Scenario:** Fine dining, customer takes 3 hours for meal

**Solution:**
```typescript
// Don't trigger walk-away for venues with long avg meal duration
const avgMealDuration = await getAvgMealDuration(venueId);

if (avgMealDuration > 120) {
  // Fine dining - adjust thresholds
  inactivityThreshold = 60; // 60 min instead of 30
  maxTabDuration = 240;     // 4 hours instead of 3
}
```

### Edge Case 2: Outdoor Seating (Smoking Break)

**Scenario:** Customer steps outside for smoke, triggers walk-away

**Solution:**
- Venue marks table as "outdoor seating" → increased inactivity threshold
- Server can mark "Customer stepped out" → pauses detection timer

```typescript
async function pauseWalkAwayDetection(
  tabId: string,
  reason: string,
  durationMinutes: number
): Promise<void> {
  await updateTab(tabId, {
    walkAwayDetectionPaused: true,
    pauseReason: reason,
    pauseUntil: addMinutes(new Date(), durationMinutes),
  });
}
```

### Edge Case 3: Split Party

**Scenario:** Group splits up, some leave, some stay

**Solution:**
- If tab has multiple seats, require staff confirmation before walk-away
- "Did the entire party leave or just some guests?"

### Edge Case 4: Customer Returns During Grace Period

**Scenario:** Customer left phone, returns 10 minutes later

**Solution:**
- Walk-away detection shows on customer's tab view
- "We thought you left! Tap here to keep tab open"
- Or customer responds "WAIT" via SMS

---

## Part 10: Integration with Trust System

### Trust Score Impact

**Walk-away events affect trust differently based on context:**

```typescript
function calculateWalkAwayTrustImpact(
  tab: Tab,
  outcome: WalkAwayOutcome
): TrustImpact {
  let impact = 0;
  
  // Base penalty for walk-away
  if (outcome === 'AUTO_CLOSED') {
    impact = -150;
  }
  
  // Mitigating factors
  if (outcome === 'RESPONDED_WAIT') {
    // False alarm - positive trust event
    impact = +10;
  }
  
  if (outcome === 'AUTO_CLOSED_WITH_POST_TIP') {
    // Customer made it right - reduce penalty
    impact = -50; // Instead of -150
  }
  
  if (outcome === 'AUTO_CLOSED' && isFirstWalkAway(tab.customerId)) {
    // First offense - benefit of doubt
    impact = -100; // Instead of -150
  }
  
  if (outcome === 'PAYMENT_FAILED') {
    // Severe - couldn't even capture payment
    impact = -200;
  }
  
  return {
    points: impact,
    type: 'WALK_AWAY',
    severity: impact < -150 ? 'SEVERE' : 'MODERATE',
  };
}
```

### Trust-Based Grace Periods

**Higher trust = longer grace period:**

```typescript
function getGracePeriodForCustomer(
  customerId: string,
  venueId: string
): number {
  const trustLevel = await getTrustLevel(customerId, venueId);
  
  switch (trustLevel) {
    case TrustLevel.NEW:
      return 10; // 10 min grace period
    
    case TrustLevel.FAMILIAR:
      return 15; // 15 min
    
    case TrustLevel.REGULAR:
      return 20; // 20 min
    
    case TrustLevel.TRUSTED:
      return 30; // 30 min
    
    case TrustLevel.VIP:
      return 60; // 1 hour - probably not a walk-away
  }
}
```

---

## Conclusion

Walk-Away Detection & Recovery is the **safety net** that makes Express Checkout financially viable:

1. **Eliminates revenue loss** (~$2K+ monthly for busy venues)
2. **Maintains hospitality** (SMS warnings, grace periods, assume good faith)
3. **Builds trust** (customers appreciate reminder, not accusation)
4. **Prevents fraud** (intentional walk-aways detected quickly)
5. **Provides analytics** (venue sees patterns, optimizes detection)

**Without this feature:** Express Checkout = high risk of walk-aways  
**With this feature:** Express Checkout = ~$0 walk-aways while maintaining positive CX

**Key Innovation:** Using **behavioral signals + pre-authorization + SMS** to solve walk-aways without confrontation or staff burden.
