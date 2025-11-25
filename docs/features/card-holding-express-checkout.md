# Card-Holding Express Checkout System - Deep Dive

## Overview

This document explores the Card-Holding Express Checkout System - Crowdiant's key differentiator feature that transforms how restaurants secure tabs and prevent walk-aways.

---

## The Core Concept: Tab Security Through Card/ID Holding

### Current Industry Practice (The Problem)

**Traditional Bar/Restaurant Tab Flow:**
1. Customer orders drink/food
2. Server asks "Want to open a tab?"
3. Customer hands over **physical credit card or ID**
4. Card/ID goes in a drawer, box, or card holder behind bar
5. Customer orders throughout visit
6. At end, customer requests card back, settles bill
7. **If customer forgets/walks away** → Restaurant eats the loss OR has their ID

**Pain Points:**
- Physical cards get lost, mixed up, damaged
- IDs held = customer can't drive home, prove age elsewhere
- Staff time managing physical card storage
- Walk-aways still happen (customer forgets they have a tab)
- No digital record of which card is where
- Liability if card is stolen/misused by staff

---

## Digital Transformation Options

### Option 1: Digital Pre-Authorization (Card-on-File)

**How it works:**
1. Customer taps/dips/swipes card on arrival or when opening tab
2. System places a **hold/pre-authorization** (not a charge) for set amount
3. Card returns to customer immediately
4. All orders added to digital tab
5. At departure: actual amount charged, hold released

**Pros:**
- Customer keeps their physical card
- No lost/damaged cards
- Instant fraud detection
- Works with mobile wallets (Apple Pay, Google Pay)
- Can auto-close tab if customer walks (charge the auth)

**Cons:**
- Some customers uncomfortable with pre-auth
- Hold amount visible on their banking app (can concern customers)
- Declined cards = awkward conversation
- Pre-auth holds can take days to release (bank dependent)

---

### Option 2: ID Verification + Card-on-File Combo

**How it works:**
1. ID scanned (verifies age, captures identity)
2. Card pre-authorized (secures payment)
3. Customer keeps both physical items
4. Digital record links identity to payment method

**Pros:**
- Double verification (who + payment)
- Age verification built-in (alcohol service)
- If walk-away: you have identity for collections
- Fraud prevention (card must match ID)

**Cons:**
- Privacy concerns with ID scanning
- Regulatory complexity (ID data storage)
- More friction at tab opening

---

### Option 3: "VIP Express" Membership Model

**How it works:**
1. Customer downloads app / creates account once
2. Card + ID verified during signup (one-time)
3. At any participating venue: "I'm a Crowdiant member"
4. Face recognition OR app check-in OR QR code
5. Tab opens automatically, no friction
6. Walk out = charged automatically

**Pros:**
- Zero friction for repeat customers
- Cross-venue portability
- Build loyalty/network effects
- Premium positioning ("VIP treatment")
- Data goldmine for personalization

**Cons:**
- Requires customer adoption
- First-time visitors still need fallback
- App development/maintenance
- Trust building required

---

### Option 4: Hybrid Tiered System (Recommended)

**The Crowdiant Approach:**

| Customer Type | Verification | Tab Security | Experience |
|--------------|--------------|--------------|------------|
| **First-time visitor** | Card pre-auth | $50-200 hold | Standard |
| **App member (new)** | Card-on-file + ID verified | No hold needed | Streamlined |
| **App member (trusted)** | Face/QR recognition | Reputation-backed | VIP Express |
| **High-value regular** | Auto-recognized | Credit line | White glove |

---

## Key UX Considerations

### The Psychology of Trust

**❌ Wrong Framing:**
> "We need your card as security in case you don't pay"

**✅ Right Framing:**
> "Let me set up Express Checkout so you can leave whenever you're ready - no waiting for the check!"

### Communication Scripts for Staff

**Opening a tab:**
> "Would you like Express Checkout today? I'll set up your card so you can settle up from your phone anytime, or just head out when you're done - we'll send the receipt to your email."

**For hesitant customers:**
> "It's just like checking into a hotel - we verify the card but don't charge until you're done. You keep your card with you the whole time."

---

## Technical Architecture

### Pre-Authorization Amounts

| Venue Type | Suggested Pre-Auth | Rationale |
|------------|-------------------|-----------|
| Coffee shop | $25 | Low average ticket |
| Fast casual | $50 | Single meal range |
| Casual dining | $100 | Meal + drinks |
| Fine dining | $200-500 | Multi-course + wine |
| Nightclub/Bar | $100-300 | High drink volume |
| Hotel F&B | $500+ | Room charge backup |

### Walk-Away Detection & Handling

**Scenario flow:**
1. Tab open > 30 min with no activity
2. System sends SMS: "Still enjoying your visit at [venue]? Your tab is $47.50"
3. No response in 15 min → "Your Express Checkout is processing"
4. Auto-charge the pre-authorized amount
5. Receipt sent via email/SMS
6. If over pre-auth: flag for manager, attempt additional charge

### Dispute Handling

**Customer claims:** "I didn't authorize that charge!"

**Crowdiant response:**
- Digital signature/tap record
- Timestamp + location data
- Itemized receipt auto-sent
- Option to dispute specific items (not full bill)

---

## Open Questions for Further Exploration

### 1. Physical Card Holding Support
Do we want to support venues that STILL want to physically hold cards (legacy behavior), or push fully digital?

**Considerations:**
- Some venues may resist change
- Transition period support
- Training requirements

### 2. ID Scanning Integration
How important is the ID verification component vs. just card pre-auth?

**Considerations:**
- Age verification requirements (alcohol)
- Privacy regulations (GDPR, CCPA, state laws)
- Data storage and security
- Customer friction tolerance

### 3. Walk-Away Threshold Philosophy
What's our approach: Auto-charge aggressively (protect venue) or multiple warnings (protect customer relationship)?

**Considerations:**
- Customer experience vs. venue protection
- Configurable per-venue settings
- Time-based rules (late night = faster auto-charge?)

### 4. Reputation/Trust Scoring System
Should customers build "trust scores" that reduce/eliminate pre-auth requirements over time?

**Potential factors:**
- Number of successful tab closures
- Average spend per visit
- Payment history (no chargebacks)
- Membership tenure
- Venue feedback/ratings

### 5. Cross-Venue Portability
If someone is trusted at Venue A, should Venue B automatically trust them?

**Considerations:**
- Network effect driver
- Privacy implications
- Venue autonomy
- Fraud risk distribution

---

---

# PART 2: Complete UX Flow Design

## Customer Journey Maps

### Journey A: First-Time Walk-In Customer

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FIRST-TIME CUSTOMER JOURNEY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. ARRIVAL                                                                  │
│  ┌──────────┐                                                               │
│  │ Customer │──→ Seated by host                                             │
│  │ arrives  │    Host: "Welcome! Your server will be right with you."       │
│  └──────────┘                                                               │
│       │                                                                      │
│       ▼                                                                      │
│  2. FIRST ORDER                                                              │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ Server: "Can I get you started with drinks?"                 │           │
│  │ Customer: "I'll have a margarita"                            │           │
│  │ Server: "Perfect! Would you like Express Checkout today?     │           │
│  │          I'll set up your card so you can leave whenever     │           │
│  │          you're ready - no waiting for the check!"           │           │
│  └──────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       ├──→ [YES] ──→ Continue to Step 3                                     │
│       │                                                                      │
│       └──→ [NO]  ──→ Traditional service (pay at end manually)              │
│                                                                              │
│  3. CARD CAPTURE                                                             │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ Server brings handheld terminal to table                     │           │
│  │ Server: "Just tap or insert your card - you'll keep it       │           │
│  │          with you the whole time"                            │           │
│  │                                                               │           │
│  │ [Customer taps card / Apple Pay / Google Pay]                │           │
│  │                                                               │           │
│  │ Terminal displays: "Express Checkout activated! ✓"           │           │
│  │ Server: "You're all set! I'll get that margarita started"    │           │
│  └──────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       ▼                                                                      │
│  4. DURING VISIT                                                             │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ • All orders automatically added to tab                       │           │
│  │ • Customer can view tab anytime via:                          │           │
│  │   - QR code on table → opens tab in browser                  │           │
│  │   - Ask server for current total                              │           │
│  │   - SMS link sent after card capture                          │           │
│  │ • Optional: Mid-meal pulse check via SMS                      │           │
│  │   "How's everything so far? 👍 👎"                            │           │
│  └──────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       ▼                                                                      │
│  5. DEPARTURE (3 Options)                                                    │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ OPTION A: "Just Walk Out"                                     │           │
│  │ • Customer simply leaves when ready                           │           │
│  │ • System detects table cleared (POS marked / server input)    │           │
│  │ • Auto-charge with default tip (set by customer preference)   │           │
│  │ • Receipt sent via SMS/email within 2 minutes                 │           │
│  │                                                               │           │
│  │ OPTION B: Self-Checkout via Phone                             │           │
│  │ • Customer opens tab link on phone                            │           │
│  │ • Reviews itemized bill                                       │           │
│  │ • Adjusts tip amount                                          │           │
│  │ • Taps "Close Tab" → Charged → Receipt displayed              │           │
│  │                                                               │           │
│  │ OPTION C: Traditional Close with Server                       │           │
│  │ • Customer: "Can I get the check?"                            │           │
│  │ • Server closes tab on terminal                               │           │
│  │ • Customer confirms tip on handheld                           │           │
│  │ • Done - no card needed again                                 │           │
│  └──────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       ▼                                                                      │
│  6. POST-VISIT                                                               │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ • Digital receipt sent (itemized)                             │           │
│  │ • Feedback request: "How was your experience?" (optional)     │           │
│  │ • Invitation to create Crowdiant account for faster           │           │
│  │   checkout next time                                          │           │
│  │ • Pre-auth hold released (if charge was less than hold)       │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Journey B: Returning Crowdiant Member

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CROWDIANT MEMBER JOURNEY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. ARRIVAL + RECOGNITION                                                    │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ Customer checks in via:                                       │           │
│  │ • App check-in (tap "I'm here" at venue)                      │           │
│  │ • QR code scan at host stand                                  │           │
│  │ • Automatic (Bluetooth/WiFi proximity for opted-in users)     │           │
│  │                                                               │           │
│  │ Host sees on screen:                                          │           │
│  │ ┌─────────────────────────────────────────┐                  │           │
│  │ │ 🌟 CROWDIANT MEMBER                     │                  │           │
│  │ │ Bradley F.                               │                  │           │
│  │ │ Visits: 12 | Avg spend: $87              │                  │           │
│  │ │ Preferences: Booth, Sparkling water      │                  │           │
│  │ │ Allergies: Shellfish ⚠️                  │                  │           │
│  │ │ Trust Level: ⭐⭐⭐⭐ (No pre-auth needed)  │                  │           │
│  │ └─────────────────────────────────────────┘                  │           │
│  │                                                               │           │
│  │ Host: "Welcome back, Bradley! Your usual booth?"              │           │
│  └──────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       ▼                                                                      │
│  2. AUTOMATIC TAB OPENING                                                    │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ • Tab opens automatically when seated                         │           │
│  │ • Payment method on file (no card needed)                     │           │
│  │ • Trust level = no pre-auth hold required                     │           │
│  │ • Server alerted to preferences on their device               │           │
│  │                                                               │           │
│  │ Server arrives: "Hi Bradley! Sparkling water to start?        │           │
│  │                  Your tab's already open - just order         │           │
│  │                  whenever you're ready."                      │           │
│  └──────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       ▼                                                                      │
│  3. FRICTIONLESS ORDERING                                                    │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ • Order via server OR app OR QR code - all same tab           │           │
│  │ • Past favorites suggested: "Your usual chicken tacos?"       │           │
│  │ • Dietary restrictions auto-flagged to kitchen                │           │
│  │ • Real-time tab visible in app                                │           │
│  └──────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       ▼                                                                      │
│  4. DEPARTURE                                                                │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ • Customer simply leaves (default tip auto-applied)           │           │
│  │ • OR adjusts tip in app before leaving                        │           │
│  │ • OR waves at server: "Thanks!" → Server closes tab           │           │
│  │                                                               │           │
│  │ Push notification: "Thanks for visiting! Receipt attached.    │           │
│  │                     You earned 87 points today! ⭐"            │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Journey C: Group/Party Handling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GROUP DINING JOURNEY                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCENARIO: Table of 6, mix of members and first-timers                       │
│                                                                              │
│  1. GROUP CHECK-IN OPTIONS                                                   │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ Server: "How would you like to handle the tab tonight?"       │           │
│  │                                                               │           │
│  │ OPTION A: Single Tab (One Payer)                              │           │
│  │ • One person sets up Express Checkout                         │           │
│  │ • All orders go to single tab                                 │           │
│  │ • Pre-auth = estimated total ($50 x 6 = $300)                 │           │
│  │                                                               │           │
│  │ OPTION B: Split Tabs (Individual)                             │           │
│  │ • Each person sets up own Express Checkout                    │           │
│  │ • Server assigns items to correct tab during ordering         │           │
│  │ • "That's on Bradley's tab" / "Mine please"                   │           │
│  │                                                               │           │
│  │ OPTION C: Split at End                                        │           │
│  │ • Single tab during meal                                      │           │
│  │ • Split evenly or by item at checkout                         │           │
│  │ • Each person pays their portion via phone                    │           │
│  │   (QR code → select your items → pay your share)              │           │
│  └──────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       ▼                                                                      │
│  2. MIXED MEMBER HANDLING                                                    │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ If host is Crowdiant member:                                  │           │
│  │ • "I'll put this on my account" → No cards needed from group  │           │
│  │ • Group members can Venmo/settle outside system               │           │
│  │                                                               │           │
│  │ If mixed group:                                               │           │
│  │ • Members: Auto-recognized, no pre-auth                       │           │
│  │ • Non-members: Standard card pre-auth                         │           │
│  │ • Invite sent to non-members: "Join Crowdiant for faster      │           │
│  │   checkout next time!"                                        │           │
│  └──────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       ▼                                                                      │
│  3. GROUP CHECKOUT                                                           │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ Split by Item (via phone):                                    │           │
│  │ ┌─────────────────────────────────────────┐                  │           │
│  │ │ TABLE 12 - Select Your Items            │                  │           │
│  │ │                                          │                  │           │
│  │ │ □ Margarita - $14         [Bradley]     │                  │           │
│  │ │ ☑ Chicken Tacos - $18     [You]         │                  │           │
│  │ │ ☑ Side Guac - $6          [You]         │                  │           │
│  │ │ □ Steak Fajitas - $28     [Sarah]       │                  │           │
│  │ │ ☑ Churros (shared) - $4   [Split 3-way] │                  │           │
│  │ │                                          │                  │           │
│  │ │ Your Total: $25.33                       │                  │           │
│  │ │ Tip: [15%] [18%] [20%] [Custom]         │                  │           │
│  │ │                                          │                  │           │
│  │ │ [Pay $30.40]                             │                  │           │
│  │ └─────────────────────────────────────────┘                  │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Staff Experience Design

### Server Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SERVER HANDHELD INTERFACE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  HOME SCREEN - My Tables                                                     │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │  TABLE 5        TABLE 8        TABLE 12       TABLE 15      │            │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │            │
│  │  │ 2 guests│   │ 4 guests│   │ 🌟 VIP  │   │ 6 guests│     │            │
│  │  │ $47.50  │   │ $123.00 │   │ Bradley │   │ $234.50 │     │            │
│  │  │ ✓ ExpCO │   │ ✓ ExpCO │   │ $67.00  │   │ ⚠ NoAuth│     │            │
│  │  │ 45 min  │   │ 1h 20m  │   │ ✓ Member│   │ 2h 10m  │     │            │
│  │  └─────────┘   └─────────┘   └─────────┘   └─────────┘     │            │
│  │                                                             │            │
│  │  Legend: ✓ ExpCO = Express Checkout active                  │            │
│  │          🌟 VIP = Crowdiant member                          │            │
│  │          ⚠ NoAuth = Traditional payment (no pre-auth)       │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  TAP TABLE → TABLE DETAIL SCREEN                                             │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │  TABLE 12 - Bradley F. 🌟                                    │            │
│  │  ──────────────────────────────────────                      │            │
│  │  Preferences: Booth, Sparkling water                         │            │
│  │  Allergies: ⚠️ SHELLFISH                                     │            │
│  │  Notes: Regular - knows menu well                            │            │
│  │  ──────────────────────────────────────                      │            │
│  │                                                               │            │
│  │  CURRENT TAB                          Status: EXPRESS ✓      │            │
│  │  1x Sparkling Water      $0.00        (complimentary)        │            │
│  │  1x Chicken Tacos        $18.00                              │            │
│  │  1x House Margarita      $14.00                              │            │
│  │  1x Churros              $12.00       ← NEW (kitchen fired)  │            │
│  │  ──────────────────────────────────────                      │            │
│  │  Subtotal:               $44.00                              │            │
│  │  Tax:                    $3.96                               │            │
│  │  ──────────────────────────────────────                      │            │
│  │  TOTAL:                  $47.96                              │            │
│  │                                                               │            │
│  │  [+ Add Item]  [Transfer Item]  [Apply Discount]            │            │
│  │                                                               │            │
│  │  [Close Tab]   [Print Check]   [Send to Phone]              │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Express Checkout Setup Flow (Server)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SETTING UP EXPRESS CHECKOUT                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: Select Table → Tap "Setup Express Checkout"                         │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │  EXPRESS CHECKOUT SETUP                                      │            │
│  │                                                               │            │
│  │  Pre-auth amount: [$100] ← Auto-suggested based on venue type │            │
│  │                                                               │            │
│  │  [Tap/Insert Card]  [Scan QR]  [Member Lookup]               │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  STEP 2: Customer taps card on handheld                                      │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │  Processing...                                                │            │
│  │                                                               │            │
│  │  ✓ Card verified: Visa •••• 4521                             │            │
│  │  ✓ Pre-auth approved: $100.00                                │            │
│  │  ✓ Receipt delivery: SMS to (555) 123-4567                   │            │
│  │                                                               │            │
│  │  [DONE - Express Checkout Active]                            │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  DECLINED CARD HANDLING:                                                     │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │  ⚠️ Card Declined                                            │            │
│  │                                                               │            │
│  │  Suggested script: "That card didn't go through -            │            │
│  │  would you like to try another one?"                         │            │
│  │                                                               │            │
│  │  [Try Different Card]  [Lower Pre-Auth]  [Skip Express]      │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Manager Dashboard - Express Checkout Monitoring

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MANAGER DASHBOARD                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  EXPRESS CHECKOUT STATUS                          Tonight: 87% adoption      │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                                                               │            │
│  │  ACTIVE TABS (Express)     TRADITIONAL TABS    ALERTS        │            │
│  │  ━━━━━━━━━━━━━━━━━━━━     ━━━━━━━━━━━━━━━━   ━━━━━━━━       │            │
│  │  23 tables                 4 tables            2 items       │            │
│  │  $3,450 open               $890 open                         │            │
│  │                                                               │            │
│  │  ⚠️ ATTENTION NEEDED:                                        │            │
│  │  ┌───────────────────────────────────────────────────────┐  │            │
│  │  │ Table 22 - Tab exceeds pre-auth                       │  │            │
│  │  │ Pre-auth: $100 | Current tab: $147                    │  │            │
│  │  │ [Request Additional Auth] [Override & Allow]          │  │            │
│  │  └───────────────────────────────────────────────────────┘  │            │
│  │  ┌───────────────────────────────────────────────────────┐  │            │
│  │  │ Table 9 - No activity 45 min (tab open)               │  │            │
│  │  │ Last order: 7:45 PM | Tab: $67.50                     │  │            │
│  │  │ [Check on Table] [Send Reminder SMS] [Keep Watching]  │  │            │
│  │  └───────────────────────────────────────────────────────┘  │            │
│  │                                                               │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  WALK-AWAY PREVENTION STATS (This Month)                                     │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │  Walk-aways prevented:     47 (auto-charged)                 │            │
│  │  Revenue recovered:        $2,847                            │            │
│  │  Avg recovery per incident: $60.57                           │            │
│  │  Disputes filed:           2 (both resolved favorably)       │            │
│  │  Previous month walk-away loss: $3,200 (now $0!)             │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 3: Technical Payment Integration Requirements

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PAYMENT INTEGRATION ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         ┌─────────────────┐                                  │
│                         │   CROWDIANT     │                                  │
│                         │   CLOUD CORE    │                                  │
│                         └────────┬────────┘                                  │
│                                  │                                           │
│            ┌─────────────────────┼─────────────────────┐                    │
│            │                     │                     │                    │
│            ▼                     ▼                     ▼                    │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│   │ PAYMENT GATEWAY │   │  TAB MANAGEMENT │   │ CUSTOMER VAULT  │          │
│   │    SERVICE      │   │     SERVICE     │   │    SERVICE      │          │
│   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘          │
│            │                     │                     │                    │
│            │              ┌──────┴──────┐              │                    │
│            │              │             │              │                    │
│            ▼              ▼             ▼              ▼                    │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │                 PAYMENT PROCESSOR ABSTRACTION               │          │
│   │                                                              │          │
│   │  Supported Processors:                                       │          │
│   │  • Stripe (Primary)                                         │          │
│   │  • Square                                                    │          │
│   │  • Adyen                                                     │          │
│   │  • Worldpay                                                  │          │
│   │  • First Data                                                │          │
│   │  • PayPal/Braintree                                          │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                                  │                                           │
│            ┌─────────────────────┼─────────────────────┐                    │
│            ▼                     ▼                     ▼                    │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│   │   Card Reader   │   │   Mobile App    │   │   Online/QR     │          │
│   │   Terminals     │   │   Payments      │   │   Payments      │          │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## API Specifications

### Pre-Authorization API

```yaml
# Create Pre-Authorization
POST /api/v1/tabs/preauth
Request:
  venue_id: string (required)
  table_id: string (required)
  payment_method:
    type: "card_present" | "card_on_file" | "mobile_wallet"
    token: string (from terminal/vault)
  amount: integer (cents)
  currency: string (default: "USD")
  customer_id: string (optional - for members)
  metadata:
    server_id: string
    party_size: integer
    
Response:
  preauth_id: string
  status: "approved" | "declined" | "pending"
  approved_amount: integer
  expires_at: timestamp
  tab_id: string
  customer:
    masked_card: "•••• 4521"
    card_brand: "visa"
    phone_last4: "4567" (for SMS)
    
# Capture/Settle Pre-Authorization
POST /api/v1/tabs/{tab_id}/capture
Request:
  amount: integer (actual charge amount)
  tip_amount: integer
  itemized_receipt: array
  auto_close: boolean
  
Response:
  charge_id: string
  status: "captured" | "partial" | "failed"
  receipt_url: string
  
# Release Pre-Authorization (no charge)
POST /api/v1/tabs/{tab_id}/release
Request:
  reason: "customer_request" | "manager_override" | "error"
  
Response:
  status: "released"
  release_time: timestamp
```

### Tab Management API

```yaml
# Open Tab
POST /api/v1/tabs
Request:
  venue_id: string
  table_id: string
  preauth_id: string (optional - can open tab first, auth later)
  customer_id: string (optional)
  party_size: integer
  
Response:
  tab_id: string
  status: "open"
  qr_code_url: string (customer self-service)
  sms_link_sent: boolean
  
# Add Item to Tab
POST /api/v1/tabs/{tab_id}/items
Request:
  items: array
    - menu_item_id: string
      quantity: integer
      modifiers: array
      notes: string
      assigned_to: string (for split tabs)
      
Response:
  tab_total: integer
  preauth_remaining: integer
  alert: string (if approaching/exceeding preauth)
  
# Close Tab
POST /api/v1/tabs/{tab_id}/close
Request:
  close_type: "server" | "customer_self" | "auto_walkaway"
  tip_amount: integer
  tip_percentage: float (alternative)
  split_method: "single" | "even" | "by_item"
  
Response:
  final_amount: integer
  charge_status: "success" | "failed"
  receipt_delivery: "sms" | "email" | "both"
```

### Webhook Events

```yaml
# Crowdiant sends these webhooks to venue systems
Events:
  - preauth.approved
  - preauth.declined
  - preauth.expiring (24h before expiry)
  - tab.opened
  - tab.item_added
  - tab.approaching_limit (80% of preauth)
  - tab.exceeds_limit
  - tab.inactive_warning (no activity 30+ min)
  - tab.auto_close_pending (walkaway detection)
  - tab.closed
  - tab.disputed
  - customer.identified (member check-in)
```

## Security & Compliance

### PCI DSS Compliance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PCI COMPLIANCE ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CARDHOLDER DATA ENVIRONMENT (CDE)                                          │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                                                               │            │
│  │  Card data NEVER touches Crowdiant servers                   │            │
│  │                                                               │            │
│  │  Flow:                                                        │            │
│  │  1. Card reader encrypts at point of interaction (P2PE)      │            │
│  │  2. Encrypted payload sent directly to processor             │            │
│  │  3. Processor returns token to Crowdiant                     │            │
│  │  4. Crowdiant stores only token (not card data)              │            │
│  │                                                               │            │
│  │  ┌─────────┐      ┌─────────┐      ┌─────────┐              │            │
│  │  │ Card    │ ───► │ P2PE    │ ───► │Processor│              │            │
│  │  │ Reader  │      │ Device  │      │ (Stripe)│              │            │
│  │  └─────────┘      └─────────┘      └────┬────┘              │            │
│  │                                          │                    │            │
│  │                                          ▼                    │            │
│  │                                    ┌─────────┐               │            │
│  │                                    │  Token  │               │            │
│  │                                    │  Only   │ ───► Crowdiant│            │
│  │                                    └─────────┘               │            │
│  │                                                               │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  COMPLIANCE REQUIREMENTS:                                                    │
│  • SAQ A-EP (if using hosted payment pages)                                 │
│  • SAQ B-IP (if using P2PE validated devices)                               │
│  • Annual penetration testing                                                │
│  • Quarterly vulnerability scans                                             │
│  • Employee security training                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Privacy (Customer Vault)

```yaml
Customer Vault Security:
  Encryption:
    at_rest: AES-256
    in_transit: TLS 1.3
    
  Data Stored:
    - Customer ID (internal)
    - Payment token (processor-specific)
    - Masked card (last 4 + brand)
    - Billing postal code (for AVS)
    - Phone (hashed, for SMS delivery)
    - Email (hashed, for receipt delivery)
    
  Data NOT Stored:
    - Full card number (PAN)
    - CVV/CVC
    - Magnetic stripe data
    - PIN
    
  Retention Policy:
    active_customers: indefinite (while account active)
    inactive_customers: 2 years then delete
    transaction_logs: 7 years (regulatory)
    
  Customer Rights (GDPR/CCPA):
    - Right to access their data
    - Right to deletion
    - Right to portability
    - Right to opt-out of sale
```

---

# PART 4: Reputation & Trust Scoring System

## Trust Level Framework

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TRUST LEVEL SYSTEM                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LEVEL 0: UNKNOWN (First-Time Guest)                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                          │
│  • No Crowdiant history                                                      │
│  • REQUIRES: Full pre-authorization                                          │
│  • Pre-auth amount: Venue default ($50-$200)                                │
│  • Experience: Standard Express Checkout                                     │
│                                                                              │
│  LEVEL 1: NEW MEMBER (1-3 visits)                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                            │
│  • Account created, card on file                                             │
│  • REQUIRES: Reduced pre-authorization                                       │
│  • Pre-auth amount: 50% of venue default                                    │
│  • Benefit: Faster check-in, preferences saved                              │
│  • Points: 1x earning rate                                                   │
│                                                                              │
│  LEVEL 2: REGULAR (4-10 visits, no issues)                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                    │
│  • Proven payment history                                                    │
│  • REQUIRES: Minimal pre-authorization ($25 flat)                           │
│  • Benefits:                                                                 │
│    - Auto-recognition at check-in                                           │
│    - Preference sync across venues                                          │
│    - Priority seating on waitlist                                           │
│  • Points: 1.25x earning rate                                               │
│                                                                              │
│  LEVEL 3: TRUSTED (11-25 visits, $500+ total spend)                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                           │
│  • Strong positive history                                                   │
│  • REQUIRES: NO pre-authorization                                           │
│  • Benefits:                                                                 │
│    - Just Walk Out enabled                                                   │
│    - Cross-venue trust transfer                                             │
│    - Complimentary perks (venue discretion)                                 │
│  • Points: 1.5x earning rate                                                │
│                                                                              │
│  LEVEL 4: VIP (25+ visits, $2000+ spend, venue nominated)                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                       │
│  • Top-tier customer                                                         │
│  • REQUIRES: Nothing - full trust                                           │
│  • Benefits:                                                                 │
│    - White glove treatment                                                   │
│    - Credit line available (charge now, pay later)                          │
│    - VIP event invitations                                                   │
│    - Personal account manager                                                │
│  • Points: 2x earning rate                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Trust Score Calculation

```yaml
Trust Score Components (1000 point scale):

BASE SCORE:
  account_age:
    0-30 days: 0 points
    31-90 days: 50 points
    91-180 days: 100 points
    181-365 days: 150 points
    1+ year: 200 points
    
VISIT HISTORY (max 300 points):
  visits:
    per_visit: +10 points
    max: 300 points (30 visits)
    
PAYMENT HISTORY (max 300 points):
  successful_payments:
    per_payment: +15 points
  chargebacks:
    per_chargeback: -200 points
  disputes:
    per_dispute_filed: -50 points
    per_dispute_resolved_favorably: +25 points (recover)
    
SPENDING BEHAVIOR (max 200 points):
  lifetime_spend:
    $0-100: 0 points
    $101-500: 50 points
    $501-1000: 100 points
    $1001-2500: 150 points
    $2500+: 200 points
    
BONUS FACTORS:
  referred_friends: +25 points per referral (max 100)
  feedback_provided: +5 points per review (max 50)
  app_engagement: +10 points per month active
  
PENALTY FACTORS:
  walkaway_auto_charged: -100 points per incident
  payment_declined: -25 points per decline
  reservation_no_show: -50 points per no-show

TRUST LEVEL THRESHOLDS:
  Level 0: 0-99 (or no account)
  Level 1: 100-299
  Level 2: 300-549
  Level 3: 550-799
  Level 4: 800+ (plus venue nomination)
```

## Cross-Venue Trust Transfer

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CROSS-VENUE TRUST NETWORK                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCENARIO: Customer has Level 3 trust at Venue A, visits Venue B first time │
│                                                                              │
│  TRUST INHERITANCE RULES:                                                    │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                                                               │            │
│  │  Customer Trust at Origin: Level 3 (Score: 650)              │            │
│  │                                                               │            │
│  │  Transfer to New Venue:                                       │            │
│  │  • Inherit 70% of trust score: 650 × 0.7 = 455               │            │
│  │  • New venue effective level: Level 2                         │            │
│  │  • Pre-auth required: Reduced ($25 vs full)                  │            │
│  │                                                               │            │
│  │  After first successful visit at Venue B:                     │            │
│  │  • Trust score at Venue B: 455 + 25 (visit bonus) = 480      │            │
│  │  • Level at Venue B: Level 2 (confirmed)                      │            │
│  │  • Network score updated: Original venues see positive signal │            │
│  │                                                               │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  VENUE CONTROLS:                                                             │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                                                               │            │
│  │  Each venue can configure:                                    │            │
│  │  • Accept network trust: Yes/No (default: Yes)               │            │
│  │  • Trust inheritance rate: 50%-100% (default: 70%)           │            │
│  │  • Minimum level for no pre-auth: Level 2/3/4 (default: 3)   │            │
│  │  • VIP nomination required: Yes/No for Level 4                │            │
│  │                                                               │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 5: Customer Communication & Marketing

## Brand Messaging Framework

### Core Value Proposition

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXPRESS CHECKOUT MESSAGING                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRIMARY MESSAGE (Customer-Facing):                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                          │
│  "Leave when you're ready. No waiting for the check."                        │
│                                                                              │
│  SUPPORTING MESSAGES:                                                        │
│  • "Your time is valuable. Express Checkout means no more flagging          │
│     down your server or waiting 10 minutes to pay."                         │
│  • "Dine freely. We've got the check covered."                              │
│  • "The only thing you should wait for is your food."                       │
│                                                                              │
│  TRUST-BUILDING MESSAGES:                                                    │
│  • "Just like checking into a hotel - we verify your card but don't        │
│     charge until you're done."                                              │
│  • "You keep your card. We keep it simple."                                 │
│  • "Your card stays in your wallet where it belongs."                       │
│                                                                              │
│  VIP/MEMBER MESSAGES:                                                        │
│  • "Crowdiant members just walk in, enjoy, and leave. We handle            │
│     everything else."                                                        │
│  • "Your reputation precedes you. No card needed."                          │
│  • "Welcome back. Your tab's already open."                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Customer Touchpoint Scripts

#### 1. First-Time Express Checkout Enrollment

**Server Script:**
> "Would you like Express Checkout today? I'll set up your card so you can leave whenever you're ready - no waiting for the check. Your card stays with you the whole time."

**If customer hesitates:**
> "It works just like checking into a hotel - we verify your card but only charge your actual bill when you close out. You can pay from your phone, with me, or just head out and we'll send the receipt."

**Post-enrollment confirmation (SMS):**
```
Welcome to Express Checkout at [Venue Name]! 🎉

Your tab is open and ready. When you're done:
• Just leave - we'll charge your card automatically
• Or tap here to review & pay: [link]

Current tab: $0.00
Questions? Show this to your server.
```

#### 2. During-Visit Communications

**Tab update (sent on request or every $50):**
```
Your tab at [Venue Name]: $67.50

View details: [link]
Add tip preference: [link]

Enjoying your visit? Reply 👍 or 👎
```

**Mid-meal satisfaction check:**
```
Quick check-in from [Venue Name]! 

How's everything so far?
👍 Great!
😐 It's okay  
👎 Need help

[Current tab: $45.00]
```

#### 3. Departure & Post-Visit

**Auto-close notification:**
```
Thanks for dining with us! 🙏

Your bill: $87.50
Tip (18%): $15.75
Total charged: $103.25

Receipt: [link]
Feedback? [link]

See you next time!
```

**Invitation to create account:**
```
You just used Express Checkout at [Venue Name]!

Want faster service everywhere? Join Crowdiant:
✓ Skip the card step at 500+ restaurants
✓ Earn points on every visit
✓ Your preferences remembered everywhere

[Create Free Account] - takes 30 seconds
```

### Venue Marketing Materials

#### Table Tent / QR Display

```
┌─────────────────────────────────────┐
│                                     │
│     ⚡ EXPRESS CHECKOUT ⚡          │
│                                     │
│   Skip the wait. Leave when ready.  │
│                                     │
│   Ask your server to set up         │
│   Express Checkout, or scan:        │
│                                     │
│         ┌─────────────┐             │
│         │   QR CODE   │             │
│         │             │             │
│         └─────────────┘             │
│                                     │
│   Your card stays with you.         │
│   Pay from your phone anytime.      │
│                                     │
│        Powered by Crowdiant         │
│                                     │
└─────────────────────────────────────┘
```

#### Email Campaign - Member Acquisition

**Subject:** "Never wait for the check again"

```
Hi [Name],

You recently dined at [Venue Name] and used Express Checkout.

What if every restaurant worked like that?

With Crowdiant, you get:

🚀 INSTANT CHECK-IN
   Walk in, get recognized, start ordering.

💳 NO CARD NEEDED  
   After a few visits, your reputation speaks for itself.

🎁 REWARDS EVERYWHERE
   Earn points at 500+ restaurants in the network.

📱 PAY YOUR WAY
   Leave anytime. Adjust tip from your phone. Done.

[Join Crowdiant Free →]

Already have 2 visits at network restaurants - 
you're halfway to Level 2 status!

Cheers,
The Crowdiant Team
```

### Objection Handling Scripts

```yaml
Common Customer Objections:

"I don't want a hold on my card":
  Response: "Totally understand! The hold is just like a hotel - it 
            releases automatically when you pay, usually within minutes 
            for most banks. You can also choose traditional checkout 
            if you prefer."
            
"What if you charge me wrong?":
  Response: "Great question! You'll get an itemized receipt instantly, 
            and you can review your tab anytime on your phone before 
            we close it. Any issues, we fix them right away."
            
"I want to see the bill first":
  Response: "Absolutely! Express Checkout doesn't mean automatic - 
            you can review everything on your phone and adjust the 
            tip before closing. You're always in control."
            
"What if I lose my phone?":
  Response: "No problem - just ask any server and they can close your 
            tab for you, show you the total, whatever you need. The 
            app is just for convenience, not required."

"I don't trust this":
  Response: "I get it - it's new! Think of it like Uber or a hotel. 
            Your card is on file, we only charge what you actually 
            order, and you get a receipt right away. You can always 
            choose traditional checkout if you prefer."
```

---

## Implementation Roadmap

### Phase 1: Foundation (MVP)
- [ ] Basic pre-authorization flow
- [ ] Tab management
- [ ] Server handheld interface
- [ ] SMS receipt delivery
- [ ] Manual close (server-initiated)

### Phase 2: Self-Service
- [ ] Customer web interface (QR code)
- [ ] Self-service tab close
- [ ] Tip adjustment
- [ ] Mid-meal tab viewing

### Phase 3: Automation
- [ ] Walk-away detection
- [ ] Auto-close logic
- [ ] Inactivity alerts
- [ ] Over-auth handling

### Phase 4: Membership
- [ ] Customer accounts
- [ ] Trust scoring system
- [ ] Card-on-file vault
- [ ] Cross-venue recognition

### Phase 5: VIP Experience
- [ ] Trust level inheritance
- [ ] No-auth for trusted members
- [ ] Just Walk Out capability
- [ ] Personalization engine

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-25 | BMad Master / Bradley | Initial deep dive document |
| 2025-11-25 | BMad Master / Bradley | Added UX flows, technical specs, trust system, marketing |

---

_Part of Crowdiant Restaurant OS - Card-Holding Express Checkout Feature_
