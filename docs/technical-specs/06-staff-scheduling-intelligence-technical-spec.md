# Technical Specification: Staff Scheduling Intelligence

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** November 25, 2025  
**Owner:** Crowdiant OS Platform Team

---

## 1. Executive Summary

### 1.1 Purpose

The Staff Scheduling Intelligence system provides AI-powered recommendations for optimal staff scheduling based on demand forecasting, labor cost optimization, and operational constraints. This feature helps restaurant managers reduce labor costs while maintaining service quality.

### 1.2 Business Goals

- **Reduce Labor Costs:** Optimize staffing levels to reduce labor cost percentage by 3-5% (industry target: 25-35% of revenue)
- **Improve Service Quality:** Prevent understaffing during peak periods
- **Increase Manager Efficiency:** Reduce time spent on schedule creation from 2-3 hours to 15-30 minutes
- **Ensure Compliance:** Automatically enforce labor laws, break requirements, and overtime policies

### 1.3 Core Capabilities

1. **Demand Forecasting:** Predict expected covers/revenue by hour/day based on historical patterns
2. **Smart Scheduling:** Generate optimal shift schedules using constraint-based optimization
3. **Labor Cost Analysis:** Real-time tracking and alerting when labor costs exceed targets
4. **Schedule Optimization:** Identify overstaffing/understaffing and suggest adjustments
5. **Compliance Management:** Enforce labor laws, break requirements, minimum rest periods

### 1.4 Integration Points

- **Demand Forecasting** → Used by Inventory Waste Reduction for prep planning
- **POS System** → Clock-in/clock-out data, actual sales by hour
- **Analytics Engine** → Labor cost reports and KPIs
- **Employee Management** → Availability, roles, pay rates, certifications

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Staff Scheduling Intelligence             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ Demand Forecaster│  │ Schedule Builder │  │  Labor    │ │
│  │                  │  │                  │  │ Analytics │ │
│  │ • Time series ML │  │ • Constraint     │  │           │ │
│  │ • Regression     │  │   solver         │  │ • Cost    │ │
│  │ • Pattern detect │  │ • Shift matching │  │   tracking│ │
│  │ • External data  │  │ • Optimization   │  │ • Alerts  │ │
│  └────────┬─────────┘  └────────┬─────────┘  └─────┬─────┘ │
│           │                     │                   │       │
│           └─────────────────────┴───────────────────┘       │
│                              │                               │
└──────────────────────────────┼───────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
         ┌──────▼──────┐            ┌────────▼────────┐
         │   Database  │            │  External APIs  │
         │             │            │                 │
         │ • Shifts    │            │ • Weather API   │
         │ • Clock-ins │            │ • Events API    │
         │ • Sales     │            │ • Holidays API  │
         │ • Employees │            │                 │
         └─────────────┘            └─────────────────┘
```

### 2.2 Component Responsibilities

#### 2.2.1 Demand Forecaster
- **Input:** Historical sales, day of week, seasonality, external events
- **Output:** Predicted covers/revenue by hour for next 2-4 weeks
- **Algorithm:** Time series regression with external factors
- **Refresh:** Daily at 2am, on-demand for new events

#### 2.2.2 Schedule Builder
- **Input:** Demand forecast, employee availability, roles, constraints
- **Output:** Optimized shift schedule meeting all requirements
- **Algorithm:** Constraint satisfaction problem (CSP) with cost minimization
- **Mode:** Auto-generate or assist manual scheduling

#### 2.2.3 Labor Analytics
- **Input:** Clock-in/out data, schedules, sales data
- **Output:** Labor cost %, alerts, optimization suggestions
- **Metrics:** Real-time and historical labor KPIs
- **Alerting:** Threshold-based notifications

---

## 3. Data Model

### 3.1 Core Entities

#### Employee (existing, enhanced)
```prisma
model Employee {
  id            String   @id @default(cuid())
  venueId       String
  venue         Venue    @relation(fields: [venueId], references: [id])
  
  // Basic info
  firstName     String
  lastName      String
  email         String   @unique
  phone         String?
  
  // Employment
  role          EmployeeRole
  department    String?  // FOH, BOH, Bar, Kitchen
  status        EmployeeStatus @default(ACTIVE)
  hireDate      DateTime
  terminationDate DateTime?
  
  // Compensation
  payType       PayType  // HOURLY, SALARY, TIPPED
  payRate       Decimal  @db.Decimal(10,2) // hourly rate or annual salary
  overtimeRate  Decimal? @db.Decimal(10,2) // typically 1.5x
  
  // Scheduling
  defaultHoursPerWeek  Int?    // For full-time tracking
  maxHoursPerWeek      Int?    // Legal or policy limit
  minHoursBetweenShift Int @default(10) // Rest requirement
  certifications       String[] // Food handler, alcohol service, etc.
  
  // Relations
  shifts        Shift[]
  clockRecords  ClockRecord[]
  availability  EmployeeAvailability[]
  timeOffRequests TimeOffRequest[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum EmployeeRole {
  SERVER
  HOST
  BARTENDER
  LINE_COOK
  PREP_COOK
  DISHWASHER
  MANAGER
  SHIFT_LEAD
  BUSSER
}

enum EmployeeStatus {
  ACTIVE
  INACTIVE
  ON_LEAVE
  TERMINATED
}

enum PayType {
  HOURLY
  SALARY
  TIPPED     // Special handling for tip credit
}
```

#### Shift (new)
```prisma
model Shift {
  id            String   @id @default(cuid())
  venueId       String
  venue         Venue    @relation(fields: [venueId], references: [id])
  
  employeeId    String?  // null = unassigned
  employee      Employee? @relation(fields: [employeeId], references: [id])
  
  // Schedule
  date          DateTime @db.Date
  startTime     DateTime
  endTime       DateTime
  duration      Int      // minutes (for easy queries)
  
  // Details
  role          EmployeeRole
  department    String?
  station       String?  // "Bar", "Section 1", "Grill", etc.
  
  // Status
  status        ShiftStatus @default(SCHEDULED)
  assignedAt    DateTime?
  confirmedAt   DateTime?
  
  // Labor tracking
  isOvertime    Boolean @default(false)
  scheduledCost Decimal @db.Decimal(10,2) // Estimated labor cost
  
  // Relations
  clockRecords  ClockRecord[]
  
  // Metadata
  notes         String?
  createdBy     String   // Manager who created
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([venueId, date])
  @@index([employeeId, date])
  @@index([date, startTime])
}

enum ShiftStatus {
  SCHEDULED    // Created but not assigned
  ASSIGNED     // Assigned to employee
  CONFIRMED    // Employee confirmed
  IN_PROGRESS  // Clock-in recorded
  COMPLETED    // Clock-out recorded
  NO_SHOW      // Employee didn't show
  CANCELLED    // Shift cancelled
}
```

#### ClockRecord (new)
```prisma
model ClockRecord {
  id            String   @id @default(cuid())
  venueId       String
  venue         Venue    @relation(fields: [venueId], references: [id])
  
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id])
  
  shiftId       String?
  shift         Shift?   @relation(fields: [shiftId], references: [id])
  
  // Time tracking
  clockIn       DateTime
  clockOut      DateTime?
  duration      Int?     // minutes (null if still clocked in)
  
  // Break tracking
  breakMinutes  Int @default(0)
  breaks        Json?    // Array of {start, end, duration, paid}
  
  // Labor calculation
  regularHours  Decimal? @db.Decimal(5,2)
  overtimeHours Decimal? @db.Decimal(5,2)
  regularPay    Decimal? @db.Decimal(10,2)
  overtimePay   Decimal? @db.Decimal(10,2)
  totalPay      Decimal? @db.Decimal(10,2)
  
  // Metadata
  notes         String?
  editedBy      String?  // If manager edits time
  editReason    String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([venueId, clockIn])
  @@index([employeeId, clockIn])
  @@index([shiftId])
}
```

#### EmployeeAvailability (new)
```prisma
model EmployeeAvailability {
  id            String   @id @default(cuid())
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id])
  
  // Recurring availability (weekly pattern)
  dayOfWeek     Int      // 0 = Sunday, 6 = Saturday
  startTime     String   // "09:00" (24-hour format)
  endTime       String   // "17:00"
  isAvailable   Boolean  @default(true)
  
  // Or specific date overrides
  specificDate  DateTime? @db.Date
  
  // Preferences
  preferredShift String?  // "MORNING", "AFTERNOON", "EVENING", "NIGHT"
  maxHoursPerDay Int?
  
  notes         String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([employeeId])
  @@index([dayOfWeek])
}
```

#### TimeOffRequest (new)
```prisma
model TimeOffRequest {
  id            String   @id @default(cuid())
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id])
  
  venueId       String
  venue         Venue    @relation(fields: [venueId], references: [id])
  
  // Request
  startDate     DateTime @db.Date
  endDate       DateTime @db.Date
  type          TimeOffType
  reason        String?
  
  // Status
  status        RequestStatus @default(PENDING)
  reviewedBy    String?
  reviewedAt    DateTime?
  reviewNotes   String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([employeeId, status])
  @@index([venueId, startDate])
}

enum TimeOffType {
  VACATION
  SICK
  PERSONAL
  UNPAID
  BEREAVEMENT
}

enum RequestStatus {
  PENDING
  APPROVED
  DENIED
  CANCELLED
}
```

#### DemandForecast (new)
```prisma
model DemandForecast {
  id            String   @id @default(cuid())
  venueId       String
  venue         Venue    @relation(fields: [venueId], references: [id])
  
  // Forecast period
  date          DateTime @db.Date
  hourStart     Int      // 0-23 (hour of day)
  
  // Predictions
  expectedCovers    Int
  expectedRevenue   Decimal @db.Decimal(10,2)
  confidence        Decimal @db.Decimal(3,2) // 0.00-1.00
  
  // Labor recommendations
  recommendedServers   Int
  recommendedKitchen   Int
  recommendedBar       Int?
  recommendedHosts     Int?
  
  // Factors influencing forecast
  factors       Json?    // {dayOfWeek, isHoliday, weather, event, etc.}
  
  // Model info
  modelVersion  String
  generatedAt   DateTime @default(now())
  
  @@unique([venueId, date, hourStart])
  @@index([venueId, date])
}
```

#### LaborSnapshot (new - for analytics)
```prisma
model LaborSnapshot {
  id            String   @id @default(cuid())
  venueId       String
  venue         Venue    @relation(fields: [venueId], references: [id])
  
  // Period
  date          DateTime @db.Date
  periodType    PeriodType // DAY, WEEK, MONTH
  
  // Labor metrics
  totalLaborHours    Decimal @db.Decimal(8,2)
  totalLaborCost     Decimal @db.Decimal(10,2)
  overtimeHours      Decimal @db.Decimal(8,2)
  overtimeCost       Decimal @db.Decimal(10,2)
  
  // Revenue context
  totalRevenue       Decimal @db.Decimal(10,2)
  laborCostPercent   Decimal @db.Decimal(5,2) // Labor / Revenue * 100
  salesPerLaborHour  Decimal @db.Decimal(10,2)
  
  // Staffing
  avgEmployeesPerShift Decimal @db.Decimal(5,2)
  totalShifts          Int
  
  // Breakdown by department (JSON for flexibility)
  departmentBreakdown Json? // {FOH: {hours, cost}, BOH: {hours, cost}}
  
  createdAt     DateTime @default(now())
  
  @@unique([venueId, date, periodType])
  @@index([venueId, date])
}

enum PeriodType {
  DAY
  WEEK
  MONTH
  QUARTER
  YEAR
}
```

---

## 4. Demand Forecasting Algorithm

### 4.1 Overview

The demand forecasting system predicts expected customer volume (covers) and revenue for future time periods using historical data, seasonal patterns, and external factors.

### 4.2 Input Features

```typescript
interface ForecastInputs {
  // Temporal features
  dayOfWeek: number;        // 0-6 (Sunday-Saturday)
  weekOfYear: number;       // 1-52
  month: number;            // 1-12
  isWeekend: boolean;
  isHoliday: boolean;
  daysUntilHoliday: number; // Proximity effect
  
  // Historical patterns
  avgCoversLast4Weeks: number;
  avgRevenueLast4Weeks: number;
  trendSlope: number;       // Growing or declining
  
  // External factors
  weatherForecast: {
    temperature: number;
    precipitation: number;  // 0-100%
    condition: WeatherCondition;
  };
  localEvents: {
    type: EventType;
    expectedAttendance: number;
    distance: number;       // miles from venue
  }[];
  
  // Venue-specific
  promotionsActive: boolean;
  newMenuLaunch: boolean;
  specialEventAtVenue: boolean;
}
```

### 4.3 Forecasting Model

**Approach:** Ensemble method combining multiple models

```typescript
// Model 1: Historical Average (baseline)
function historicalAverage(date: Date, hour: number): number {
  // Average of same day-of-week and hour for last 4-8 weeks
  const historicalData = await getHistoricalData({
    dayOfWeek: date.getDay(),
    hour,
    weeksBack: 8
  });
  
  return mean(historicalData.map(d => d.covers));
}

// Model 2: Linear Regression with Seasonality
function linearRegressionForecast(inputs: ForecastInputs): number {
  // Features with weights learned from training data
  const features = {
    dayOfWeek: inputs.dayOfWeek,
    hour: inputs.hourStart,
    weekOfYear: inputs.weekOfYear,
    isWeekend: inputs.isWeekend ? 1 : 0,
    isHoliday: inputs.isHoliday ? 1 : 0,
    temperature: inputs.weatherForecast.temperature,
    precipitation: inputs.weatherForecast.precipitation,
    trend: inputs.trendSlope,
    // ... more features
  };
  
  // Linear combination
  return dotProduct(features, learnedWeights) + intercept;
}

// Model 3: Time Series (ARIMA/Prophet-style)
function timeSeriesForecast(date: Date, hour: number): number {
  // Decompose into: Trend + Seasonality + Residual
  const trend = calculateTrend(date);
  const seasonality = calculateSeasonality(date, hour);
  const eventImpact = calculateEventImpact(date);
  
  return trend + seasonality + eventImpact;
}

// Ensemble: Weighted average
function generateForecast(inputs: ForecastInputs): Forecast {
  const m1 = historicalAverage(inputs.date, inputs.hour);
  const m2 = linearRegressionForecast(inputs);
  const m3 = timeSeriesForecast(inputs.date, inputs.hour);
  
  // Weights based on historical accuracy
  const weights = {
    historical: 0.3,
    regression: 0.4,
    timeSeries: 0.3
  };
  
  const predictedCovers = 
    m1 * weights.historical +
    m2 * weights.regression +
    m3 * weights.timeSeries;
  
  const confidence = calculateConfidence(inputs);
  
  return {
    covers: Math.round(predictedCovers),
    revenue: predictedCovers * avgCheckSize,
    confidence,
    model: 'ensemble_v1'
  };
}
```

### 4.4 Confidence Calculation

```typescript
function calculateConfidence(inputs: ForecastInputs): number {
  let baseConfidence = 0.70; // Start at 70%
  
  // More historical data = higher confidence
  if (inputs.weeksOfHistory > 12) baseConfidence += 0.10;
  if (inputs.weeksOfHistory > 26) baseConfidence += 0.05;
  
  // Regular patterns = higher confidence
  if (inputs.coefficientOfVariation < 0.2) baseConfidence += 0.10;
  
  // Holidays and events = lower confidence
  if (inputs.isHoliday) baseConfidence -= 0.15;
  if (inputs.localEvents.length > 0) baseConfidence -= 0.10;
  
  // Weather uncertainty
  if (inputs.daysAhead > 7) baseConfidence -= 0.05;
  if (inputs.daysAhead > 14) baseConfidence -= 0.10;
  
  return Math.max(0.40, Math.min(0.95, baseConfidence));
}
```

### 4.5 Labor Requirement Calculation

Convert demand forecast into staffing recommendations:

```typescript
function calculateLaborRequirements(
  forecast: Forecast,
  venue: Venue
): LaborRequirements {
  const { expectedCovers } = forecast;
  
  // Industry standard: 1 server per 4-6 tables (15-20 covers)
  const recommendedServers = Math.ceil(
    expectedCovers / venue.coversPerServer
  );
  
  // Kitchen: 1 line cook per 30-40 covers
  const recommendedLineCooks = Math.ceil(
    expectedCovers / venue.coversPerCook
  );
  
  // Prep cook: Based on menu complexity and forecast
  const recommendedPrepCooks = calculatePrepNeeds(forecast, venue);
  
  // Hosts: 1-2 depending on volume
  const recommendedHosts = expectedCovers > 50 ? 2 : 1;
  
  // Bartenders: Based on bar sales ratio
  const barSalesRatio = venue.metrics.barSalesPercent || 0.25;
  const expectedBarCovers = expectedCovers * barSalesRatio;
  const recommendedBartenders = Math.ceil(
    expectedBarCovers / venue.coversPerBartender
  );
  
  return {
    servers: recommendedServers,
    lineCooks: recommendedLineCooks,
    prepCooks: recommendedPrepCooks,
    hosts: recommendedHosts,
    bartenders: recommendedBartenders,
    totalStaff: 
      recommendedServers + 
      recommendedLineCooks + 
      recommendedPrepCooks +
      recommendedHosts +
      recommendedBartenders
  };
}
```

---

## 5. Schedule Optimization Engine

### 5.1 Goals
Generate an implementable weekly schedule (typically Monday–Sunday) that:
- Meets hourly staffing requirements derived from demand forecasts
- Minimizes projected labor cost while respecting role coverage
- Avoids overtime unless necessary for coverage
- Maximizes fairness (balanced hours vs targets)
- Honors availability, time-off, certifications, legal constraints
- Provides transparent scoring + violation diagnostics

### 5.2 Inputs
```typescript
interface GenerateScheduleParams {
  venueId: string;
  weekStart: Date;              // Monday 00:00 local
  strategy?: 'COST_MIN' | 'FAIRNESS_BALANCED' | 'HYBRID';
  lockExistingShiftIds?: string[]; // Shifts to keep fixed during optimization
  maxIterations?: number;       // For improvement phase
}

interface HourlyRequirement { // derived from DemandForecast aggregation
  date: string;        // YYYY-MM-DD
  hour: number;        // 0-23
  servers: number;
  lineCooks: number;
  prepCooks: number;
  hosts: number;
  bartenders: number;
}
```

### 5.3 Constraint Categories

#### Hard Constraints (must not be violated)
1. Availability: employee must be available for entire shift window
2. Time-off: no assignment overlapping approved TimeOffRequest
3. Rest Period: `startTime - previousShift.endTime >= employee.minHoursBetweenShift`
4. Max Daily Hours: total scheduled minutes per day ≤ `maxHoursPerDay` (if set)
5. Max Weekly Hours: total scheduled minutes per week ≤ `maxHoursPerWeek` (if set)
6. Role Qualification: employee role matches shift role (including required certifications)
7. Legal Breaks: shifts > 6h must include 30m break; > 10h require second break (jurisdiction configurable)
8. Station Uniqueness (optional): certain stations (e.g., Grill Lead) limited to 1 per hour
9. Overlapping Shifts: employee cannot have overlapping or touching shifts (<15m buffer)

#### Soft Constraints (scored, can be traded off)
1. Fairness Deviation: difference between scheduled hours and target hours
2. Preference Matching: preferredShift honored (morning/evening) when possible
3. Consecutive Days Limit: discourage >5 consecutive working days
4. Split Shifts Penalty: discourage multiple non-contiguous shifts same day
5. Overtime Penalty: penalize hours past 40 (or policy threshold) unless coverage gap
6. Unfilled Coverage Penalty: under-staffing by role/hour
7. Excess Coverage Penalty: over-staffing beyond requirement + defined slack (e.g., +1 tolerance)

### 5.4 Mathematical Formulation (ILP View)

Let:
- Employees: `E`
- Shifts (candidate set generated): `S`
- Required staff for role r at hour h: `R_{r,h}`
- Binary decision variable: `x_{e,s} ∈ {0,1}` employee e assigned to shift s

Objective (weighted sum minimize):
```
Minimize Z = w_cost * Σ_s Σ_e (x_{e,s} * cost_{e,s})
          + w_under * Σ_{r,h} under_{r,h}
          + w_over  * Σ_{r,h} over_{r,h}
          + w_fair  * Σ_e |hours_e - targetHours_e|
          + w_pref  * Σ_s Σ_e (x_{e,s} * prefPenalty_{e,s})
          + w_split * Σ_e splitPenalty_e
          + w_ot    * Σ_e overtimeHours_e
```
Subject to:
```
1. Each shift assigned to ≤ 1 employee of matching role
2. Employee availability & time-off windows respected
3. Weekly & daily hour limits
4. Rest period between consecutive shifts
5. Break insertion rules for long shifts (modeled via shift generation)
6. Coverage: Σ_{s∈role_r,hour_h} Σ_e x_{e,s} + slack_{r,h} ≥ R_{r,h} - under_{r,h}
7. Over coverage: Σ_{s∈role_r,hour_h} Σ_e x_{e,s} ≤ R_{r,h} + tolerance + over_{r,h}
```
Where `under_{r,h}, over_{r,h} ≥ 0` continuous slack variables.

### 5.5 Generation Strategy
1. Build hourly requirement matrix for the week.
2. Produce candidate shifts per role using patterns:
   - Canonical blocks (e.g., Morning 8–14, Mid 11–17, Evening 16–22, Close 18–00)
   - Merge adjacent hours where requirement > 0 to avoid fragmentation
   - Insert break placeholders in shifts > 6h
3. Filter candidates by minimum & maximum length (e.g., 3h–10h FOH, 4h–10h BOH).
4. Tag shifts with cost estimate (`payRate * hours`).
5. Initial Greedy Assignment:
   - Sort requirements by descending `R_{r,h}` and hour criticality (peak hours first)
   - For each requirement slot pick employee minimizing (cost + fairness delta + preference penalty) satisfying hard constraints.
6. Improvement Phase (Local Search):
   - Iteratively evaluate swap, move, reassign operations
   - Accept improvement if objective decreases
   - Use simulated annealing temperature for escaping local minima (optional)
7. Feasibility Repair: ensure remaining under-staffed hours minimized (optionally propose open shifts).
8. Produce final schedule + metrics + violation summary.

### 5.6 Pseudocode
```typescript
async function generateDraftSchedule(params: GenerateScheduleParams): Promise<ScheduleResult> {
  const requirements = await buildHourlyRequirements(params.venueId, params.weekStart);
  const employees = await loadSchedulingEmployees(params.venueId);
  const candidates = buildCandidateShifts(requirements, employees);
  const state = initializeState(candidates, employees);

  // Greedy pass
  for (const slot of orderRequirementSlots(requirements)) {
    const shift = selectOrCreateShiftForSlot(slot, candidates);
    const employee = pickBestEmployee(shift, employees, state);
    if (employee) assign(employee, shift, state);
    else recordUnderStaff(slot);
  }

  // Improvement
  for (let i = 0; i < (params.maxIterations || 200); i++) {
    const op = sampleOperation(['swap','move','reassign']);
    const delta = evaluateDelta(op, state);
    if (delta < 0 || acceptWorse(delta, i)) {
      applyOperation(op, state);
    }
  }

  const metrics = computeScheduleMetrics(state);
  const violations = detectConstraintViolations(state);
  return { shifts: state.shifts, assignments: state.assignments, metrics, violations };
}
```

### 5.7 Fairness Metric
Per employee:
```
fairnessDeviation_e = | scheduledHours_e - targetHours_e |
fairnessScore = 1 - (Σ_e fairnessDeviation_e / (Σ_e targetHours_e + ε))
```
Target hours defaults:
- Full-time: `defaultHoursPerWeek`
- Part-time: manager configurable or inferred from historic average

### 5.8 Break Compliance
- Long shift (>6h): Insert 30m unpaid break between hour 3–5 window
- Very long shift (>10h): Second break after hour 8
- Kitchen roles: enforce meal + rest pattern per jurisdiction config JSON `laborRules[region]`
Detection:
```typescript
function validateBreaks(shift: Shift): BreakViolation[] { /* scans clock or planned blocks */ }
```

### 5.9 Overtime Handling
During greedy assignment, reject candidate pushing employee > policy threshold (e.g., 40h) unless:
- Under-staffed critical peak hour
- Alternative employees all violate harder constraints
Mark overtime shifts `isOvertime = true`; add penalty weight `w_ot`.

### 5.10 Cost Estimation
`scheduledCost = payRate * (durationMinutes - unpaidBreakMinutes)/60`
Aggregate weekly labor cost vs forecasted revenue to compute projected `laborCostPercent` pre-publication.

### 5.11 APIs (tRPC)
```typescript
// Mutation: build draft
generateDraftSchedule: protectedProcedure
 .input(z.object({ venueId: z.string(), weekStart: z.string(), strategy: z.enum(['COST_MIN','FAIRNESS_BALANCED','HYBRID']).optional() }))
 .mutation(({ input, ctx }) => scheduleService.generateDraft(input));

// Mutation: run improvement on existing schedule
optimizeSchedule: protectedProcedure
 .input(z.object({ scheduleId: z.string(), mode: z.enum(['COST','FAIRNESS','HYBRID']) }))
 .mutation(...);

// Query: metrics & scores
getScheduleMetrics: protectedProcedure
 .input(z.object({ scheduleId: z.string() }))
 .query(...);

publishSchedule: protectedProcedure
 .input(z.object({ scheduleId: z.string() }))
 .mutation(...); // locks shifts, triggers notifications

confirmShift: employeeProcedure
 .input(z.object({ shiftId: z.string() }))
 .mutation(...);

swapShifts: protectedProcedure
 .input(z.object({ shiftA: z.string(), shiftB: z.string() }))
 .mutation(...); // validates compatibility & updates assignments
```

### 5.12 Events (Socket / PubSub)
- `schedule.draft.created` – initial draft ready
- `schedule.optimized` – improvement pass completed
- `shift.assigned` – employee receives assignment
- `shift.confirmed` – employee confirmation
- `schedule.published` – final schedule distributed
- `schedule.alert.understaff` – detected under-staff period remains unresolved

### 5.13 ASCII Data Flow
```
Historical Sales + Clock Records
        │
        ▼
  Demand Forecaster ──► Hourly Requirements Matrix
        │                         │
        │                         ▼
        │                 Candidate Shift Generator
        │                         │
        ▼                         ▼
  Schedule Optimizer  ◄── Employees + Availability + TimeOff
        │
        ▼
   Draft Schedule ──► Improvement Engine ──► Final Schedule
        │                                      │
        ▼                                      ▼
  Metrics & Violations                Publish / Notify / Alerts
```

### 5.14 Failure Modes & Mitigations
| Failure | Cause | Mitigation |
|---------|-------|-----------|
| No feasible coverage | Too few employees available | Generate gap report + open shifts + recommend hiring/temp |
| Excess overtime | High demand week + shortages | Highlight overtime drivers + suggest role cross-training |
| Long computation | Large venue (>200 employees) | Early partial draft + progressive refinement streaming |
| Inaccurate forecast | Sudden event not modeled | Allow manual override multipliers per day/hour |
| Break violations | Generated shifts too long | Auto-split + re-run repair pass |

### 5.15 Complexity
- Candidate shifts per role roughly O(D * R) (days * requirement density)
- Greedy pass O(S * log S) with priority queue of requirements
- Improvement phase O(I * O_op) configurable (I iterations)
- Scales to ~5–7 roles × 100 employees × 1-week horizon comfortably with hybrid heuristic; ILP fallback for high accuracy can run offline.

### 5.16 Configuration Surface
Stored in `labor_config` (JSON) per venue:
```json
{
  "fairnessWeight": 0.25,
  "overtimeWeight": 0.6,
  "underCoverageWeight": 1.0,
  "overCoverageTolerance": 1,
  "maxConsecutiveDays": 5,
  "splitShiftPenalty": 0.2,
  "preferredShiftBonus": 0.05,
  "breakRules": { "region": "US_CA", "longShiftHours": 6, "secondBreakHours": 10 }
}
```

### 5.17 Output Metrics (Sample)
```typescript
interface ScheduleMetrics {
  totalShifts: number;
  totalScheduledHours: number;
  projectedLaborCost: number;
  projectedLaborCostPercent: number;
  fairnessScore: number;      // 0-1
  coverageScore: number;      // 0-1 (1 = no under-staff hours)
  overtimeHours: number;
  splitShiftsCount: number;
  preferenceMatchPercent: number;
  generationIterations: number;
}
```

---

## 6. Real-Time Labor Tracking & Analytics

### 6.1 Objectives
Provide continuous visibility into labor utilization versus plan, detect cost / coverage / compliance deviations rapidly, and surface actionable recommendations (reduce, extend, reassign, alert) with minimal latency (<10s from clock event).

### 6.2 Data Ingestion Pipeline
| Source | Event | Method | Latency Target |
|--------|-------|--------|----------------|
| POS / Time Clock | clock_in / clock_out | Webhook → Queue | < 3s |
| POS | sale_created (includes revenue) | Webhook → Queue | < 5s |
| Scheduling Service | shift_published / shift_updated | Direct DB write + event | < 1s |
| Manual Override | manager_adjust (hours, pay rate, tip allocation) | UI → API | < 5s |

Flow:
```
Webhook → ingestion_queue (Redis / NATS) → normalizer → labor_stream (Kafka topic) →
  a) Realtime Aggregator (in-memory) → push metrics cache (Redis hash)
  b) Persistence Writer → DB (ClockRecord, LaborSnapshot partial)
  c) Alert Evaluator → thresholds / anomaly detection → publish alerts
```

### 6.3 Core Real-Time Metrics (Per Venue, Updated Every Event)
```typescript
interface RealTimeLaborMetrics {
  timestamp: Date;
  activeEmployees: number;
  activeByRole: Record<EmployeeRole, number>;
  scheduledNow: number;              // shifts planned for current hour
  scheduledVsActiveDelta: number;    // active - scheduledNow
  laborCostToDate: number;           // using ongoing durations * rate
  projectedEndOfDayLaborCost: number;
  revenueToDate: number;
  laborCostPercentToDate: number;    // laborCostToDate / revenueToDate * 100
  salesPerLaborHour: number;         // revenueToDate / totalLaborHoursToDate
  overtimeAccumulatedHours: number;
  breakComplianceIssues: number;
  underStaffHoursToday: number;      // cumulative
  overStaffHoursToday: number;       // cumulative (> tolerance)
  forecastVariancePercent: number;   // (actualCoversToDate - forecastCoversToDate)/forecastCoversToDate*100
  anomalies: LaborAnomaly[];
}
```

### 6.4 Calculations & Formulas
1. Labor Cost (running):
```
laborCostToDate = Σ_clockedEmployees (elapsedMinutes / 60 * payRateAdjusted)
payRateAdjusted = baseRate + (overtimeFactor * overtimeMinutes/60 * baseRate)
```
2. Total Labor Hours:
```
totalLaborHoursToDate = Σ_clockRecords (elapsedMinutes - unpaidBreakMinutes) / 60
```
3. Sales Per Labor Hour:
```
salesPerLaborHour = revenueToDate / max(totalLaborHoursToDate, 0.01)
```
4. Forecast Variance (covers):
```
forecastVariancePercent = ((actualCoversToDate - forecastCoversToDate) / forecastCoversToDate) * 100
```
5. Overtime Detection:
```
overtimeAccumulatedHours = Σ_employees max(0, weeklyHoursSoFar - policyThreshold)
```
6. Under/Over Staffing (per hour h, role r):
```
underStaff_{r,h} = max(0, required_{r,h} - active_{r,h})
overStaff_{r,h}  = max(0, active_{r,h} - (required_{r,h} + tolerance))
```

### 6.5 Break Compliance Engine
Process every `clock_out` and periodic (every 5m) evaluation of ongoing clocks:
```typescript
interface BreakViolation {
  employeeId: string;
  shiftId?: string;
  type: 'MISSED_MEAL' | 'LATE_MEAL' | 'SECOND_MEAL_REQUIRED' | 'REST_TOO_SHORT';
  details: string;
  occurredAt: Date;
}
```
Algorithm:
1. Identify shift total length (planned + actual if overrun >30m).
2. Check existence/timing of break entries inside ClockRecord.breaks.
3. Evaluate jurisdiction rules from `labor_config.breakRules`.
4. Emit `labor.alert.break_violation` if any violation.

### 6.6 Anomaly Detection
Short-term anomalies flagged using streaming thresholds + simple z-score:
```typescript
function detectRevenueLaborOutlier(metricSeries: number[]): boolean {
  const mean = avg(metricSeries);
  const std = stdev(metricSeries);
  const latest = metricSeries[metricSeries.length - 1];
  return std > 0 && Math.abs(latest - mean) / std > 3; // 3σ rule
}
```
Anomaly Types:
- `REVENUE_DROP`: actual hourly revenue < forecast - 40%
- `REVENUE_SURGE`: actual > forecast + 50%
- `LABOR_SPIKE`: activeEmployees rises > 30% above scheduledNow
- `UNDERCOVERAGE_PERSISTENT`: underStaff for same role ≥3 consecutive hours
- `BREAK_VIOLATION_CLUSTER`: ≥3 violations in 2h window

### 6.7 Recommendation Engine
Triggered on anomalies or threshold crossings; synthesizes actions:
```typescript
interface Recommendation {
  id: string;
  category: 'REDUCE_STAFF' | 'ADD_STAFF' | 'BREAK_ENFORCEMENT' | 'OVERTIME_PREVENTION' | 'SCHEDULE_ADJUST' | 'FORECAST_OVERRIDE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string;      // Human readable explanation
  suggestedAction: string; // e.g. "Release 1 server at 15:30"
  impactEstimate: { laborCostDelta?: number; coverageRisk?: string };
  relatedHour?: string;   // YYYY-MM-DDTHH:00
  role?: EmployeeRole;
}
```
Logic Examples:
- If `overStaff_{servers,h} >= 2` and forecast variance negative (< -25%), suggest REDUCE_STAFF.
- If `underStaff_{lineCooks,h} > 0` and next hour continues, SCHEDULE_ADJUST (extend adjacent prep shift).
- Frequent break violations → BREAK_ENFORCEMENT (send targeted reminder).
- OvertimeAccumulated approaching threshold for key employee → OVERTIME_PREVENTION (swap upcoming shift).

### 6.8 Real-Time Cache Structure (Redis)
```
labor:venue:{venueId}:metrics → Hash (RealTimeLaborMetrics flattened)
labor:venue:{venueId}:recs    → List (serialized Recommendation objects, capped 50)
labor:venue:{venueId}:series:revenue:YYYYMMDD → Stream (hourly revenue entries)
labor:venue:{venueId}:series:activeEmployees  → Stream (minute granularity)
```

### 6.9 API Endpoints (tRPC)
```typescript
getRealTimeLaborMetrics: protectedProcedure
 .input(z.object({ venueId: z.string() }))
 .query(({ input, ctx }) => laborRtService.getMetrics(input.venueId));

getLaborRecommendations: protectedProcedure
 .input(z.object({ venueId: z.string(), limit: z.number().max(50).default(20) }))
 .query(...);

acknowledgeRecommendation: protectedProcedure
 .input(z.object({ recommendationId: z.string() }))
 .mutation(...);

overrideForecast: protectedProcedure
 .input(z.object({ venueId: z.string(), hour: z.string(), multiplier: z.number().min(0.5).max(2) }))
 .mutation(...); // adjusts required matrix going forward
```

### 6.10 Event Catalog (Socket.io)
- `labor.metrics.update` – push diff of key metrics every 30s or on change
- `labor.recommendation.new` – new recommendation
- `labor.alert.overtime` – overtime risk triggered
- `labor.alert.break_violation` – compliance issue
- `labor.alert.coverage_gap` – persistent under-staff

### 6.11 Alert Threshold Configuration
Stored per venue:
```json
{
  "laborCostPercentSoft": 32,
  "laborCostPercentHard": 35,
  "underStaffPersistentHours": 2,
  "overStaffTolerance": 1,
  "overtimeWarningHours": 38,
  "overtimeHardHours": 40,
  "breakViolationCluster": 3
}
```

### 6.12 Snapshot Generation (Daily/Wk/Month)
Cron job (02:15 local) aggregates previous day ClockRecords and Sales:
1. Compute `LaborSnapshot` DAY record.
2. Update WEEK record if week boundary passed (Monday start).
3. Recalculate moving averages for forecasting accuracy diagnostics.

### 6.13 Performance Considerations
- In-memory aggregator keeps only active day slices; historical queries hit DB.
- Use incremental updates: recompute only delta metrics (e.g., one employee clock-out affects totals).
- Backpressure strategy: if queue backlog > N, switch to degraded mode (metrics every 60s) and issue system notification.

### 6.14 Security & Integrity
- Clock edits require manager role; all edits logged (editReason + editedBy).
- Recommendations immutable post creation; actions produce audit log entries.
- Forecast overrides recorded with rationale + user id.

### 6.15 Sample Recommendation Output (UI)
```json
{
  "id": "rec_abc123",
  "category": "REDUCE_STAFF",
  "priority": "MEDIUM",
  "rationale": "Server coverage exceeds forecast by 3 during a -28% demand variance hour",
  "suggestedAction": "Release 1 server at 15:30 or reassign to prep staging",
  "impactEstimate": { "laborCostDelta": 42.50 },
  "relatedHour": "2025-11-25T15:00:00",
  "role": "SERVER"
}
```

### 6.16 UX Considerations
- Heatmap grid: hours × roles with color coded coverage (under / optimal / over).
- Real-time ticker: active employees, labor cost %, revenue pace vs forecast.
- Recommendation side panel with filters (Category, Priority, Role).
- Forecast override modal: multiplier preview effect on staffing.

### 6.17 Testing Strategy (Focused on Engine)
- Unit: formula correctness (laborCostPercent, salesPerLaborHour).
- Property: fairness of anomaly detection (no false positives on stable synthetic series).
- Integration: end-to-end event ingestion → metrics cache update.
- Load: simulate 10k clock events/hour; verify latency < 2s P95.

---

## 7. Compliance & Regulatory Logic

### 7.1 Scope
Ensure generated schedules and real-time labor operations adhere to applicable labor regulations (federal, state/province, local), company policies, and industry best practices for hospitality. Provide proactive warnings, enforced hard stops for critical violations, and auditable records of overrides.

### 7.2 Jurisdiction Model
Each venue stores `laborJurisdiction` (e.g., `US_CA`, `US_NY`, `US_FED`, `CA_ON`, `UK_GB`). Rules layered:
1. Base Federal (or national) rules
2. State/Province overrides
3. Local city-specific predictive scheduling / premium pay rules

### 7.3 Rule Configuration Schema
```json
{
  "jurisdiction": "US_CA",
  "breaks": {
    "mealRequiredHours": 5,          // first meal break before end of 5th hour
    "secondMealHours": 10,           // second meal if >10h
    "restBreakPerHours": 4,          // paid rest every 4h segment
    "mealDurationMinutes": 30,
    "restDurationMinutes": 10,
    "splitShiftPremium": true,
    "onDutyMealAllowed": false
  },
  "overtime": {
    "dailyThreshold": 8,             // daily OT after 8h
    "doubleTimeThreshold": 12,       // double time after 12h
    "weeklyThreshold": 40,
    "rateMultipliers": { "OT": 1.5, "DT": 2.0 }
  },
  "predictiveScheduling": {
    "advanceNoticeDays": 14,
    "changePremiumHours": 1,         // paid premium if changed <14d
    "cancelPremiumPercent": 0.5      // percent of scheduled hours if canceled late
  },
  "minorRestrictions": {
    "enabled": true,
    "under16": { "maxDailyHours": 8, "maxEndHour": 21 },
    "under18": { "maxDailyHours": 10, "maxEndHour": 23 }
  },
  "reporting": {
    "retainYears": 4,
    "hashPII": true
  },
  "tips": {
    "pooled": true,
    "tipCreditAllowed": true,
    "tipCreditMinCashWage": 10.50
  },
  "fairness": {
    "maxConsecutiveDays": 6,
    "minTurnaroundHours": 10         // close→open restriction
  }
}
```

### 7.4 Compliance Evaluation Points
| Phase | Checks |
|-------|--------|
| Shift Generation | max length, breaks inserted, minors end time, turnaround |
| Assignment | weekly hours, overtime projection, predictive scheduling notice |
| Publication | advanced notice window, change premiums flagged |
| Real-Time | missed meal approaching, overtime crossing thresholds, unlawful minors clock-in |
| Edits / Overrides | premium pay triggers, cancellation compensation |

### 7.5 Evaluation Engine Pseudocode
```typescript
function evaluateScheduleCompliance(schedule: Shift[]): ComplianceReport {
  const violations: ComplianceViolation[] = [];
  for (const shift of schedule) {
    checkLength(shift, violations);
    checkTurnaround(shift, violations);
    checkMinorRestrictions(shift, violations);
    checkBreakPlacement(shift, violations);
    projectOvertime(shift, violations);
  }
  checkPredictiveScheduling(schedule, violations);
  const severitySummary = summarize(violations);
  return { violations, severitySummary };
}
```

### 7.6 Violation Schema
```typescript
interface ComplianceViolation {
  id: string;
  type: 'OVERTIME' | 'DOUBLE_TIME' | 'MISSED_MEAL' | 'LATE_MEAL' | 'MINOR_END_TIME' | 'TURNAROUND' | 'PREDICTIVE_NOTICE' | 'BREAK_GAP' | 'EXCESS_CONSECUTIVE_DAYS' | 'SPLIT_PREMIUM' | 'TIP_CREDIT_THRESHOLD';
  shiftId?: string;
  employeeId?: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  description: string;
  recommendedAction: string;
  premiumPayHours?: number;
  projectedCostImpact?: number;
}
```

### 7.7 Predictive Scheduling Handling
If schedule published < required advance notice (e.g., 14 days) OR shift changed within protected window:
- Mark affected shifts with `predictivePremium` flag
- Compute premium pay hours (e.g., 1 hour or % of shift)
- Include in projected labor cost summary pre-publication
- Provide manager override log with rationale

### 7.8 Premium Pay & Cost Projection
`projectedLaborCost = base + overtimePremium + predictivePremium + splitShiftPremium`
Break down components for transparency in UI:
```json
{
  "base": 3420.75,
  "overtime": 180.50,
  "doubleTime": 60.00,
  "predictive": 95.00,
  "splitShift": 40.25,
  "total": 3796.50
}
```

### 7.9 Tip Credit Compliance
For tipped employees where tip credit used:
```
effectiveHourly = (cashWage + (allocatedTips / hoursWorked))
if effectiveHourly < jurisdiction.tipCreditMinCashWage ⇒ violation TIP_CREDIT_THRESHOLD
```
Run nightly reconciliation; flag deficits to manager.

### 7.10 Data Retention & Privacy
- Retain detailed ClockRecord & Shift data for `reporting.retainYears`.
- Hash personally identifiable fields (phone, email) in archived snapshots if `hashPII` enabled.
- Store audit events (`labor_audit_log`) with immutable append-only semantics.

### 7.11 Audit Log Event Format
```json
{
  "id": "audit_evt_123",
  "timestamp": "2025-11-25T14:33:12Z",
  "actorId": "manager_42",
  "action": "OVERTIME_OVERRIDE",
  "targetEmployeeId": "emp_abc",
  "shiftId": "shift_xyz",
  "rationale": "High-value private event requires extended coverage",
  "delta": { "hoursAdded": 2 },
  "jurisdiction": "US_CA"
}
```

### 7.12 Real-Time Enforcement Hooks
Middleware on clock-in:
1. Validate minor end-time potential → block or warn.
2. Check turnaround hours since last clock-out → if < minTurnaroundHours: require manager confirmation code.
3. Predict if meal break will be missed given current planned end → pre-emptive reminder.

### 7.13 UI Compliance Surfaces
- Schedule Review Panel: table of upcoming violations with severity badges.
- Shift Edit Modal: inline compliance checklist + live recalculation.
- Publication Dialog: predictive scheduling summary & premium cost delta.
- Real-Time Dashboard: ticker of new critical compliance events.

### 7.14 Testing Matrix
| Case | Jurisdiction | Expected |
|------|--------------|----------|
| Meal break before 5th hour missing | US_CA | CRITICAL MISSED_MEAL |
| Shift change <14d notice | US_NY | PREDICTIVE_NOTICE + premium pay |
| Minor scheduled past 21:30 | US_FED | MINOR_END_TIME |
| Double time after 12h shift | US_CA | DOUBLE_TIME violation flagged |
| Tip credit below threshold | US_FL | TIP_CREDIT_THRESHOLD |
| Turnaround <10h (close→open) | US_CA | TURNAROUND violation |

Automate via synthetic schedule generator + rule permutations.

### 7.15 Extensibility
- New jurisdiction: add JSON rule file + mapping in `jurisdictionLoader`.
- New compliance dimension: extend `ComplianceViolation.type` union and add evaluator.
- Feature flagging of predictive scheduling module: `enablePredictiveScheduling` per venue.

### 7.16 Risks & Mitigations (Compliance Specific)
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Mis-configured jurisdiction rules | False violations / missing enforcement | Versioned rule sets + checksum validation |
| Over-reliance on heuristic detection | Missed edge cases | Periodic legal review + regression suite |
| Manager override abuse | Compliance drift | Mandatory rationale + weekly override report |
| Tip allocation errors | Wage violations | Daily reconciliation + alert if deficit > threshold |
| Predictive scheduling complexity | Performance degradation | Cache processed notice windows; incremental diff calculation |

---

## 8. Historical & Strategic Analytics

### 8.1 Purpose
Transform raw labor, scheduling, and demand data into strategic insights: multi-period trend analysis, efficiency benchmarking, role productivity, seasonality extraction, forecast accuracy tracking, and optimization impact measurement.

### 8.2 Data Warehouse Layer (Analytical Schema)
Star schema additions (could be implemented in OLAP store or Postgres materialized views):
| Table | Type | Notes |
|-------|------|-------|
| `fact_labor_hour` | Fact | Granularity: venue_id + date + hour + role |
| `fact_shift` | Fact | One row per published shift (final assignment state) |
| `fact_clock_event` | Fact | Flattened clock records with break expansion |
| `fact_forecast_accuracy` | Fact | Hour-level forecast vs actual metrics |
| `dim_role` | Dimension | Role attributes (department, tipEligible) |
| `dim_employee` | Dimension | Non-PII hashed if archived |
| `dim_date` | Dimension | Calendar attributes (isHoliday, weekOfYear) |

Example `fact_labor_hour` columns:
```sql
CREATE TABLE fact_labor_hour (
  id uuid primary key,
  venue_id text,
  date date,
  hour int,
  role text,
  scheduled_count int,
  active_count int,
  scheduled_minutes int,
  worked_minutes int,
  overtime_minutes int,
  labor_cost numeric(10,2),
  revenue numeric(10,2),
  forecast_covers int,
  actual_covers int,
  coverage_gap int,        -- required - active_count
  coverage_over int,       -- active_count - required - tolerance
  created_at timestamptz default now()
);
```

### 8.3 Key Strategic Metrics
| Metric | Formula | Insight |
|--------|---------|---------|
| Labor Cost % Trend | laborCostPercent over trailing 13 weeks | Efficiency trajectory |
| Forecast Accuracy (MAE) | mean(|actual - forecast|) per hour | Model performance |
| Coverage Quality Index | 1 - (underStaffHours / totalStaffedHours) | Scheduling effectiveness |
| Overtime Ratio | overtimeHours / totalLaborHours | Policy adherence |
| Tip Credit Utilization | tippedHours using credit / totalTippedHours | Wage strategy |
| Role Productivity | revenueAttributedToRole / laborCostRole | Profitability by role |
| Shift Stability | shiftsChangedWithinNotice / totalShifts | Predictive scheduling effectiveness |
| Break Compliance Rate | compliantShifts / totalLongShifts | Operational health |

### 8.4 Productivity Attribution Model
Revenue attribution by role using proportional presence weighting + station modifiers:
```
roleRevenueShare_r = Σ_hours (activeEmployees_r / totalFOHActiveEmployees * hourlyRevenue)
adjusted by station weight (e.g., bartender 1.2, server 1.0, host 0.8)
```
Derived metric:
```
roleProductivity_r = roleRevenueShare_r / roleLaborCost_r
```

### 8.5 Forecast Accuracy Tracking
Maintain per model version stats:
```typescript
interface ForecastAccuracyStats {
  modelVersion: string;
  periodStart: Date;
  periodEnd: Date;
  maeCovers: number;     // Mean Absolute Error
  mapeRevenue: number;   // Mean Absolute Percentage Error
  bias: number;          // avg(actual - forecast)
  highVarianceHours: number; // count of hours with |error| > 2 * std
}
```
Auto-generate improvement suggestions (e.g., incorporate weather, event lead time) when `mapeRevenue > threshold`.

### 8.6 Seasonality & Pattern Extraction
Weekly pattern detection:
```sql
SELECT hour, avg(actual_covers) AS avg_covers
FROM fact_labor_hour
WHERE date BETWEEN :start AND :end
GROUP BY hour ORDER BY hour;
```
Seasonality index:
```
seasonalityIndex_hour = avgCovers_hour / overallHourlyAverage
```
Use index to adjust candidate shift templates (e.g., heavier evening staffing Friday).

### 8.7 Optimization Impact Measurement
Compare pre/post improvement runs:
```typescript
interface OptimizationImpact {
  scheduleId: string;
  baselineCost: number;
  optimizedCost: number;
  costSavings: number;              // baseline - optimized
  baselineUnderStaffHours: number;
  optimizedUnderStaffHours: number;
  coverageImprovementPercent: number;
  fairnessImprovement: number;      // delta fairnessScore
  overtimeReductionHours: number;
}
```
Persist record for cumulative ROI dashboard.

### 8.8 Trend Visualizations (UI Requirements)
- Multi-line chart: laborCostPercent vs target band (25–35%).
- Bar + line combo: scheduled vs worked hours per role weekly.
- Heatmap: forecast accuracy by hour-of-day vs day-of-week.
- Scatter: productivity vs laborCostPercent by role (quadrant classification).
- Delta cards: cost savings last 4 weeks vs previous 4 weeks.

### 8.9 Benchmarking (Multi-Venue Chains)
Add chain-level aggregates:
| Benchmark | Definition |
|-----------|------------|
| Labor Cost Variance | venue laborCostPercent - chain average |
| Productivity Delta | roleProductivity - chain role median |
| Forecast Accuracy Rank | percentile rank by mapeRevenue |
|
Outliers flagged for review; recommendations feed into chain ops dashboards.

### 8.10 Data Quality Safeguards
- Reject anomalous clock durations > 20h unless overnight flag set.
- Mark revenue zero-hours separately (closed vs missing data).
- Recalculate aggregates nightly; if drift > 1% from prior computation trigger re-sync job.
- Maintain checksum per fact table partition for audit.

### 8.11 Archival & Roll-Up Strategy
- After 90 days: roll `fact_clock_event` into hourly aggregates only.
- After 1 year: compress hourly to daily for low-use metrics (keeping raw for peak season weeks).
- Store partition hints: `labor_YYYY_MM` for efficient pruning.

### 8.12 Analytics API Endpoints
```typescript
getLaborTrend: protectedProcedure
 .input(z.object({ venueId: z.string(), range: z.enum(['4w','13w','52w']) }))
 .query(...);

getForecastAccuracy: protectedProcedure
 .input(z.object({ venueId: z.string(), modelVersion: z.string().optional() }))
 .query(...);

getOptimizationImpacts: protectedProcedure
 .input(z.object({ venueId: z.string(), limit: z.number().default(20) }))
 .query(...);

getRoleProductivity: protectedProcedure
 .input(z.object({ venueId: z.string(), start: z.string(), end: z.string() }))
 .query(...);
```

### 8.13 Security & Access Control
- Chain-level benchmarking requires `ORG_ADMIN` role.
- Productivity metrics exclude individual employee identifiers for privacy (role-level aggregation).
- Export endpoints rate-limited & require signed URL for large CSV extracts.

### 8.14 Testing & Validation
- Unit: formula recalculation (MAE, MAPE, seasonalityIndex).
- Integration: warehouse ETL job produces expected row counts.
- Regression: forecast accuracy stats remain stable after model change migration.
- Performance: trend queries return <1.5s P95 on 1-year dataset.

### 8.15 Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Forecast accuracy misinterpreted | Provide bias + variance context tooltip |
| Productivity attribution disputed | Allow configurable station weights & audit log of changes |
| Large chain data volume slowdown | Partition + materialized views + columnar extensions (e.g., Citus or ClickHouse) |
| Data quality drift | Scheduled validation jobs + checksum alerts |

---

## 9. Integration & External Data

### 9.1 External Data Sources
| Source | Purpose | Data Fields | Refresh Strategy |
|--------|---------|-------------|------------------|
| Weather API (e.g., OpenWeather) | Impact patio covers / walk-ins | temperature, precipitationProb, conditionCode | 2h cadence, daily prefetch 14d |
| Local Events API (Ticketing/City Calendar) | Demand spikes | eventName, startTime, attendanceEstimate, distanceMiles | Daily at 02:00 + manual refresh |
| Holidays Calendar | Seasonality / closures | holidayName, date, type | Static yearly preload |
| POS Sales Webhook | Real-time revenue & covers | orderTotal, items, timestamp, tableId | Event-driven |
| Payroll System (optional) | Official pay rates | employeeId, payRate, payType | Nightly sync |
| HR / ATS Feed | New hires, terminations | employeeProfile, statusChange | Hourly poll or webhook |

### 9.2 Integration Layer Architecture
```
                External APIs / Feeds
                         │
                 ┌───────┴────────┐
                 │  Ingestion Adapters│ (per source)
                 └───────┬────────┘
                         │ normalized events
                   mapping & validation
                         │
                     integration_queue (NATS/Kafka)
                         │
        ┌────────────────┴────────────────┐
        │                                 │
  Persistence Writer                Forecast Feature Augmentor
        │                                 │
  (stores raw + transformed)        (enrich ForecastInputs)
        │                                 │
        ▼                                 ▼
  external_data tables            demand forecasting pipeline
```

### 9.3 Data Normalization Contracts
```typescript
interface WeatherNormalized {
  source: 'openweather';
  venueId: string;
  fetchedAt: Date;
  forecastHour: string; // ISO hour
  temperatureC: number;
  precipitationProb: number; // 0-1
  condition: 'CLEAR' | 'RAIN' | 'SNOW' | 'CLOUDS' | 'STORM';
}

interface EventNormalized {
  source: 'city_calendar';
  venueId: string;
  eventId: string;
  name: string;
  start: Date;
  end: Date;
  expectedAttendance: number;
  distanceMiles: number;
  category: 'SPORTS' | 'CONCERT' | 'FESTIVAL' | 'CONVENTION' | 'HOLIDAY';
  impactScore: number; // derived weighting
}
```

### 9.4 Impact Scoring Model (Events)
```
impactScore = baseWeight(category) * attendanceFactor * proximityFactor * timeAlignment
attendanceFactor = log10(expectedAttendance + 1)
proximityFactor = 1 / (1 + distanceMiles/5)
timeAlignment = gaussian(peakHourDifference)
```
Used to adjust forecast via multiplier:
```
forecastAdjustment = 1 + Σ_activeEvents impactScore * 0.05 (capped at +0.40)
```

### 9.5 Weather Adjustment Heuristics
| Condition | Patio Seats | Server Staffing | Bar Impact |
|-----------|-------------|-----------------|------------|
| CLEAR (mild) | +100% usage | Normal | Normal |
| RAIN | 0% patio | -1 server if low baseline | +10% bar |
| STORM | 0% patio | -2 servers (if baseline >5) | +15% bar |
| HEAT (>32C) | 40% patio | +1 bartender (cold drinks) | Normal |
| COLD (<5C) | 0% patio | -1 server (if baseline >4) | +5% bar |

Adjustment applied to `recommendedServers` and role counts before schedule generation.

### 9.6 External Data Storage (Raw + Processed)
```sql
CREATE TABLE external_weather_raw (... jsonb payload ...);
CREATE TABLE external_events_raw (... jsonb payload ...);
CREATE TABLE external_events_processed (
  id uuid primary key,
  venue_id text,
  event_id text,
  start timestamptz,
  end timestamptz,
  expected_attendance int,
  distance_miles numeric(5,2),
  category text,
  impact_score numeric(5,3),
  created_at timestamptz default now()
);
```

### 9.7 Error Handling & Resilience
- API Retry with exponential backoff (max 5 attempts) for transient errors.
- Circuit breaker: disable source for 30m after continuous failures.
- Fallback mode: if weather unavailable, use last successful forecast or neutral baseline.
- Event feed lag detection: if no updates >48h, alert ops.

### 9.8 Security Considerations
- Store API keys encrypted (KMS/Secrets Manager).
- Rate limit outgoing requests to provider quotas.
- Validate payload schema (zod) before ingestion; reject unknown fields (log for monitoring).
- PII from payroll / HR minimized; only employeeId + payRate required.

### 9.9 Manual Override UI
Managers can:
- Add one-off local event with expected attendance.
- Force weather scenario (training / what-if) with expiration time.
- Apply forecast multiplier (0.8–1.4) for specific date range.
All overrides produce audit log entries referencing source `MANUAL`.

### 9.10 Integration API Endpoints
```typescript
createLocalEvent: protectedProcedure
 .input(z.object({ venueId: z.string(), name: z.string(), start: z.string(), end: z.string(), expectedAttendance: z.number(), distanceMiles: z.number().min(0).max(100), category: z.enum(['SPORTS','CONCERT','FESTIVAL','CONVENTION','HOLIDAY']) }))
 .mutation(...);

overrideWeatherScenario: protectedProcedure
 .input(z.object({ venueId: z.string(), hour: z.string(), condition: z.enum(['CLEAR','RAIN','SNOW','CLOUDS','STORM']), temperatureC: z.number(), precipitationProb: z.number().min(0).max(1), expiresAt: z.string() }))
 .mutation(...);

setForecastMultiplier: protectedProcedure
 .input(z.object({ venueId: z.string(), start: z.string(), end: z.string(), multiplier: z.number().min(0.8).max(1.4) }))
 .mutation(...);
```

### 9.11 Observability
- Metrics: `integration_events_processed`, `integration_failures{source}`, `forecast_adjustment_applied_total`.
- Logs: structured JSON with `correlationId`, `source`, `status`, `latencyMs`.
- Traces: span per external call including retries.

### 9.12 Testing Strategy
- Mock adapters with canned responses.
- Chaos tests: inject 500ms–2s latency and random 429/500 codes.
- Contract tests: validate schema drift if provider changes.
- Integration performance: ensure complete daily event enrichment run < 2m for 500 venues.

### 9.13 Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Provider API quota exhaustion | Adaptive rate limit + secondary provider fallback |
| Incorrect impact amplification | Cap total forecastAdjustment + monitor variance |
| Manual override abuse | Audit + weekly override summary report |
| Schema changes upstream | Daily contract diff + alert |
| Latency delaying schedule generation | Pre-fetch at 02:00 + stale tolerance window |

---

## 10. UI/UX Flows & Interaction Design

### 10.1 Design Principles
- Clarity over density: complex optimization distilled into intuitive badges & color cues.
- Progressive disclosure: advanced metrics/adjustments hidden until user expands.
- Real-time responsiveness: key dashboard tiles update without full refresh.
- Action-first: recommendations present buttons (Release, Extend, Swap) inline.

### 10.2 Primary Screens
| Screen | Purpose | Key Components |
|--------|---------|----------------|
| Scheduling Dashboard | Weekly overview + optimization status | WeekHeader, CoverageHeatmap, MetricsPanel, RecommendationSidebar |
| Draft Schedule Builder | Iterative refinement pre-publication | RoleTimeline, ShiftList, FairnessMeter, ViolationPanel |
| Real-Time Labor | Operational monitoring | LiveMetricsTicker, RoleActiveCards, AnomalyFeed, ActionButtons |
| Compliance Review | Pre-publication & audit | ViolationTable, PremiumCostBreakdown, OvertimeProjectionGraph |
| Historical Analytics | Strategic trends | TrendCharts, ProductivityScatter, ForecastAccuracyMatrix |
| Integration Overrides | Manage external influences | EventList, WeatherScenarioCard, ForecastMultiplierForm |

### 10.3 Component Sketches (Textual)
CoverageHeatmap:
```
Hours ↓ / Roles →  | SERVER | LINE_COOK | PREP_COOK | HOST | BARTENDER
06:00              |  1/1   |  1/1      | 0/0       | 0/0  | 0/0
12:00              |  4/5⚠  |  3/3      | 1/1       |1/1   | 1/1
18:00              |  6/6✔  |  4/4✔     | 2/2✔      |1/1✔  | 2/2✔
Color: Red=Under, Amber=Slight Under, Green=Met, Blue=Over (> tolerance)
```

FairnessMeter:
```
Employee Hours Distribution
Target vs Scheduled (bar divergence) + overall fairnessScore badge
```

RecommendationSidebar:
```
[Action Pill] Release 1 server @15:30 (MEDIUM) [Apply]
Rationale: Demand variance -28%, overstaff +3
Impact: Save $42.50 | Coverage Risk: Low
```

ViolationPanel:
```
⚠ MISSED_MEAL (CRITICAL) Shift S123 - Server Jane - Break not scheduled before 5h mark
Suggestion: Split shift or insert 30m meal at 13:30
```

### 10.4 Core Interaction Flows

#### Flow A: Generate & Publish Schedule
1. Manager opens Scheduling Dashboard → sees “No schedule for Week W” CTA.
2. Click “Generate Draft” → spinner + progress steps (Requirements → Greedy → Improvement → Metrics).
3. Draft displayed: coverage heatmap + violations.
4. Manager adjusts individual shift (drag end time) → live recalculates fairness & coverage.
5. Run “Optimize Fairness” pass → updated metrics.
6. Compliance Review → all CRITICAL resolved or acknowledged.
7. Publish → confirm dialog with cost breakdown & predictive premium summary.
8. Employees notified → push + email; pending confirmations appear.

#### Flow B: Real-Time Understaff Alert
1. `labor.alert.coverage_gap` event triggers red toast.
2. Sidebar auto-focus recommendation: “Extend Shift S444 by 1h for line cook.”
3. Manager clicks “Extend” → modal confirms break compliance & overtime projection.
4. Shift updated + employees optionally re-paged.
5. Metrics ticker updates coverage score.

#### Flow C: Manual Forecast Override (Event Added)
1. Manager navigates Integration Overrides.
2. Adds event “Food Festival” attendance 5,000 at 2 blocks away.
3. Impact preview: +18% dinner covers Friday 17–21.
4. Accept → recompute next 72h staffing forecast; suggestions queue “Add 1 prep cook Friday afternoon”.

#### Flow D: Compliance Violation Resolution
1. ViolationPanel lists MISSED_MEAL upcoming shift (starts 09:00, no break until 15:00).
2. Click “Insert Break” → UI auto splits shift 12:30–13:00.
3. Re-eval compliance: violation removed; cost unaffected.

### 10.5 Interaction States & Feedback
- Loading: skeleton heatmap cells + pulsing metrics.
- Optimizing: show step label “Local Search Iteration 42/200”.
- Error: inline banner with retry button, preserve current state.
- Success: ephemeral green toast “Schedule optimized (Cost -4.2%, Fairness +7%)”.

### 10.6 Accessibility
- Keyboard shift editing (arrow keys adjust start/end in 15m increments + Enter to commit).
- ARIA live region for real-time metric changes.
- Color-blind friendly palette (patterns overlay for under/over states).
- High-contrast mode toggles iconography emphasis.

### 10.7 Performance UX Considerations
- Virtualize long employee lists (React windowing) for large venues.
- Debounce drag adjustments (150ms) before recomputing metrics.
- WebSocket diff patches (send changed cells only) to coverage heatmap.

### 10.8 Notification Strategy
| Channel | Use |
|---------|-----|
| Push (mobile) | Shift assignment, schedule published |
| Email | Weekly schedule summary, compliance notices requiring action |
| In-app toast | Real-time alerts, optimization results |
| SMS (optional) | Critical last-minute changes (opt-in) |

### 10.9 Visual Tokens
| Token | Meaning |
|-------|---------|
| Badge “✔” | Coverage met |
| Badge “⚠” | Slight under (≤1 gap) |
| Badge “✖” | Understaff >1 |
| Outline Blue | Overstaff beyond tolerance |
| Purple Dot | Overtime risk in next 2h |
| Red Dot | Compliance critical pending |

### 10.10 Security & Permissions UX
- Role-based action gating: employees see personal shifts + confirmation button only.
- Manager view: all scheduling + override controls.
- Org admin: benchmarking & chain-level heatmaps.
- Disabled actions show tooltip “Insufficient permission (need MANAGER)”.

### 10.11 Error Scenarios & Recovery
| Scenario | UX Response |
|----------|-------------|
| Socket disconnect | Banner “Realtime disconnected – reconnecting…” with manual retry |
| Optimization timeout | Offer partial schedule with improvement resume button |
| Forecast override conflict | Modal diff comparison (existing events vs new override) |
| Concurrent edit (other manager) | Shift row lock icon + last editor name + refresh button |

### 10.12 Mobile Adaptive Patterns
- Collapsible role tabs; single-hour vertical timeline scroll.
- Floating action button (FAB) for “Generate Draft / Optimize / Publish”.
- Slide-in recommendation drawer.

### 10.13 Component Contracts (Frontend)
```typescript
type ShiftCellProps = {
  shiftId: string;
  role: EmployeeRole;
  start: string; // ISO
  end: string;   // ISO
  overtimeRisk?: boolean;
  complianceFlags?: string[];
  onAdjust: (deltaMinutes: number) => void;
};

type RecommendationCardProps = {
  recommendation: Recommendation;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
};
```

### 10.14 Design Validation Checklist
- Clear difference between under vs over coverage
- Compliance issues never hidden (always surfaced until resolved/ack)
- Optimization results understandable without reading spec
- Mobile first interactions tested for core flows (publish, confirm shift)
- Loading states present for every async action

### 10.15 Risks & Mitigations (UX Specific)
| Risk | Mitigation |
|------|------------|
| Cognitive overload | Progressive disclosure + summaries before detail |
| Misinterpretation of colors | Add numeric coverage deltas + patterns |
| Recommendation distrust | Provide rationale + impact estimate always |
| Slow perception of real-time | Push diff patches + update timestamp label |
| Drag edit causing accidental break violations | Inline warning + undo snackbar |

---

## 11. Implementation Roadmap & Phasing

### 11.1 Phase Overview
| Phase | Focus | Key Deliverables | Dependencies | Success Criteria |
|-------|-------|------------------|--------------|------------------|
| P1 | Core Data & Forecast | Prisma models (Shift, ClockRecord, DemandForecast), basic ensemble forecast, manual schedule creation | Existing Employee & Venue schema | Forecast MAE < 25% first month |
| P2 | Draft Schedule Generation | Candidate shift generator, greedy assignment, fairness metrics, coverage heatmap UI | P1 | Draft generation < 20s for 1 week |
| P3 | Optimization & Compliance | Local search improvement, compliance evaluator, violation panel, overtime projection | P2 | Coverage gap hours reduced ≥ 40% vs greedy |
| P4 | Real-Time Labor Layer | Event ingestion pipeline, metrics ticker, recommendations engine (basic) | P3 + POS integration | Labor metrics latency < 10s P95 |
| P5 | Advanced Recommendations & Analytics | Anomaly detection, historical warehouse, optimization impact tracking | P4 | Productivity & coverage dashboards live |
| P6 | External Data Integration | Weather + events impact scoring, manual override UI | P5 | Forecast lifts measurable on event days |
| P7 | Full Compliance & Predictive Scheduling | Jurisdiction rule sets, premium pay calculations, audit log | P6 | All critical violations blocked pre-publication |
| P8 | Strategic Benchmarking & Chain Features | Multi-venue aggregates, role productivity normalization | P7 | Chain-level variance reports available |
| P9 | UX Polish & Performance Hardening | Virtualization, accessibility, diff WebSocket patches | P8 | P95 page interactions < 300ms |
| P10 | ML Model Iteration & Continuous Improvement | Advanced model (gradient boosting / Prophet), automated retraining | P6+ | MAPE Revenue < 15% sustained |

### 11.2 Detailed Task Breakdown (Representative)
Phase P2 Example:
- Implement `buildHourlyRequirements()` aggregator
- Create candidate shift template library per role
- Implement cost & fairness scoring utilities
- Add tRPC `generateDraftSchedule` mutation
- Build CoverageHeatmap component (placeholder cells) then real data
- Unit tests for candidate generation edge cases (overnight, short day)

### 11.3 Migration Strategy
- Add new tables with non-blocking migrations; backfill DemandForecast in background.
- Introduce Shift model with minimal fields; extend gradually (scheduledCost after pay integration).
- Use feature flags: `enableSchedulingDraft`, `enableRealTimeLabor`, `enableComplianceEngine`.

### 11.4 Rollout & Monitoring
1. Shadow Mode: generate schedules without publishing; compare manual vs system metrics.
2. Limited Venue Pilot (5 venues diverse demand patterns).
3. Expand after meeting accuracy & cost improvement thresholds.
4. Enable real-time engine once ingestion stability confirmed.

### 11.5 KPIs & Measurement
- Forecast Accuracy: MAE covers/hour, MAPE revenue/day.
- Scheduling Efficiency: Understaff hours / total hours.
- Cost Impact: LaborCostPercent delta vs baseline period.
- Overtime Reduction: overtimeHours / week pre vs post.
- Compliance Health: critical violations per published schedule.
- Recommendation Adoption: appliedRecommendations / totalGenerated.

### 11.6 Risks & Contingencies (Roadmap)
| Risk | Phase | Contingency |
|------|-------|------------|
| Forecast underperforms | P1-P2 | Increase historical window, add external factors earlier |
| Optimization performance issues | P3 | Reduce candidate shift space, implement pruning heuristics |
| Real-time ingestion instability | P4 | Queue buffering + backpressure; degrade to 60s refresh |
| Jurisdiction complexity creep | P7 | Prioritize top 3 regions first; abstract rule engine |
| ML retraining drift | P10 | Scheduled validation + rollback to last stable model |

### 11.7 Decommission / Backout Plan
- Feature flags allow quick disable of optimization or compliance modules.
- Maintain legacy manual scheduling path until P4 stabilized.
- Rollback scripts for dropping unreferenced experimental tables.

## 12. Non-Functional Requirements (NFRs)

### 12.1 Performance
- Schedule generation (P2 baseline): < 20s for 7-day, 5 roles, 100 employees.
- Optimization improvement pass (200 iterations): < 30s total.
- Real-time metric update latency: < 10s P95 from clock event.
- Forecast batch job (14d horizon): < 3m for 500 venues.

### 12.2 Scalability
- Horizontal scaling for ingestion workers (stateless event processors).
- Partition analytics fact tables by month for query pruning.
- WebSocket fan-out via rooms per venue; avoid global broadcast.

### 12.3 Reliability & Availability
- Core scheduling API uptime target: 99.9%.
- Retry idempotent external calls; store raw payload for replay (at least 7 days retention).
- Circuit breaker for external sources to prevent cascading failures.

### 12.4 Security
- Principle of least privilege for payroll integration (read-only pay rates).
- Encrypt sensitive config (API keys) at rest and in transit.
- Role-based access controls enforced at tRPC layer (manager vs employee vs org admin).

### 12.5 Observability
- Metrics: forecast_accuracy, schedule_generation_duration, recommendation_apply_rate.
- Structured logging with correlationId for end-to-end request tracing.
- Alerting thresholds: schedule_generation_duration > 25s (warn), > 40s (critical).

### 12.6 Maintainability
- Modular services: forecasting, optimization, compliance, real-time.
- Clear interfaces with TypeScript types; forbid circular dependencies.
- Automated lint + type checks in CI pipeline.

### 12.7 Testability
- Deterministic seed for optimization randomness to reproduce results.
- Fixture data sets for: low demand week, holiday spike, weather event.
- Contract tests for external adapters (snapshot response shapes).

### 12.8 Privacy
- Hash PII on archival beyond retention window; restrict raw access to compliance roles.
- Anonymize productivity metrics at role-level only (no per-employee revenue attribution shown publicly).

### 12.9 Compliance (Operational)
- Maintain audit log for every override and compliance violation resolution.
- Annual rule review process; version rules with semantic versioning (e.g., `ruleset-US_CA-2.1.0`).

### 12.10 Resilience & Degradation Modes
- If optimization service down: fallback to greedy draft + warning banner.
- If real-time ingestion degraded: switch to periodic batch (5m) with UI badge.
- If external data unavailable: neutral forecast adjustments (multiplier = 1).

### 12.11 Resource Utilization Targets
- Optimization CPU usage per run: < 1 core average.
- Memory footprint for candidate shift set: < 150MB for 100 employees, 1 week horizon.

### 12.12 Internationalization & Localization (Future)
- Support local time zones per venue for schedule display.
- Localize compliance violation descriptions (i18n keys).

### 12.13 Security Threat Considerations
- Avoid schedule manipulation via forged clock events (sign webhooks + replay protection nonce).
- Prevent privilege escalation on recommendation application (server-side validation of action).

### 12.14 Sustainability & Cost Efficiency
- Batch forecast jobs during off-peak hours to leverage lower-cost compute windows.
- Use incremental warehouse loads vs full rebuild to reduce IO.

### 12.15 Success Metrics (NFR Validation)
| NFR | Metric | Target |
|-----|--------|--------|
| Performance | draftGenerationTime | < 20s |
| Reliability | uptime | ≥ 99.9% |
| Forecast Accuracy | MAPE revenue | < 15% |
| Cost Impact | laborCostPercentReduction | ≥ 3% vs baseline |
| Compliance | criticalViolationsPostPublish | 0 |
| Adoption | recommendationApplyRate | ≥ 50% |

---

END OF SPEC

Revision Log:
- v1.0 Initial draft complete (Sections 1–12)

Next Steps Options:
1. Generate implementation tickets from Phase P1–P2 tasks.
2. Create test plan doc referencing NFRs & compliance checks.
3. Begin schema migration PR for new models.
Reply with option number or request changes.
