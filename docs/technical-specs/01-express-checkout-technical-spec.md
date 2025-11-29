# Express Checkout System - Technical Specification

**Component:** Express Checkout & Tab Management
**Version:** 1.0
**Date:** 2025-11-25
**Author:** Technical Architect

---

## Overview

The Express Checkout system is Crowdiant's primary differentiator, enabling customers to "leave when ready" without waiting for the check. This document provides detailed technical specifications for implementation.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  Server POS Terminal  │  Customer Mobile Web  │  Manager Dashboard│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│  Next.js App Router + tRPC + NextAuth + Socket.io Client        │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│  tRPC API    │    │  Socket.io       │    │  Background  │
│  (tab router)│    │  (real-time)     │    │  Workers     │
└──────────────┘    └──────────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INTEGRATION LAYER                           │
│  Stripe API  │  Twilio API  │  Redis Cache  │  BullMQ Queues   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  PostgreSQL (Prisma ORM) + Row Level Security                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Machine Specification

### Tab States

```typescript
enum TabStatus {
  PENDING_AUTH = 'PENDING_AUTH',  // Initial state, awaiting pre-auth
  OPEN = 'OPEN',                  // Pre-auth successful, items can be added
  CLOSING = 'CLOSING',            // Close initiated, awaiting tip
  WALK_AWAY = 'WALK_AWAY',        // Customer left, grace period active
  AUTO_CLOSED = 'AUTO_CLOSED',    // System closed after walk-away
  CLOSED = 'CLOSED',              // Successfully closed, payment captured
  FAILED = 'FAILED'               // Pre-auth failed or payment error
}
```

### State Transitions

```typescript
interface StateTransition {
  from: TabStatus;
  to: TabStatus;
  trigger: string;
  guard?: (tab: Tab) => boolean;
  action?: (tab: Tab) => Promise<void>;
}

const transitions: StateTransition[] = [
  {
    from: 'PENDING_AUTH',
    to: 'OPEN',
    trigger: 'preAuthSucceeded',
    action: async (tab) => {
      await generateAccessToken(tab.id);
      await sendConfirmationSMS(tab);
    }
  },
  {
    from: 'PENDING_AUTH',
    to: 'FAILED',
    trigger: 'preAuthDeclined',
    action: async (tab) => {
      await notifyServer(tab.serverId, 'Card declined');
    }
  },
  {
    from: 'OPEN',
    to: 'CLOSING',
    trigger: 'closeInitiated',
    guard: (tab) => tab.totalCents > 0,
    action: async (tab) => {
      // Wait for tip if customer self-close
    }
  },
  {
    from: 'OPEN',
    to: 'WALK_AWAY',
    trigger: 'walkAwayDetected',
    action: async (tab) => {
      await sendWalkAwayWarningSMS(tab);
      await scheduleAutoClose(tab.id, 15); // 15 min grace
    }
  },
  {
    from: 'CLOSING',
    to: 'CLOSED',
    trigger: 'paymentCaptured',
    action: async (tab) => {
      await releaseExcessPreAuth(tab);
      await generateReceipt(tab);
      await sendReceiptSMS(tab);
    }
  },
  {
    from: 'WALK_AWAY',
    to: 'AUTO_CLOSED',
    trigger: 'gracePeriodExpired',
    action: async (tab) => {
      await capturePreAuth(tab, 0); // 0% tip
      await logWalkAwayEvent(tab);
    }
  },
  {
    from: 'WALK_AWAY',
    to: 'CLOSING',
    trigger: 'customerResponded',
    action: async (tab) => {
      await cancelAutoCloseJob(tab.id);
    }
  }
];
```

### State Machine Implementation

```typescript
// lib/state-machines/tab-state-machine.ts

import { Tab, TabStatus } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export class TabStateMachine {
  private transitions: Map<string, StateTransition>;
  
  constructor() {
    this.transitions = new Map();
    this.registerTransitions();
  }
  
  private registerTransitions() {
    transitions.forEach(t => {
      const key = `${t.from}->${t.to}`;
      this.transitions.set(key, t);
    });
  }
  
  async transition(
    tab: Tab, 
    trigger: string, 
    context?: Record<string, unknown>
  ): Promise<Tab> {
    const targetState = this.getTargetState(tab.status, trigger);
    
    if (!targetState) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid transition: ${tab.status} -> ${trigger}`
      });
    }
    
    const transition = this.transitions.get(`${tab.status}->${targetState}`);
    
    // Check guard condition
    if (transition?.guard && !transition.guard(tab)) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Transition guard failed'
      });
    }
    
    // Execute transition action
    if (transition?.action) {
      await transition.action(tab);
    }
    
    // Update tab status
    const updatedTab = await prisma.tab.update({
      where: { id: tab.id },
      data: { 
        status: targetState,
        updatedAt: new Date()
      }
    });
    
    // Log transition
    await this.logTransition(tab.id, tab.status, targetState, trigger);
    
    return updatedTab;
  }
  
  private getTargetState(current: TabStatus, trigger: string): TabStatus | null {
    for (const t of transitions) {
      if (t.from === current && t.trigger === trigger) {
        return t.to;
      }
    }
    return null;
  }
  
  private async logTransition(
    tabId: string, 
    from: TabStatus, 
    to: TabStatus, 
    trigger: string
  ) {
    await prisma.tabStatusHistory.create({
      data: {
        tabId,
        fromStatus: from,
        toStatus: to,
        trigger,
        timestamp: new Date()
      }
    });
  }
  
  canTransition(current: TabStatus, trigger: string): boolean {
    return this.getTargetState(current, trigger) !== null;
  }
}
```

---

## Payment Flow Specification

### Pre-Authorization Sequence

```
┌────────┐         ┌─────────┐         ┌────────┐         ┌─────────┐
│ Server │         │   App   │         │ Stripe │         │Customer │
└───┬────┘         └────┬────┘         └───┬────┘         └────┬────┘
    │                   │                  │                   │
    │ 1. Open Tab       │                  │                   │
    ├──────────────────>│                  │                   │
    │                   │                  │                   │
    │                   │ 2. Create Payment│                   │
    │                   │    Method (card) │                   │
    │                   ├─────────────────>│                   │
    │                   │                  │ 3. Tokenize card  │
    │                   │                  ├──────────────────>│
    │                   │                  │<──────────────────┤
    │                   │<─────────────────┤  4. pm_xxx token  │
    │                   │                  │                   │
    │                   │ 5. Create PaymentIntent              │
    │                   │    (capture_method: manual)          │
    │                   ├─────────────────>│                   │
    │                   │                  │                   │
    │                   │ 6. Confirm PaymentIntent             │
    │                   ├─────────────────>│                   │
    │                   │                  │ 7. Authorize card │
    │                   │                  ├──────────────────>│
    │                   │                  │<──────────────────┤
    │                   │<─────────────────┤  8. Approved      │
    │                   │                  │                   │
    │   9. Tab opened   │                  │                   │
    │   (QR code)       │                  │                   │
    │<──────────────────┤                  │                   │
    │                   │                  │                   │
    │                   │ 10. Send SMS     │                   │
    │                   │    (via Twilio)  │                   │
    │                   ├─────────────────────────────────────>│
    │                   │                  │                   │
```

### Pre-Authorization Implementation

```typescript
// server/api/routers/tab.ts

import Stripe from 'stripe';
import { z } from 'zod';
import { protectedProcedure } from '../trpc';

export const openWithExpressCheckout = protectedProcedure
  .input(z.object({
    venueId: z.string(),
    tableId: z.string().optional(),
    paymentMethodId: z.string(), // pm_xxx from Stripe Elements
    customerPhone: z.string().optional(),
    customerEmail: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { venueId, tableId, paymentMethodId, customerPhone, customerEmail } = input;
    
    // 1. Get venue settings
    const venue = await ctx.prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        preAuthAmountCents: true,
        stripeAccountId: true,
        currency: true
      }
    });
    
    if (!venue?.stripeAccountId) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Venue Stripe account not configured'
      });
    }
    
    // 2. Calculate pre-auth amount (consider trust level if customer known)
    let preAuthAmount = venue.preAuthAmountCents;
    
    if (customerEmail) {
      const customer = await ctx.prisma.user.findUnique({
        where: { email: customerEmail },
        include: { 
          trustScores: { 
            where: { venueId },
            select: { level: true }
          }
        }
      });
      
      if (customer?.trustScores[0]) {
        preAuthAmount = calculateAdjustedPreAuth(
          preAuthAmount, 
          customer.trustScores[0].level
        );
      }
    }
    
    // 3. Create Stripe PaymentIntent with pre-authorization
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    let paymentIntent: Stripe.PaymentIntent;
    
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: preAuthAmount,
        currency: venue.currency.toLowerCase(),
        payment_method: paymentMethodId,
        capture_method: 'manual', // Pre-auth only
        confirm: true,
        customer: customerEmail ? await getOrCreateStripeCustomer(customerEmail) : undefined,
        metadata: {
          venueId,
          tableId: tableId || '',
          serverId: ctx.session.user.id,
        },
        // Use Stripe Connect
        application_fee_amount: Math.floor(preAuthAmount * 0.029), // 2.9% platform fee
        transfer_data: {
          destination: venue.stripeAccountId,
        },
      });
    } catch (error) {
      // Handle declined card
      throw new TRPCError({
        code: 'PAYMENT_REQUIRED',
        message: 'Card declined. Please use a different payment method.',
        cause: error
      });
    }
    
    // 4. Create tab in database
    const tab = await ctx.prisma.tab.create({
      data: {
        venueId,
        tableId,
        serverId: ctx.session.user.id,
        customerId: customerEmail ? (await getCustomerId(customerEmail)) : null,
        status: 'OPEN',
        stripePaymentIntentId: paymentIntent.id,
        preAuthAmountCents: preAuthAmount,
        subtotalCents: 0,
        taxCents: 0,
        tipCents: 0,
        totalCents: 0,
        openedAt: new Date(),
      }
    });
    
    // 5. Generate access token for customer
    const accessToken = await generateTabAccessToken(tab.id);
    
    // 6. Generate QR code
    const qrCodeUrl = `${process.env.NEXTAUTH_URL}/tab/${accessToken}`;
    const qrCodeDataUrl = await generateQRCode(qrCodeUrl);
    
    // 7. Send SMS confirmation (async, don't block)
    if (customerPhone) {
      sendTabOpenSMS({
        phone: customerPhone,
        venueName: venue.name,
        tabUrl: qrCodeUrl
      }).catch(err => logger.error('SMS send failed', err));
    }
    
    // 8. Log state transition
    await ctx.prisma.tabStatusHistory.create({
      data: {
        tabId: tab.id,
        fromStatus: 'PENDING_AUTH',
        toStatus: 'OPEN',
        trigger: 'preAuthSucceeded',
        metadata: {
          paymentIntentId: paymentIntent.id,
          preAuthAmount
        }
      }
    });
    
    return {
      tab,
      qrCode: qrCodeDataUrl,
      qrCodeUrl,
      preAuthAmount
    };
  });

// Helper: Calculate adjusted pre-auth based on trust level
function calculateAdjustedPreAuth(baseAmount: number, trustLevel: number): number {
  const reductions = {
    0: 1.0,   // NEW: 100%
    1: 1.0,   // FAMILIAR: 100%
    2: 0.5,   // REGULAR: 50%
    3: 0.2,   // TRUSTED: 20%
    4: 0.0    // VIP: 0%
  };
  
  return Math.ceil(baseAmount * (reductions[trustLevel as keyof typeof reductions] || 1.0));
}
```

### Payment Capture Sequence

```typescript
// server/api/routers/tab.ts

export const closeTab = protectedProcedure
  .input(z.object({
    tabId: z.string(),
    tipCents: z.number().min(0).default(0),
  }))
  .mutation(async ({ ctx, input }) => {
    const { tabId, tipCents } = input;
    
    // 1. Get tab with payment intent
    const tab = await ctx.prisma.tab.findUnique({
      where: { id: tabId },
      include: { venue: true }
    });
    
    if (!tab) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Tab not found' });
    }
    
    if (tab.status !== 'OPEN') {
      throw new TRPCError({ 
        code: 'CONFLICT', 
        message: `Cannot close tab in ${tab.status} status` 
      });
    }
    
    // 2. Calculate final amount
    const finalAmount = tab.subtotalCents + tab.taxCents + tipCents;
    
    // 3. Check if exceeds pre-auth
    if (finalAmount > tab.preAuthAmountCents) {
      // TODO: Request additional authorization
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Amount exceeds pre-authorization. Additional auth required.'
      });
    }
    
    // 4. Capture payment intent
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    try {
      const capture = await stripe.paymentIntents.capture(
        tab.stripePaymentIntentId!,
        {
          amount_to_capture: finalAmount,
        }
      );
      
      if (capture.status !== 'succeeded') {
        throw new Error('Capture failed');
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Payment capture failed',
        cause: error
      });
    }
    
    // 5. Update tab status
    const closedTab = await ctx.prisma.tab.update({
      where: { id: tabId },
      data: {
        status: 'CLOSED',
        tipCents,
        totalCents: finalAmount,
        closedAt: new Date()
      }
    });
    
    // 6. Release excess pre-authorization (automatic with Stripe)
    // Stripe automatically releases uncaptured amount after 7 days
    // or immediately if we cancel: stripe.paymentIntents.cancel()
    
    // 7. Generate receipt
    const receipt = await generateReceipt(closedTab);
    
    // 8. Send receipt (async)
    sendReceiptNotification(closedTab, receipt).catch(err => 
      logger.error('Receipt send failed', err)
    );
    
    // 9. Award loyalty points (async)
    if (closedTab.customerId) {
      awardLoyaltyPoints(closedTab.customerId, finalAmount).catch(err =>
        logger.error('Loyalty points failed', err)
      );
    }
    
    // 10. Update trust score (async)
    if (closedTab.customerId) {
      updateTrustScore(closedTab.customerId, tab.venueId, {
        type: 'SUCCESSFUL_PAYMENT',
        amount: finalAmount,
        tipPercentage: (tipCents / tab.subtotalCents) * 100
      }).catch(err => logger.error('Trust update failed', err));
    }
    
    return {
      tab: closedTab,
      receiptUrl: receipt.url
    };
  });
```

---

## Walk-Away Detection System

### Detection Algorithm

```typescript
// workers/walk-away-detector.ts

import { Tab, TabStatus } from '@prisma/client';
import { prisma } from '../server/db';
import { logger } from '../lib/logger';

interface WalkAwaySignals {
  lastActivityMinutes: number;
  averageVisitDuration: number;
  checkRequested: boolean;
  tableCleared: boolean;
  threshold: number; // Minutes
}

export class WalkAwayDetector {
  async checkOpenTabs(): Promise<void> {
    const openTabs = await prisma.tab.findMany({
      where: { 
        status: 'OPEN',
        // Only check tabs older than 30 minutes
        openedAt: {
          lt: new Date(Date.now() - 30 * 60 * 1000)
        }
      },
      include: {
        venue: true,
        items: { orderBy: { createdAt: 'desc' }, take: 1 },
        table: true
      }
    });
    
    for (const tab of openTabs) {
      const signals = await this.gatherSignals(tab);
      
      if (this.isWalkAway(signals)) {
        await this.handleWalkAway(tab);
      }
    }
  }
  
  private async gatherSignals(tab: Tab & { items: any[], table: any, venue: any }): Promise<WalkAwaySignals> {
    // Calculate time since last order
    const lastItem = tab.items[0];
    const lastActivityMinutes = lastItem 
      ? (Date.now() - lastItem.createdAt.getTime()) / 1000 / 60
      : (Date.now() - tab.openedAt.getTime()) / 1000 / 60;
    
    // Get average visit duration for this venue (from historical data)
    const avgDuration = await this.getAverageVisitDuration(tab.venueId);
    
    // Check if table marked as cleared
    const tableCleared = tab.table?.status === 'DIRTY';
    
    // Check if server requested check
    const checkRequested = await prisma.tabEvent.findFirst({
      where: {
        tabId: tab.id,
        eventType: 'CHECK_REQUESTED'
      }
    });
    
    return {
      lastActivityMinutes,
      averageVisitDuration: avgDuration,
      checkRequested: !!checkRequested,
      tableCleared,
      threshold: tab.venue.walkAwayGraceMinutes || 30
    };
  }
  
  private isWalkAway(signals: WalkAwaySignals): boolean {
    // Multiple detection strategies
    
    // Strategy 1: No activity for extended period
    if (signals.lastActivityMinutes > signals.threshold) {
      return true;
    }
    
    // Strategy 2: Table cleared + no activity
    if (signals.tableCleared && signals.lastActivityMinutes > 15) {
      return true;
    }
    
    // Strategy 3: Check requested but not paid
    if (signals.checkRequested && signals.lastActivityMinutes > 20) {
      return true;
    }
    
    // Strategy 4: Exceeded typical visit duration significantly
    if (signals.lastActivityMinutes > signals.averageVisitDuration * 1.5) {
      return true;
    }
    
    return false;
  }
  
  private async handleWalkAway(tab: Tab): Promise<void> {
    logger.info(`Walk-away detected for tab ${tab.id}`);
    
    // 1. Update tab status
    await prisma.tab.update({
      where: { id: tab.id },
      data: { status: 'WALK_AWAY' }
    });
    
    // 2. Send warning SMS
    if (tab.customerPhone) {
      await this.sendWalkAwayWarningSMS(tab);
    }
    
    // 3. Schedule auto-close job (15 minutes grace period)
    await this.scheduleAutoClose(tab.id, 15);
    
    // 4. Notify manager
    await this.notifyManager(tab);
  }
  
  private async sendWalkAwayWarningSMS(tab: Tab): Promise<void> {
    const message = `Hi! We noticed you may have left ${tab.venue.name}. ` +
      `Your tab will auto-close in 15 minutes ($${(tab.totalCents / 100).toFixed(2)}). ` +
      `Reply WAIT if you're still dining. View tab: ${process.env.NEXTAUTH_URL}/tab/${tab.accessToken}`;
    
    await sendSMS({
      to: tab.customerPhone!,
      message,
      type: 'WALK_AWAY_WARNING'
    });
  }
  
  private async scheduleAutoClose(tabId: string, delayMinutes: number): Promise<void> {
    // Add job to BullMQ queue
    await autoCloseQueue.add(
      'auto-close-tab',
      { tabId },
      { 
        delay: delayMinutes * 60 * 1000,
        jobId: `auto-close-${tabId}` // Allows cancellation
      }
    );
  }
  
  private async getAverageVisitDuration(venueId: string): Promise<number> {
    const result = await prisma.tab.aggregate({
      where: {
        venueId,
        status: 'CLOSED',
        closedAt: { not: null },
        openedAt: { not: null }
      },
      _avg: {
        // Calculate average duration via raw SQL
      }
    });
    
    return result._avg || 60; // Default 60 minutes
  }
}

// Background worker (runs every 5 minutes)
export async function runWalkAwayDetection() {
  const detector = new WalkAwayDetector();
  await detector.checkOpenTabs();
}
```

### Auto-Close Job Handler

```typescript
// workers/auto-close-worker.ts

import { Job } from 'bullmq';
import { TabStateMachine } from '../lib/state-machines/tab-state-machine';

export async function processAutoClose(job: Job<{ tabId: string }>) {
  const { tabId } = job.data;
  
  const tab = await prisma.tab.findUnique({
    where: { id: tabId }
  });
  
  if (!tab) {
    logger.error(`Tab ${tabId} not found for auto-close`);
    return;
  }
  
  // Only auto-close if still in WALK_AWAY status
  // (customer may have responded and changed status)
  if (tab.status !== 'WALK_AWAY') {
    logger.info(`Tab ${tabId} no longer in WALK_AWAY status, skipping auto-close`);
    return;
  }
  
  logger.info(`Auto-closing tab ${tabId}`);
  
  // Calculate final amount (no tip for walk-away)
  const finalAmount = tab.subtotalCents + tab.taxCents;
  
  try {
    // Capture payment
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    await stripe.paymentIntents.capture(
      tab.stripePaymentIntentId!,
      { amount_to_capture: finalAmount }
    );
    
    // Update tab
    await prisma.tab.update({
      where: { id: tabId },
      data: {
        status: 'AUTO_CLOSED',
        totalCents: finalAmount,
        tipCents: 0,
        closedAt: new Date()
      }
    });
    
    // Log walk-away event (negative trust impact)
    if (tab.customerId) {
      await logTrustEvent({
        customerId: tab.customerId,
        venueId: tab.venueId,
        type: 'WALK_AWAY_RECOVERED',
        pointsChange: -5
      });
    }
    
    // Send receipt
    const receipt = await generateReceipt(tab);
    await sendReceiptNotification(tab, receipt);
    
    // Notify manager
    await notifyManager(tab.venueId, {
      type: 'AUTO_CLOSE',
      message: `Tab ${tab.id} auto-closed after walk-away`,
      amount: finalAmount
    });
    
  } catch (error) {
    logger.error(`Auto-close failed for tab ${tabId}`, error);
    
    // Alert manager to handle manually
    await notifyManager(tab.venueId, {
      type: 'AUTO_CLOSE_FAILED',
      message: `Auto-close failed for tab ${tab.id}. Manual intervention required.`,
      error: error.message
    });
  }
}
```

---

## Real-Time Updates

### Socket.io Event Schema

```typescript
// socket-server/events/tab-events.ts

export interface TabEventPayload {
  tabId: string;
  venueId: string;
  customerId?: string;
}

export interface TabItemAddedEvent extends TabEventPayload {
  item: {
    id: string;
    name: string;
    quantity: number;
    priceCents: number;
    modifiers: string[];
  };
  newSubtotal: number;
  newTax: number;
  newTotal: number;
}

export interface TabStatusChangedEvent extends TabEventPayload {
  oldStatus: TabStatus;
  newStatus: TabStatus;
  trigger: string;
}

export interface TabClosedEvent extends TabEventPayload {
  totalCents: number;
  tipCents: number;
  receiptUrl: string;
}

// Socket rooms for targeted broadcasting
export function getTabRoom(tabId: string): string {
  return `tab:${tabId}`;
}

export function getVenueRoom(venueId: string): string {
  return `venue:${venueId}`;
}

// Emit helper
export function emitTabUpdate(
  io: Server,
  event: string,
  payload: TabEventPayload
) {
  // Emit to specific tab room (customer viewing tab)
  io.to(getTabRoom(payload.tabId)).emit(event, payload);
  
  // Emit to venue room (staff members)
  io.to(getVenueRoom(payload.venueId)).emit(event, payload);
}
```

### Client-Side Real-Time Hook

```typescript
// hooks/useTabRealtime.ts

import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import type { Tab } from '@prisma/client';

export function useTabRealtime(tabId: string, initialTab: Tab) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const socket = useSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    // Join tab-specific room
    socket.emit('join-tab', { tabId });
    
    // Listen for item additions
    socket.on('tab:item-added', (payload: TabItemAddedEvent) => {
      if (payload.tabId === tabId) {
        setTab(prev => ({
          ...prev,
          subtotalCents: payload.newSubtotal,
          taxCents: payload.newTax,
          totalCents: payload.newTotal
        }));
        
        // Show toast notification
        toast.info(`Added: ${payload.item.name}`);
      }
    });
    
    // Listen for status changes
    socket.on('tab:status-changed', (payload: TabStatusChangedEvent) => {
      if (payload.tabId === tabId) {
        setTab(prev => ({
          ...prev,
          status: payload.newStatus
        }));
        
        if (payload.newStatus === 'WALK_AWAY') {
          toast.warning('We noticed you may have left. Your tab will auto-close in 15 minutes.');
        }
      }
    });
    
    // Listen for tab closed
    socket.on('tab:closed', (payload: TabClosedEvent) => {
      if (payload.tabId === tabId) {
        setTab(prev => ({
          ...prev,
          status: 'CLOSED',
          totalCents: payload.totalCents,
          tipCents: payload.tipCents
        }));
        
        // Redirect to receipt
        router.push(`/receipt/${payload.receiptUrl}`);
      }
    });
    
    return () => {
      socket.emit('leave-tab', { tabId });
      socket.off('tab:item-added');
      socket.off('tab:status-changed');
      socket.off('tab:closed');
    };
  }, [socket, tabId]);
  
  return tab;
}
```

---

## Security Considerations

### Access Token Generation

```typescript
// lib/security/tab-access-token.ts

import { randomBytes } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.TAB_TOKEN_SECRET);

export async function generateTabAccessToken(tabId: string): Promise<string> {
  const token = await new SignJWT({ tabId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(secret);
  
  // Store token in database with expiry
  await prisma.tabAccessToken.create({
    data: {
      token,
      tabId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });
  
  return token;
}

export async function validateTabAccessToken(token: string): Promise<string | null> {
  try {
    // Verify JWT signature
    const { payload } = await jwtVerify(token, secret);
    const tabId = payload.tabId as string;
    
    // Check if token exists and not expired
    const dbToken = await prisma.tabAccessToken.findUnique({
      where: { token },
      select: { expiresAt: true, tabId: true }
    });
    
    if (!dbToken || dbToken.expiresAt < new Date()) {
      return null;
    }
    
    return dbToken.tabId;
  } catch {
    return null;
  }
}
```

### Rate Limiting

```typescript
// middleware/rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

// Rate limit by access token (prevents abuse)
export const tabViewRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
  analytics: true
});

// Usage in tRPC procedure
export const getByAccessToken = publicProcedure
  .input(z.object({ accessToken: z.string() }))
  .query(async ({ input, ctx }) => {
    // Rate limit check
    const { success } = await tabViewRateLimit.limit(input.accessToken);
    
    if (!success) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please try again later.'
      });
    }
    
    // Validate token
    const tabId = await validateTabAccessToken(input.accessToken);
    
    if (!tabId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired access token'
      });
    }
    
    // Return tab data
    return await prisma.tab.findUnique({
      where: { id: tabId },
      include: { items: true, venue: true }
    });
  });
```

---

## Performance Optimizations

### Caching Strategy

```typescript
// lib/cache/tab-cache.ts

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export class TabCache {
  // Cache tab data for fast customer views
  static async get(tabId: string): Promise<Tab | null> {
    const cached = await redis.get<Tab>(`tab:${tabId}`);
    return cached;
  }
  
  static async set(tab: Tab): Promise<void> {
    await redis.set(`tab:${tab.id}`, tab, {
      ex: 300 // 5 minutes TTL
    });
  }
  
  static async invalidate(tabId: string): Promise<void> {
    await redis.del(`tab:${tabId}`);
  }
  
  // Cache active tabs count per venue
  static async getActiveCount(venueId: string): Promise<number | null> {
    return await redis.get<number>(`venue:${venueId}:active-tabs`);
  }
  
  static async setActiveCount(venueId: string, count: number): Promise<void> {
    await redis.set(`venue:${venueId}:active-tabs`, count, {
      ex: 60 // 1 minute TTL
    });
  }
}

// Usage in tRPC procedure
export const getCurrent = protectedProcedure
  .input(z.object({ tabId: z.string() }))
  .query(async ({ input }) => {
    // Try cache first
    let tab = await TabCache.get(input.tabId);
    
    if (!tab) {
      // Cache miss - fetch from database
      tab = await prisma.tab.findUnique({
        where: { id: input.tabId },
        include: { items: true }
      });
      
      if (tab) {
        // Store in cache
        await TabCache.set(tab);
      }
    }
    
    return tab;
  });
```

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/lib/state-machines/tab-state-machine.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { TabStateMachine } from '@/lib/state-machines/tab-state-machine';
import { TabStatus } from '@prisma/client';

describe('TabStateMachine', () => {
  let stateMachine: TabStateMachine;
  
  beforeEach(() => {
    stateMachine = new TabStateMachine();
  });
  
  it('should transition from PENDING_AUTH to OPEN on preAuthSucceeded', async () => {
    const tab = createMockTab({ status: 'PENDING_AUTH' });
    
    const result = await stateMachine.transition(tab, 'preAuthSucceeded');
    
    expect(result.status).toBe('OPEN');
  });
  
  it('should transition from OPEN to WALK_AWAY on walkAwayDetected', async () => {
    const tab = createMockTab({ status: 'OPEN' });
    
    const result = await stateMachine.transition(tab, 'walkAwayDetected');
    
    expect(result.status).toBe('WALK_AWAY');
  });
  
  it('should reject invalid transitions', async () => {
    const tab = createMockTab({ status: 'CLOSED' });
    
    await expect(
      stateMachine.transition(tab, 'preAuthSucceeded')
    ).rejects.toThrow('Invalid transition');
  });
  
  it('should execute transition action', async () => {
    const tab = createMockTab({ status: 'OPEN' });
    const mockAction = vi.fn();
    
    // Inject mock action
    stateMachine.registerAction('closeInitiated', mockAction);
    
    await stateMachine.transition(tab, 'closeInitiated');
    
    expect(mockAction).toHaveBeenCalledWith(tab);
  });
});
```

### Integration Tests

```typescript
// __tests__/api/tab/open-express-checkout.test.ts

import { describe, it, expect } from 'vitest';
import { createCaller } from '@/server/api/root';
import { createMockContext } from '../../helpers';

describe('openWithExpressCheckout', () => {
  it('should create tab with pre-authorization', async () => {
    const ctx = createMockContext({
      session: { user: { id: 'server-1' } }
    });
    
    const caller = createCaller(ctx);
    
    const result = await caller.tab.openWithExpressCheckout({
      venueId: 'venue-1',
      tableId: 'table-1',
      paymentMethodId: 'pm_test_card',
      customerPhone: '+15555551234'
    });
    
    expect(result.tab).toBeDefined();
    expect(result.tab.status).toBe('OPEN');
    expect(result.qrCode).toBeDefined();
    expect(result.preAuthAmount).toBeGreaterThan(0);
  });
  
  it('should reduce pre-auth for trusted customers', async () => {
    // Setup trusted customer
    await setupTrustedCustomer('customer-1', 'venue-1', 3);
    
    const ctx = createMockContext({
      session: { user: { id: 'server-1' } }
    });
    
    const caller = createCaller(ctx);
    
    const result = await caller.tab.openWithExpressCheckout({
      venueId: 'venue-1',
      customerEmail: 'customer-1@example.com',
      paymentMethodId: 'pm_test_card'
    });
    
    // Trust level 3 = 20% of normal pre-auth
    expect(result.preAuthAmount).toBe(1000); // $10 instead of $50
  });
  
  it('should handle declined cards gracefully', async () => {
    const ctx = createMockContext({
      session: { user: { id: 'server-1' } }
    });
    
    const caller = createCaller(ctx);
    
    await expect(
      caller.tab.openWithExpressCheckout({
        venueId: 'venue-1',
        paymentMethodId: 'pm_card_chargeDeclined'
      })
    ).rejects.toThrow('Card declined');
  });
});
```

### E2E Tests

```typescript
// __tests__/e2e/express-checkout.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Express Checkout Flow', () => {
  test('customer can view and close tab', async ({ page }) => {
    // Server opens tab
    await page.goto('/pos/terminal');
    await page.click('text=Open Tab');
    await page.fill('[name=paymentMethodId]', 'pm_test_card');
    await page.fill('[name=customerPhone]', '+15555551234');
    await page.click('button:has-text("Open Tab")');
    
    // Get QR code URL
    const qrCodeUrl = await page.locator('[data-testid=qr-code-url]').textContent();
    
    // Customer scans QR code (open in new page)
    const customerPage = await page.context().newPage();
    await customerPage.goto(qrCodeUrl!);
    
    // Verify tab displays
    await expect(customerPage.locator('h1')).toContainText('Your Tab');
    await expect(customerPage.locator('[data-testid=venue-name]')).toBeVisible();
    
    // Server adds items
    await page.goto('/pos/terminal');
    await page.click('text=Burger');
    await page.click('text=Send to Kitchen');
    
    // Customer sees real-time update
    await customerPage.waitForSelector('text=Burger');
    await expect(customerPage.locator('[data-testid=total]')).toContainText('$12.99');
    
    // Customer closes tab
    await customerPage.click('button:has-text("Close Tab")');
    await customerPage.click('[data-testid=tip-20]'); // 20% tip
    await customerPage.click('button:has-text("Confirm")');
    
    // Verify receipt displayed
    await expect(customerPage).toHaveURL(/\/receipt\//);
    await expect(customerPage.locator('text=Thank you')).toBeVisible();
  });
  
  test('walk-away detection and auto-close', async ({ page }) => {
    // Server opens tab
    await page.goto('/pos/terminal');
    await page.click('text=Open Tab');
    // ... setup tab
    
    // Fast-forward time (mock date)
    await page.evaluate(() => {
      Date.now = () => new Date('2025-11-25T14:00:00Z').getTime();
    });
    
    // Trigger walk-away detection worker manually
    await page.goto('/api/cron/walk-away-detection');
    
    // Verify tab status changed
    const tab = await prisma.tab.findFirst({
      where: { status: 'WALK_AWAY' }
    });
    expect(tab).toBeDefined();
    
    // Verify SMS sent (mock Twilio)
    const sms = await mockTwilio.getLastMessage();
    expect(sms.body).toContain('Your tab will auto-close in 15 minutes');
  });
});
```

---

## Monitoring & Observability

### Key Metrics

```typescript
// lib/metrics/express-checkout-metrics.ts

import { Counter, Histogram, Gauge } from 'prom-client';

// Tab lifecycle metrics
export const tabsOpened = new Counter({
  name: 'tabs_opened_total',
  help: 'Total number of tabs opened',
  labelNames: ['venue_id', 'trust_level']
});

export const tabsClosed = new Counter({
  name: 'tabs_closed_total',
  help: 'Total number of tabs closed',
  labelNames: ['venue_id', 'close_method'] // 'server', 'customer', 'auto'
});

export const walkAwaysDetected = new Counter({
  name: 'walk_aways_detected_total',
  help: 'Total number of walk-aways detected',
  labelNames: ['venue_id']
});

export const walkAwaysRecovered = new Counter({
  name: 'walk_aways_recovered_total',
  help: 'Total number of walk-aways successfully recovered',
  labelNames: ['venue_id']
});

// Payment metrics
export const preAuthSuccesses = new Counter({
  name: 'pre_auth_successes_total',
  help: 'Successful pre-authorizations',
  labelNames: ['venue_id']
});

export const preAuthFailures = new Counter({
  name: 'pre_auth_failures_total',
  help: 'Failed pre-authorizations',
  labelNames: ['venue_id', 'reason']
});

export const captureSuccesses = new Counter({
  name: 'capture_successes_total',
  help: 'Successful payment captures',
  labelNames: ['venue_id']
});

// Performance metrics
export const tabOpenDuration = new Histogram({
  name: 'tab_open_duration_seconds',
  help: 'Time to open tab (including pre-auth)',
  labelNames: ['venue_id'],
  buckets: [0.5, 1, 2, 3, 5, 10]
});

export const tabLifetimeDuration = new Histogram({
  name: 'tab_lifetime_duration_minutes',
  help: 'Duration from open to close',
  labelNames: ['venue_id', 'close_method'],
  buckets: [15, 30, 45, 60, 90, 120, 180]
});

// Real-time metrics
export const activeTabsGauge = new Gauge({
  name: 'active_tabs',
  help: 'Current number of open tabs',
  labelNames: ['venue_id']
});

// Usage in code
export function recordTabOpened(venueId: string, trustLevel: number) {
  tabsOpened.inc({ venue_id: venueId, trust_level: trustLevel.toString() });
  activeTabsGauge.inc({ venue_id: venueId });
}

export function recordTabClosed(venueId: string, closeMethod: string, durationMinutes: number) {
  tabsClosed.inc({ venue_id: venueId, close_method: closeMethod });
  activeTabsGauge.dec({ venue_id: venueId });
  tabLifetimeDuration.observe({ venue_id: venueId, close_method: closeMethod }, durationMinutes);
}
```

### Logging

```typescript
// lib/logger.ts

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' }
    : undefined,
});

// Structured logging for Express Checkout events
export function logTabEvent(event: string, data: Record<string, unknown>) {
  logger.info({
    event: `express_checkout.${event}`,
    ...data,
    timestamp: new Date().toISOString()
  });
}

// Usage
logTabEvent('tab_opened', {
  tabId: tab.id,
  venueId: tab.venueId,
  preAuthAmount: tab.preAuthAmountCents,
  trustLevel: customer?.trustLevel || 0
});

logTabEvent('walk_away_detected', {
  tabId: tab.id,
  venueId: tab.venueId,
  lastActivityMinutes: signals.lastActivityMinutes
});
```

---

## Deployment Checklist

### Pre-Launch
- [ ] Stripe Connect account verified in production
- [ ] Twilio phone number configured and verified
- [ ] Redis cache configured (Upstash)
- [ ] BullMQ queues configured
- [ ] Environment variables set in Vercel
- [ ] Database migrations run
- [ ] Socket.io server deployed to Railway
- [ ] SSL certificates verified
- [ ] Rate limiting configured
- [ ] Error tracking enabled (Sentry)
- [ ] Monitoring dashboards created (Prometheus/Grafana)

### Testing
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Load testing completed (100 concurrent tabs)
- [ ] Security audit completed
- [ ] Accessibility testing completed

### Documentation
- [ ] API documentation published
- [ ] Server training materials created
- [ ] Customer-facing FAQ published
- [ ] Troubleshooting guide created
- [ ] Runbook for on-call engineers

---

## Future Enhancements

### Phase 2 Features
1. **Advanced Walk-Away Detection:**
   - Bluetooth beacon integration (customer phone proximity)
   - Computer vision (table occupancy detection)
   - ML model trained on historical walk-away patterns

2. **Group Tab Management:**
   - Multiple customers on one tab
   - Individual item claiming
   - Split at end with Venmo/PayPal integration

3. **Enhanced Trust System:**
   - Biometric verification (Face ID, fingerprint)
   - SSN/credit check integration for high-value customers
   - Employer/corporate account linking

4. **International Support:**
   - Multi-currency support
   - Regional payment processors
   - Localization for SMS messages

---

_Technical Specification v1.0_
_Generated: 2025-11-25_
_For: Crowdiant Restaurant OS_

