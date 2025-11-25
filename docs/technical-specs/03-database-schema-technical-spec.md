# Database Schema - Prisma Technical Specification

**Component:** Complete Database Schema
**Version:** 1.0
**Date:** 2025-11-25
**Author:** Database Architect

---

## Overview

Complete Prisma schema for Crowdiant Restaurant OS implementing multi-tenant SaaS architecture with PostgreSQL Row Level Security.

---

## Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema", "postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")  // For migrations
  extensions = [pgcrypto, postgis]
  schemas    = ["public", "audit"]
}

// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================

model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime? @map("email_verified")
  image         String?
  phone         String?   @unique
  phoneVerified DateTime? @map("phone_verified")
  
  // Role determines access level
  role          UserRole  @default(CUSTOMER)
  
  // Account status
  status        UserStatus @default(ACTIVE)
  
  // Timestamps
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  lastLoginAt   DateTime? @map("last_login_at")
  
  // Relations
  accounts      Account[]
  sessions      Session[]
  
  // Multi-tenant associations
  venueStaff    VenueStaff[]  // Staff can work at multiple venues
  
  // Customer-specific
  tabs          Tab[]         @relation("CustomerTabs")
  servedTabs    Tab[]         @relation("ServerTabs")
  trustScores   TrustScore[]
  trustIncidents TrustIncident[]
  trustEvents   TrustEvent[]
  loyaltyAccounts LoyaltyAccount[]
  reservations  Reservation[]
  reviews       Review[]
  
  // Payment methods
  stripeCustomerId String? @unique @map("stripe_customer_id")
  paymentMethods   PaymentMethod[]
  
  @@map("users")
}

enum UserRole {
  CUSTOMER      // End customers
  SERVER        // Wait staff
  KITCHEN       // Kitchen staff
  MANAGER       // Venue managers
  ADMIN         // Platform admins
  SUPPORT       // Customer support
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  BANNED
  DELETED
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ============================================================================
// VENUES (RESTAURANTS)
// ============================================================================

model Venue {
  id          String   @id @default(cuid())
  
  // Basic info
  name        String
  slug        String   @unique
  description String?  @db.Text
  logo        String?
  
  // Contact
  email       String
  phone       String
  website     String?
  
  // Address
  address     String
  city        String
  state       String
  postalCode  String   @map("postal_code")
  country     String   @default("US")
  latitude    Float?
  longitude   Float?
  timezone    String   @default("America/New_York")
  
  // Venue type
  type        VenueType
  cuisine     String[]  // Array of cuisine types
  
  // Business info
  taxRate     Float     @default(0.07)  // 7% default
  currency    String    @default("USD")
  
  // Operating hours (JSON structure)
  hours       Json?     // { monday: { open: "11:00", close: "22:00" }, ... }
  
  // Express Checkout settings
  expressCheckoutEnabled Boolean @default(true) @map("express_checkout_enabled")
  preAuthAmountCents     Int     @default(5000) @map("pre_auth_amount_cents")  // $50 default
  walkAwayGraceMinutes   Int     @default(15)   @map("walk_away_grace_minutes")
  
  // Stripe Connect
  stripeAccountId        String? @unique @map("stripe_account_id")
  stripeOnboarded        Boolean @default(false) @map("stripe_onboarded")
  
  // Features & subscription
  subscriptionTier       SubscriptionTier @default(STARTER)
  subscriptionStatus     SubscriptionStatus @default(TRIALING)
  trialEndsAt           DateTime? @map("trial_ends_at")
  
  // Status
  status      VenueStatus @default(ACTIVE)
  
  // Timestamps
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  staff       VenueStaff[]
  tables      Table[]
  menuCategories MenuCategory[]
  menuItems   MenuItem[]
  tabs        Tab[]
  trustScores TrustScore[]
  trustIncidents TrustIncident[]
  loyaltyPrograms LoyaltyProgram[]
  reservations Reservation[]
  reviews     Review[]
  inventory   InventoryItem[]
  suppliers   Supplier[]
  
  @@index([slug])
  @@index([city, state])
  @@index([type])
  @@map("venues")
}

enum VenueType {
  FAST_CASUAL
  CASUAL_DINING
  FINE_DINING
  FOOD_TRUCK
  BAR
  CAFE
  BAKERY
  BUFFET
  POP_UP
}

enum VenueStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  ARCHIVED
}

enum SubscriptionTier {
  STARTER       // $99/mo - Single location
  PROFESSIONAL  // $249/mo - Up to 5 locations
  ENTERPRISE    // Custom - Unlimited + white label
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  UNPAID
}

model VenueStaff {
  id          String   @id @default(cuid())
  venueId     String   @map("venue_id")
  userId      String   @map("user_id")
  
  // Role at this venue
  role        StaffRole
  
  // Permissions (bitfield or JSON)
  permissions Json?
  
  // Employment info
  employeeId  String?  @map("employee_id")  // Venue's internal ID
  hourlyRate  Int?     @map("hourly_rate")  // Cents per hour
  
  // Status
  status      StaffStatus @default(ACTIVE)
  
  // Timestamps
  hiredAt     DateTime @default(now()) @map("hired_at")
  terminatedAt DateTime? @map("terminated_at")
  
  // Relations
  venue       Venue    @relation(fields: [venueId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([venueId, userId])
  @@index([venueId, status])
  @@map("venue_staff")
}

enum StaffRole {
  OWNER
  MANAGER
  ASSISTANT_MANAGER
  SERVER
  BARTENDER
  HOST
  KITCHEN_MANAGER
  CHEF
  LINE_COOK
  PREP_COOK
  DISHWASHER
  BUSSER
}

enum StaffStatus {
  ACTIVE
  ON_LEAVE
  TERMINATED
}

// ============================================================================
// TABLES & SEATING
// ============================================================================

model Table {
  id          String      @id @default(cuid())
  venueId     String      @map("venue_id")
  
  // Table identification
  number      String      // "A1", "Bar-3", "Patio-12"
  name        String?     // Optional friendly name
  
  // Capacity
  minCapacity Int         @default(2) @map("min_capacity")
  maxCapacity Int         @map("max_capacity")
  
  // Location within venue
  section     String?     // "Main Dining", "Bar", "Patio"
  floor       String?     // "First Floor", "Rooftop"
  
  // Table status
  status      TableStatus @default(AVAILABLE)
  
  // QR code for Express Checkout
  qrCodeUrl   String?     @map("qr_code_url")
  
  // Timestamps
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  
  // Relations
  venue       Venue       @relation(fields: [venueId], references: [id], onDelete: Cascade)
  tabs        Tab[]
  reservations Reservation[]
  
  @@unique([venueId, number])
  @@index([venueId, status])
  @@map("tables")
}

enum TableStatus {
  AVAILABLE
  OCCUPIED
  RESERVED
  DIRTY
  OUT_OF_SERVICE
}

// ============================================================================
// TABS & EXPRESS CHECKOUT
// ============================================================================

model Tab {
  id          String    @id @default(cuid())
  venueId     String    @map("venue_id")
  tableId     String?   @map("table_id")
  serverId    String    @map("server_id")
  customerId  String?   @map("customer_id")
  
  // Tab identification
  tabNumber   Int       @map("tab_number")  // Sequential per venue per day
  
  // Status
  status      TabStatus @default(PENDING_AUTH)
  
  // Payment
  stripePaymentIntentId String? @unique @map("stripe_payment_intent_id")
  preAuthAmountCents    Int     @map("pre_auth_amount_cents")
  
  // Amounts (all in cents)
  subtotalCents         Int     @default(0) @map("subtotal_cents")
  taxCents              Int     @default(0) @map("tax_cents")
  tipCents              Int     @default(0) @map("tip_cents")
  discountCents         Int     @default(0) @map("discount_cents")
  totalCents            Int     @default(0) @map("total_cents")
  
  // Customer access
  accessToken           String? @unique @map("access_token")  // For customer tab view
  
  // Customer contact
  customerPhone         String? @map("customer_phone")
  customerEmail         String? @map("customer_email")
  
  // Walk-away handling
  walkAwayDetectedAt    DateTime? @map("walk_away_detected_at")
  walkAwayNotifiedAt    DateTime? @map("walk_away_notified_at")
  autoCloseScheduledAt  DateTime? @map("auto_close_scheduled_at")
  
  // Timestamps
  openedAt    DateTime  @default(now()) @map("opened_at")
  closedAt    DateTime? @map("closed_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // Relations
  venue       Venue     @relation(fields: [venueId], references: [id], onDelete: Cascade)
  table       Table?    @relation(fields: [tableId], references: [id], onDelete: SetNull)
  server      User      @relation("ServerTabs", fields: [serverId], references: [id], onDelete: Restrict)
  customer    User?     @relation("CustomerTabs", fields: [customerId], references: [id], onDelete: SetNull)
  
  items       TabItem[]
  statusHistory TabStatusHistory[]
  events      TabEvent[]
  
  @@unique([venueId, tabNumber])
  @@index([venueId, status])
  @@index([customerId])
  @@index([serverId])
  @@index([openedAt])
  @@map("tabs")
}

enum TabStatus {
  PENDING_AUTH  // Awaiting pre-authorization
  OPEN          // Active tab, items can be added
  CLOSING       // Close initiated, awaiting tip
  WALK_AWAY     // Customer left, grace period active
  AUTO_CLOSED   // System closed after walk-away
  CLOSED        // Successfully closed
  FAILED        // Pre-auth or payment failed
  CANCELED      // Manually canceled
}

model TabItem {
  id          String    @id @default(cuid())
  tabId       String    @map("tab_id")
  menuItemId  String    @map("menu_item_id")
  
  // Item details (snapshot at time of order)
  name        String
  quantity    Int       @default(1)
  unitPriceCents Int    @map("unit_price_cents")
  totalPriceCents Int   @map("total_price_cents")
  
  // Modifiers (e.g., "No onions", "Extra cheese")
  modifiers   Json?
  
  // Special instructions
  notes       String?   @db.Text
  
  // Kitchen status
  kitchenStatus KitchenStatus @default(PENDING) @map("kitchen_status")
  
  // Coursing
  courseNumber Int?     @map("course_number")
  
  // Timestamps
  orderedAt   DateTime  @default(now()) @map("ordered_at")
  sentToKitchenAt DateTime? @map("sent_to_kitchen_at")
  preparedAt  DateTime? @map("prepared_at")
  deliveredAt DateTime? @map("delivered_at")
  
  // Relations
  tab         Tab       @relation(fields: [tabId], references: [id], onDelete: Cascade)
  menuItem    MenuItem  @relation(fields: [menuItemId], references: [id], onDelete: Restrict)
  
  @@index([tabId])
  @@index([kitchenStatus])
  @@map("tab_items")
}

enum KitchenStatus {
  PENDING       // Not yet sent to kitchen
  SENT          // Sent to kitchen
  IN_PROGRESS   // Being prepared
  READY         // Ready for pickup
  DELIVERED     // Delivered to table
  CANCELED      // Canceled
}

model TabStatusHistory {
  id          String    @id @default(cuid())
  tabId       String    @map("tab_id")
  
  fromStatus  TabStatus @map("from_status")
  toStatus    TabStatus @map("to_status")
  trigger     String    // Event that caused transition
  
  metadata    Json?     // Additional context
  
  timestamp   DateTime  @default(now())
  
  // Relations
  tab         Tab       @relation(fields: [tabId], references: [id], onDelete: Cascade)
  
  @@index([tabId])
  @@map("tab_status_history")
}

model TabEvent {
  id          String    @id @default(cuid())
  tabId       String    @map("tab_id")
  
  eventType   String    @map("event_type")  // "ITEM_ADDED", "CHECK_REQUESTED", etc.
  description String?
  metadata    Json?
  
  timestamp   DateTime  @default(now())
  
  // Relations
  tab         Tab       @relation(fields: [tabId], references: [id], onDelete: Cascade)
  
  @@index([tabId])
  @@index([eventType])
  @@map("tab_events")
}

model TabAccessToken {
  id          String    @id @default(cuid())
  token       String    @unique
  tabId       String    @map("tab_id")
  
  expiresAt   DateTime  @map("expires_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  
  @@index([tabId])
  @@index([expiresAt])
  @@map("tab_access_tokens")
}

// ============================================================================
// MENU MANAGEMENT
// ============================================================================

model MenuCategory {
  id          String    @id @default(cuid())
  venueId     String    @map("venue_id")
  
  name        String
  description String?   @db.Text
  
  // Display order
  sortOrder   Int       @default(0) @map("sort_order")
  
  // Availability
  availableAllDay Boolean @default(true) @map("available_all_day")
  availableFrom   String? @map("available_from")  // "11:00"
  availableTo     String? @map("available_to")    // "22:00"
  
  // Status
  active      Boolean   @default(true)
  
  // Timestamps
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // Relations
  venue       Venue     @relation(fields: [venueId], references: [id], onDelete: Cascade)
  items       MenuItem[]
  
  @@index([venueId, active])
  @@map("menu_categories")
}

model MenuItem {
  id          String    @id @default(cuid())
  venueId     String    @map("venue_id")
  categoryId  String    @map("category_id")
  
  // Basic info
  name        String
  description String?   @db.Text
  priceCents  Int       @map("price_cents")
  
  // Images
  images      String[]  // Array of image URLs
  
  // Dietary info
  vegetarian  Boolean   @default(false)
  vegan       Boolean   @default(false)
  glutenFree  Boolean   @default(false) @map("gluten_free")
  spicy       Boolean   @default(false)
  allergens   String[]  // ["dairy", "nuts", "shellfish"]
  calories    Int?
  
  // Modifiers available
  modifierGroups Json?   @map("modifier_groups")  // Optional add-ons, substitutions
  
  // Inventory tracking
  trackInventory Boolean @default(false) @map("track_inventory")
  inventoryCount Int?    @map("inventory_count")
  
  // Availability
  available   Boolean   @default(true)
  availableDays String[] @map("available_days")  // ["monday", "tuesday", ...]
  
  // Display
  sortOrder   Int       @default(0) @map("sort_order")
  featured    Boolean   @default(false)
  
  // Timestamps
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // Relations
  venue       Venue     @relation(fields: [venueId], references: [id], onDelete: Cascade)
  category    MenuCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  tabItems    TabItem[]
  inventoryLinks InventoryItemLink[]
  
  @@index([venueId, available])
  @@index([categoryId])
  @@map("menu_items")
}

// ============================================================================
// TRUST SCORING SYSTEM
// ============================================================================

model TrustScore {
  id          String    @id @default(cuid())
  customerId  String    @map("customer_id")
  venueId     String    @map("venue_id")
  
  // Current level
  level       Int       @default(0)  // 0-4 (NEW to VIP)
  
  // Score components
  totalPoints Int       @default(0) @map("total_points")
  visitPoints Int       @default(0) @map("visit_points")
  spendPoints Int       @default(0) @map("spend_points")
  tipPoints   Int       @default(0) @map("tip_points")
  recencyPoints Int     @default(0) @map("recency_points")
  incidentPenalty Int   @default(0) @map("incident_penalty")
  
  // History metrics
  visitCount  Int       @default(0) @map("visit_count")
  totalSpentCents Int   @default(0) @map("total_spent_cents")
  avgTipPercent Float   @default(0) @map("avg_tip_percent")
  lastVisitAt DateTime? @map("last_visit_at")
  
  // Manual overrides
  manualOverride Boolean @default(false) @map("manual_override")
  
  // Timestamps
  lastCalculatedAt DateTime @default(now()) @map("last_calculated_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // Relations
  customer    User      @relation(fields: [customerId], references: [id], onDelete: Cascade)
  venue       Venue     @relation(fields: [venueId], references: [id], onDelete: Cascade)
  
  @@unique([customerId, venueId])
  @@index([venueId, level])
  @@index([lastCalculatedAt])
  @@map("trust_scores")
}

model TrustIncident {
  id          String    @id @default(cuid())
  customerId  String    @map("customer_id")
  venueId     String    @map("venue_id")
  
  type        IncidentType
  description String?   @db.Text
  
  // Severity and penalty
  severity    IncidentSeverity
  pointsDeducted Int    @map("points_deducted")
  
  // Context
  tabId       String?   @map("tab_id")
  metadata    Json?
  
  // Resolution
  resolved    Boolean   @default(false)
  resolvedAt  DateTime? @map("resolved_at")
  resolvedBy  String?   @map("resolved_by")
  resolution  String?   @db.Text
  
  date        DateTime  @default(now())
  
  // Relations
  customer    User      @relation(fields: [customerId], references: [id], onDelete: Cascade)
  venue       Venue     @relation(fields: [venueId], references: [id], onDelete: Cascade)
  
  @@index([customerId, venueId])
  @@index([type])
  @@map("trust_incidents")
}

enum IncidentType {
  WALK_AWAY
  PAYMENT_DECLINED
  CHARGEBACK
  COMPLAINT
  LATE_RESPONSE
  FRAUD_SUSPECTED
}

enum IncidentSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model TrustEvent {
  id          String    @id @default(cuid())
  customerId  String    @map("customer_id")
  venueId     String    @map("venue_id")
  
  type        String    // "LEVEL_UP", "LEVEL_DOWN", "VIP_PROMOTION", etc.
  description String?   @db.Text
  
  pointsChange Int      @map("points_change")
  oldLevel    Int?      @map("old_level")
  newLevel    Int?      @map("new_level")
  
  metadata    Json?
  
  createdAt   DateTime  @default(now()) @map("created_at")
  
  // Relations
  customer    User      @relation(fields: [customerId], references: [id], onDelete: Cascade)
  
  @@index([customerId, venueId])
  @@index([createdAt])
  @@map("trust_events")
}

model TrustAdjustment {
  id          String    @id @default(cuid())
  customerId  String    @map("customer_id")
  venueId     String    @map("venue_id")
  
  pointsChange Int      @map("points_change")
  reason      String    @db.Text
  
  adjustedBy  String    @map("adjusted_by")  // User ID of admin
  
  createdAt   DateTime  @default(now()) @map("created_at")
  
  @@index([customerId, venueId])
  @@map("trust_adjustments")
}

// ============================================================================
// PAYMENT METHODS
// ============================================================================

model PaymentMethod {
  id          String    @id @default(cuid())
  userId      String    @map("user_id")
  
  // Stripe payment method ID
  stripePaymentMethodId String @unique @map("stripe_payment_method_id")
  
  // Card details (last4, brand, etc.)
  type        PaymentMethodType
  last4       String
  brand       String?   // "visa", "mastercard", etc.
  expMonth    Int?      @map("exp_month")
  expYear     Int?      @map("exp_year")
  
  // Billing address
  billingZip  String?   @map("billing_zip")
  
  // Default flag
  isDefault   Boolean   @default(false) @map("is_default")
  
  // Status
  status      PaymentMethodStatus @default(ACTIVE)
  
  // Timestamps
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // Relations
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("payment_methods")
}

enum PaymentMethodType {
  CARD
  BANK_ACCOUNT
  DIGITAL_WALLET
}

enum PaymentMethodStatus {
  ACTIVE
  EXPIRED
  FAILED
  REMOVED
}

// ============================================================================
// LOYALTY & REWARDS
// ============================================================================

model LoyaltyProgram {
  id          String    @id @default(cuid())
  venueId     String    @map("venue_id")
  
  name        String
  description String?   @db.Text
  
  // Points earning
  pointsPerDollar Float  @default(1) @map("points_per_dollar")
  
  // Redemption
  dollarsPerPoint Float  @default(0.01) @map("dollars_per_point")  // $0.01 = 100 points per dollar
  
  // Rules
  rules       Json?     // Complex earning/redemption rules
  
  active      Boolean   @default(true)
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // Relations
  venue       Venue     @relation(fields: [venueId], references: [id], onDelete: Cascade)
  accounts    LoyaltyAccount[]
  transactions LoyaltyTransaction[]
  
  @@map("loyalty_programs")
}

model LoyaltyAccount {
  id          String    @id @default(cuid())
  programId   String    @map("program_id")
  userId      String    @map("user_id")
  
  balance     Int       @default(0)  // Points balance
  lifetimePoints Int    @default(0) @map("lifetime_points")
  
  // Tiers
  tier        String?   // "Bronze", "Silver", "Gold"
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // Relations
  program     LoyaltyProgram @relation(fields: [programId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions LoyaltyTransaction[]
  
  @@unique([programId, userId])
  @@map("loyalty_accounts")
}

model LoyaltyTransaction {
  id          String    @id @default(cuid())
  accountId   String    @map("account_id")
  programId   String    @map("program_id")
  
  type        LoyaltyTransactionType
  points      Int       // Positive for earn, negative for redeem
  
  // Context
  tabId       String?   @map("tab_id")
  description String?
  
  // Expiration (for earned points)
  expiresAt   DateTime? @map("expires_at")
  
  createdAt   DateTime  @default(now()) @map("created_at")
  
  // Relations
  account     LoyaltyAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  program     LoyaltyProgram @relation(fields: [programId], references: [id], onDelete: Cascade)
  
  @@index([accountId])
  @@index([createdAt])
  @@map("loyalty_transactions")
}

enum LoyaltyTransactionType {
  EARN
  REDEEM
  BONUS
  EXPIRE
  ADJUSTMENT
}

// ============================================================================
// RESERVATIONS
// ============================================================================

model Reservation {
  id          String    @id @default(cuid())
  venueId     String    @map("venue_id")
  userId      String    @map("user_id")
  tableId     String?   @map("table_id")
  
  // Reservation details
  partySize   Int       @map("party_size")
  dateTime    DateTime  @map("date_time")
  duration    Int       @default(120)  // Minutes
  
  // Customer info
  name        String
  phone       String
  email       String?
  
  // Special requests
  occasion    String?   // "Birthday", "Anniversary"
  notes       String?   @db.Text
  
  // Status
  status      ReservationStatus @default(PENDING)
  
  // Confirmation
  confirmationCode String? @unique @map("confirmation_code")
  
  // No-show tracking
  noShowAt    DateTime? @map("no_show_at")
  
  // Timestamps
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // Relations
  venue       Venue     @relation(fields: [venueId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  table       Table?    @relation(fields: [tableId], references: [id], onDelete: SetNull)
  
  @@index([venueId, dateTime])
  @@index([userId])
  @@map("reservations")
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  SEATED
  COMPLETED
  CANCELED
  NO_SHOW
}

// ============================================================================
// REVIEWS & RATINGS
// ============================================================================

model Review {
  id          String    @id @default(cuid())
  venueId     String    @map("venue_id")
  userId      String    @map("user_id")
  tabId       String?   @map("tab_id")
  
  // Ratings (1-5)
  overallRating Int     @map("overall_rating")
  foodRating    Int?    @map("food_rating")
  serviceRating Int?    @map("service_rating")
  ambianceRating Int?   @map("ambiance_rating")
  valueRating   Int?    @map("value_rating")
  
  // Review content
  title       String?
  comment     String?   @db.Text
  
  // Photos
  photos      String[]
  
  // Venue response
  response    String?   @db.Text
  respondedAt DateTime? @map("responded_at")
  
  // Status
  status      ReviewStatus @default(PUBLISHED)
  
  // Moderation
  flagged     Boolean   @default(false)
  flagReason  String?   @map("flag_reason")
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // Relations
  venue       Venue     @relation(fields: [venueId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([venueId, status])
  @@index([userId])
  @@map("reviews")
}

enum ReviewStatus {
  DRAFT
  PUBLISHED
  HIDDEN
  DELETED
}

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

model InventoryItem {
  id          String    @id @default(cuid())
  venueId     String    @map("venue_id")
  
  // Item details
  name        String
  description String?   @db.Text
  sku         String?
  
  // Category
  category    InventoryCategory
  
  // Unit of measure
  unit        String    // "lb", "oz", "each", "case"
  
  // Quantity
  currentQuantity Float @map("current_quantity")
  minQuantity Float     @map("min_quantity")  // Reorder threshold
  maxQuantity Float?    @map("max_quantity")
  
  // Cost
  unitCostCents Int     @map("unit_cost_cents")
  
  // Supplier
  supplierId  String?   @map("supplier_id")
  
  // Status
  active      Boolean   @default(true)
  
  // Timestamps
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  lastRestockedAt DateTime? @map("last_restocked_at")
  
  // Relations
  venue       Venue     @relation(fields: [venueId], references: [id], onDelete: Cascade)
  supplier    Supplier? @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  transactions InventoryTransaction[]
  menuItemLinks InventoryItemLink[]
  
  @@index([venueId, active])
  @@index([category])
  @@map("inventory_items")
}

enum InventoryCategory {
  PROTEIN
  PRODUCE
  DAIRY
  BEVERAGE
  ALCOHOL
  DRY_GOODS
  SUPPLIES
  PACKAGING
  OTHER
}

model InventoryItemLink {
  id          String    @id @default(cuid())
  menuItemId  String    @map("menu_item_id")
  inventoryItemId String @map("inventory_item_id")
  
  // Quantity used per menu item
  quantityUsed Float    @map("quantity_used")
  
  // Relations
  menuItem    MenuItem  @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  inventoryItem InventoryItem @relation(fields: [inventoryItemId], references: [id], onDelete: Cascade)
  
  @@unique([menuItemId, inventoryItemId])
  @@map("inventory_item_links")
}

model InventoryTransaction {
  id          String    @id @default(cuid())
  inventoryItemId String @map("inventory_item_id")
  
  type        InventoryTransactionType
  quantity    Float     // Positive for additions, negative for deductions
  
  // Cost tracking
  unitCostCents Int?    @map("unit_cost_cents")
  totalCostCents Int?   @map("total_cost_cents")
  
  // Context
  reason      String?
  referenceId String?   @map("reference_id")  // Order ID, waste ID, etc.
  
  // Performed by
  userId      String?   @map("user_id")
  
  createdAt   DateTime  @default(now()) @map("created_at")
  
  // Relations
  inventoryItem InventoryItem @relation(fields: [inventoryItemId], references: [id], onDelete: Cascade)
  
  @@index([inventoryItemId])
  @@index([createdAt])
  @@map("inventory_transactions")
}

enum InventoryTransactionType {
  PURCHASE
  USAGE
  WASTE
  ADJUSTMENT
  TRANSFER
  RETURN
}

model Supplier {
  id          String    @id @default(cuid())
  venueId     String    @map("venue_id")
  
  // Company info
  name        String
  contactName String?   @map("contact_name")
  email       String?
  phone       String?
  
  // Address
  address     String?
  city        String?
  state       String?
  postalCode  String?   @map("postal_code")
  
  // Payment terms
  paymentTerms String?  @map("payment_terms")  // "Net 30", "COD"
  
  // Status
  active      Boolean   @default(true)
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // Relations
  venue       Venue     @relation(fields: [venueId], references: [id], onDelete: Cascade)
  inventoryItems InventoryItem[]
  
  @@index([venueId, active])
  @@map("suppliers")
}

// ============================================================================
// ANALYTICS & REPORTING (Audit Schema)
// ============================================================================

model AuditLog {
  id          String    @id @default(cuid())
  
  // Who
  userId      String?   @map("user_id")
  userEmail   String?   @map("user_email")
  userRole    String?   @map("user_role")
  
  // What
  action      String    // "CREATE", "UPDATE", "DELETE", "VIEW"
  entity      String    // "Tab", "MenuItem", "User"
  entityId    String    @map("entity_id")
  
  // Context
  venueId     String?   @map("venue_id")
  
  // Changes
  before      Json?     // State before
  after       Json?     // State after
  
  // Request context
  ipAddress   String?   @map("ip_address")
  userAgent   String?   @map("user_agent")
  
  timestamp   DateTime  @default(now())
  
  @@index([userId])
  @@index([entity, entityId])
  @@index([venueId])
  @@index([timestamp])
  @@map("audit_logs")
  @@schema("audit")
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

model Notification {
  id          String    @id @default(cuid())
  userId      String    @map("user_id")
  
  type        NotificationType
  title       String
  message     String    @db.Text
  
  // Channel
  channel     NotificationChannel
  
  // Context
  entityType  String?   @map("entity_type")
  entityId    String?   @map("entity_id")
  actionUrl   String?   @map("action_url")
  
  // Status
  read        Boolean   @default(false)
  readAt      DateTime? @map("read_at")
  
  // Delivery
  sentAt      DateTime? @map("sent_at")
  deliveredAt DateTime? @map("delivered_at")
  failedAt    DateTime? @map("failed_at")
  errorMessage String?  @map("error_message")
  
  createdAt   DateTime  @default(now()) @map("created_at")
  
  @@index([userId, read])
  @@index([createdAt])
  @@map("notifications")
}

enum NotificationType {
  TAB_OPENED
  TAB_CLOSED
  WALK_AWAY_WARNING
  TRUST_LEVEL_CHANGE
  RESERVATION_CONFIRMED
  REVIEW_RESPONSE
  LOYALTY_REWARD
  SYSTEM_ALERT
}

enum NotificationChannel {
  IN_APP
  EMAIL
  SMS
  PUSH
}
```

---

## Row Level Security Policies

```sql
-- Enable RLS on all multi-tenant tables
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
-- ... etc for all venue-scoped tables

-- Policy: Users can only see data from venues they're associated with
CREATE POLICY venue_isolation ON tabs
  FOR ALL
  USING (
    venue_id IN (
      SELECT venue_id 
      FROM venue_staff 
      WHERE user_id = auth.uid() AND status = 'ACTIVE'
    )
    OR
    customer_id = auth.uid()  -- Customers can see their own tabs
  );

-- Policy: Customers can only see their own trust scores
CREATE POLICY trust_score_access ON trust_scores
  FOR SELECT
  USING (
    customer_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM venue_staff
      WHERE user_id = auth.uid()
        AND venue_id = trust_scores.venue_id
        AND role IN ('MANAGER', 'OWNER')
    )
  );
```

---

## Indexes for Performance

```sql
-- Composite indexes for common queries

-- Tab queries by venue + status
CREATE INDEX idx_tabs_venue_status ON tabs(venue_id, status, opened_at DESC);

-- Trust score lookups
CREATE INDEX idx_trust_scores_customer_venue ON trust_scores(customer_id, venue_id);
CREATE INDEX idx_trust_scores_venue_level ON trust_scores(venue_id, level);

-- Menu item filtering
CREATE INDEX idx_menu_items_venue_category ON menu_items(venue_id, category_id, available);

-- Audit log queries
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id, timestamp DESC);

-- Notification queries
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);
```

---

## Migrations Strategy

```typescript
// Example migration for adding new trust score field

-- Migration: 20251125_add_trust_manual_override.sql

BEGIN;

-- Add column
ALTER TABLE trust_scores 
ADD COLUMN manual_override BOOLEAN NOT NULL DEFAULT false;

-- Create index
CREATE INDEX idx_trust_scores_manual_override 
ON trust_scores(manual_override) 
WHERE manual_override = true;

-- Backfill VIP customers
UPDATE trust_scores
SET manual_override = true
WHERE level = 4;

COMMIT;
```

---

_Database Schema Specification v1.0_
_Generated: 2025-11-25_
_For: Crowdiant Restaurant OS_
