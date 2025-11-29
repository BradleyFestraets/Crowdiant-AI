# API Specifications - tRPC Technical Specification

**Component:** Complete API Contracts
**Version:** 1.0
**Date:** 2025-11-25
**Author:** API Architect

---

## Overview

Complete tRPC API specifications with Zod schemas, covering all functional requirements from the PRD.

---

## Root Router Structure

```typescript
// server/api/root.ts

import { createTRPCRouter } from './trpc';
import { tabRouter } from './routers/tab';
import { trustRouter } from './routers/trust';
import { menuRouter } from './routers/menu';
import { venueRouter } from './routers/venue';
import { userRouter } from './routers/user';
import { reservationRouter } from './routers/reservation';
import { loyaltyRouter } from './routers/loyalty';
import { inventoryRouter } from './routers/inventory';
import { analyticsRouter } from './routers/analytics';
import { paymentRouter } from './routers/payment';
import { notificationRouter } from './routers/notification';

export const appRouter = createTRPCRouter({
  tab: tabRouter,
  trust: trustRouter,
  menu: menuRouter,
  venue: venueRouter,
  user: userRouter,
  reservation: reservationRouter,
  loyalty: loyaltyRouter,
  inventory: inventoryRouter,
  analytics: analyticsRouter,
  payment: paymentRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
```

---

## Tab Router (Express Checkout Core)

```typescript
// server/api/routers/tab.ts

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { TabStatus } from '@prisma/client';

export const tabRouter = router({
  /**
   * Open tab with Express Checkout (pre-authorization)
   * Procedure: mutation
   * Access: Protected (server staff only)
   */
  openWithExpressCheckout: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      tableId: z.string().cuid().optional(),
      paymentMethodId: z.string(),  // Stripe pm_xxx
      customerPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
      customerEmail: z.string().email().optional(),
      guestCount: z.number().int().min(1).max(20).optional(),
    }))
    .output(z.object({
      tab: z.object({
        id: z.string(),
        tabNumber: z.number(),
        status: z.nativeEnum(TabStatus),
        preAuthAmountCents: z.number(),
        venueId: z.string(),
      }),
      qrCode: z.string(),  // Data URL
      qrCodeUrl: z.string(),  // Full URL
      accessToken: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation in express-checkout-technical-spec.md
      // Returns tab, QR code, and access token
    }),

  /**
   * Get tab by access token (customer view)
   * Procedure: query
   * Access: Public (with valid token)
   */
  getByAccessToken: publicProcedure
    .input(z.object({
      accessToken: z.string(),
    }))
    .output(z.object({
      tab: z.object({
        id: z.string(),
        venueId: z.string(),
        venueName: z.string(),
        venueLogo: z.string().nullable(),
        status: z.nativeEnum(TabStatus),
        subtotalCents: z.number(),
        taxCents: z.number(),
        tipCents: z.number(),
        totalCents: z.number(),
        openedAt: z.date(),
        items: z.array(z.object({
          id: z.string(),
          name: z.string(),
          quantity: z.number(),
          unitPriceCents: z.number(),
          totalPriceCents: z.number(),
          modifiers: z.any(),
          kitchenStatus: z.string(),
        })),
      }),
      canClose: z.boolean(),
      canAddTip: z.boolean(),
    }))
    .query(async ({ ctx, input }) => {
      // Validate token and return tab data
    }),

  /**
   * Add item to tab
   * Procedure: mutation
   * Access: Protected (server staff)
   */
  addItem: protectedProcedure
    .input(z.object({
      tabId: z.string().cuid(),
      menuItemId: z.string().cuid(),
      quantity: z.number().int().min(1).max(99).default(1),
      modifiers: z.array(z.object({
        name: z.string(),
        value: z.string(),
        priceCents: z.number().int().optional(),
      })).optional(),
      notes: z.string().max(500).optional(),
      courseNumber: z.number().int().min(1).optional(),
    }))
    .output(z.object({
      tabItem: z.object({
        id: z.string(),
        name: z.string(),
        quantity: z.number(),
        totalPriceCents: z.number(),
      }),
      newTotals: z.object({
        subtotalCents: z.number(),
        taxCents: z.number(),
        totalCents: z.number(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Add item, recalculate totals, emit socket event
    }),

  /**
   * Remove item from tab
   * Procedure: mutation
   * Access: Protected (server staff)
   */
  removeItem: protectedProcedure
    .input(z.object({
      tabId: z.string().cuid(),
      tabItemId: z.string().cuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Remove item, adjust totals
    }),

  /**
   * Update item quantity
   * Procedure: mutation
   * Access: Protected (server staff)
   */
  updateItemQuantity: protectedProcedure
    .input(z.object({
      tabItemId: z.string().cuid(),
      quantity: z.number().int().min(0).max(99),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update quantity or remove if 0
    }),

  /**
   * Close tab (capture payment)
   * Procedure: mutation
   * Access: Protected (server staff or customer via token)
   */
  close: protectedProcedure
    .input(z.object({
      tabId: z.string().cuid(),
      tipCents: z.number().int().min(0),
      accessToken: z.string().optional(),  // For customer self-close
    }))
    .output(z.object({
      success: z.boolean(),
      receiptUrl: z.string(),
      finalAmountCents: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Capture payment, generate receipt, update trust score
    }),

  /**
   * Request check (signal intent to close)
   * Procedure: mutation
   * Access: Protected (server staff)
   */
  requestCheck: protectedProcedure
    .input(z.object({
      tabId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Log event for walk-away detection
    }),

  /**
   * Get active tabs for venue
   * Procedure: query
   * Access: Protected (venue staff)
   */
  getActiveByVenue: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      status: z.array(z.nativeEnum(TabStatus)).optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .output(z.object({
      tabs: z.array(z.object({
        id: z.string(),
        tabNumber: z.number(),
        status: z.nativeEnum(TabStatus),
        tableNumber: z.string().nullable(),
        serverName: z.string(),
        totalCents: z.number(),
        openedAt: z.date(),
        itemCount: z.number(),
      })),
      total: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      // Return paginated active tabs
    }),

  /**
   * Get tab details (for staff view)
   * Procedure: query
   * Access: Protected (venue staff)
   */
  getDetails: protectedProcedure
    .input(z.object({
      tabId: z.string().cuid(),
    }))
    .output(z.object({
      tab: z.object({
        id: z.string(),
        tabNumber: z.number(),
        status: z.nativeEnum(TabStatus),
        table: z.object({
          id: z.string(),
          number: z.string(),
        }).nullable(),
        server: z.object({
          id: z.string(),
          name: z.string(),
        }),
        customer: z.object({
          id: z.string(),
          name: z.string().nullable(),
          phone: z.string().nullable(),
          trustLevel: z.number(),
        }).nullable(),
        subtotalCents: z.number(),
        taxCents: z.number(),
        tipCents: z.number(),
        totalCents: z.number(),
        openedAt: z.date(),
        closedAt: z.date().nullable(),
        items: z.array(z.any()),
        statusHistory: z.array(z.any()),
      }),
    }))
    .query(async ({ ctx, input }) => {
      // Full tab details
    }),

  /**
   * Respond to walk-away warning
   * Procedure: mutation
   * Access: Public (with access token)
   */
  respondToWalkAway: publicProcedure
    .input(z.object({
      accessToken: z.string(),
      response: z.enum(['STILL_DINING', 'CLOSE_NOW', 'ADD_TIP']),
      tipCents: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Cancel auto-close job, update status
    }),

  /**
   * Split tab (future feature)
   * Procedure: mutation
   * Access: Protected (server staff)
   */
  split: protectedProcedure
    .input(z.object({
      tabId: z.string().cuid(),
      splitType: z.enum(['EVEN', 'BY_ITEM', 'CUSTOM']),
      splits: z.array(z.object({
        items: z.array(z.string()),  // Tab item IDs
        amountCents: z.number().int().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create new tabs from split
    }),

  /**
   * Transfer tab to different server
   * Procedure: mutation
   * Access: Protected (manager only)
   */
  transfer: protectedProcedure
    .input(z.object({
      tabId: z.string().cuid(),
      newServerId: z.string().cuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update server assignment
    }),

  /**
   * Void tab
   * Procedure: mutation
   * Access: Protected (manager only)
   */
  void: protectedProcedure
    .input(z.object({
      tabId: z.string().cuid(),
      reason: z.string().min(10),
    }))
    .mutation(async ({ ctx, input }) => {
      // Release pre-auth, mark as canceled
    }),
});
```

---

## Menu Router

```typescript
// server/api/routers/menu.ts

export const menuRouter = router({
  /**
   * Get full menu for venue
   * Procedure: query
   * Access: Public
   */
  getByVenue: publicProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      includeUnavailable: z.boolean().default(false),
    }))
    .output(z.object({
      categories: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        sortOrder: z.number(),
        items: z.array(z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          priceCents: z.number(),
          images: z.array(z.string()),
          vegetarian: z.boolean(),
          vegan: z.boolean(),
          glutenFree: z.boolean(),
          spicy: z.boolean(),
          allergens: z.array(z.string()),
          available: z.boolean(),
          modifierGroups: z.any(),
        })),
      })),
    }))
    .query(async ({ ctx, input }) => {
      // Return categorized menu
    }),

  /**
   * Get single menu item details
   * Procedure: query
   * Access: Public
   */
  getItem: publicProcedure
    .input(z.object({
      itemId: z.string().cuid(),
    }))
    .output(z.object({
      item: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        priceCents: z.number(),
        images: z.array(z.string()),
        category: z.object({
          id: z.string(),
          name: z.string(),
        }),
        dietaryInfo: z.object({
          vegetarian: z.boolean(),
          vegan: z.boolean(),
          glutenFree: z.boolean(),
          spicy: z.boolean(),
          allergens: z.array(z.string()),
          calories: z.number().nullable(),
        }),
        modifierGroups: z.any(),
        available: z.boolean(),
      }),
    }))
    .query(async ({ ctx, input }) => {
      // Full item details
    }),

  /**
   * Create menu category
   * Procedure: mutation
   * Access: Protected (manager only)
   */
  createCategory: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      sortOrder: z.number().int().default(0),
      availableAllDay: z.boolean().default(true),
      availableFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      availableTo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create category
    }),

  /**
   * Create menu item
   * Procedure: mutation
   * Access: Protected (manager only)
   */
  createItem: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      categoryId: z.string().cuid(),
      name: z.string().min(1).max(200),
      description: z.string().max(1000).optional(),
      priceCents: z.number().int().min(0),
      images: z.array(z.string().url()).max(5).optional(),
      dietaryInfo: z.object({
        vegetarian: z.boolean().default(false),
        vegan: z.boolean().default(false),
        glutenFree: z.boolean().default(false),
        spicy: z.boolean().default(false),
        allergens: z.array(z.string()).default([]),
        calories: z.number().int().positive().optional(),
      }).optional(),
      modifierGroups: z.any().optional(),
      trackInventory: z.boolean().default(false),
      inventoryCount: z.number().int().min(0).optional(),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create menu item
    }),

  /**
   * Update menu item
   * Procedure: mutation
   * Access: Protected (manager only)
   */
  updateItem: protectedProcedure
    .input(z.object({
      itemId: z.string().cuid(),
      updates: z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional(),
        priceCents: z.number().int().min(0).optional(),
        available: z.boolean().optional(),
        inventoryCount: z.number().int().min(0).optional(),
        // ... other fields
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update item
    }),

  /**
   * Toggle item availability
   * Procedure: mutation
   * Access: Protected (staff)
   */
  toggleAvailability: protectedProcedure
    .input(z.object({
      itemId: z.string().cuid(),
      available: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Quick availability toggle (for 86'd items)
    }),

  /**
   * Delete menu item
   * Procedure: mutation
   * Access: Protected (manager only)
   */
  deleteItem: protectedProcedure
    .input(z.object({
      itemId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Soft delete
    }),

  /**
   * Search menu items
   * Procedure: query
   * Access: Public
   */
  search: publicProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      query: z.string().min(1).max(100),
      filters: z.object({
        vegetarian: z.boolean().optional(),
        vegan: z.boolean().optional(),
        glutenFree: z.boolean().optional(),
        maxPriceCents: z.number().int().optional(),
      }).optional(),
    }))
    .output(z.object({
      items: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        priceCents: z.number(),
        categoryName: z.string(),
      })),
    }))
    .query(async ({ ctx, input }) => {
      // Full-text search
    }),
});
```

---

## Venue Router

```typescript
// server/api/routers/venue.ts

export const venueRouter = router({
  /**
   * Get venue by slug (public profile)
   * Procedure: query
   * Access: Public
   */
  getBySlug: publicProcedure
    .input(z.object({
      slug: z.string(),
    }))
    .output(z.object({
      venue: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        description: z.string().nullable(),
        logo: z.string().nullable(),
        type: z.string(),
        cuisine: z.array(z.string()),
        address: z.string(),
        city: z.string(),
        state: z.string(),
        phone: z.string(),
        website: z.string().nullable(),
        hours: z.any(),
        averageRating: z.number().nullable(),
        reviewCount: z.number(),
        expressCheckoutEnabled: z.boolean(),
      }),
    }))
    .query(async ({ ctx, input }) => {
      // Public venue profile
    }),

  /**
   * Create venue (onboarding)
   * Procedure: mutation
   * Access: Protected (authenticated user)
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
      email: z.string().email(),
      phone: z.string(),
      type: z.enum([
        'FAST_CASUAL',
        'CASUAL_DINING',
        'FINE_DINING',
        'FOOD_TRUCK',
        'BAR',
        'CAFE',
        'BAKERY',
        'BUFFET',
        'POP_UP',
      ]),
      cuisine: z.array(z.string()).min(1),
      address: z.string(),
      city: z.string(),
      state: z.string().length(2),
      postalCode: z.string(),
      timezone: z.string().default('America/New_York'),
    }))
    .output(z.object({
      venue: z.object({
        id: z.string(),
        slug: z.string(),
        stripeOnboardingUrl: z.string(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create venue, generate Stripe Connect onboarding link
    }),

  /**
   * Update venue settings
   * Procedure: mutation
   * Access: Protected (manager/owner)
   */
  updateSettings: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      settings: z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional(),
        logo: z.string().url().optional(),
        phone: z.string().optional(),
        website: z.string().url().optional(),
        hours: z.any().optional(),
        taxRate: z.number().min(0).max(0.5).optional(),
        preAuthAmountCents: z.number().int().min(1000).max(50000).optional(),
        walkAwayGraceMinutes: z.number().int().min(5).max(60).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update venue settings
    }),

  /**
   * Get venue dashboard data
   * Procedure: query
   * Access: Protected (venue staff)
   */
  getDashboard: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      dateRange: z.object({
        start: z.date(),
        end: z.date(),
      }).optional(),
    }))
    .output(z.object({
      stats: z.object({
        activeTabsCount: z.number(),
        todayRevenueCents: z.number(),
        todayGuestCount: z.number(),
        avgTabValueCents: z.number(),
        walkAwayRate: z.number(),
      }),
      recentTabs: z.array(z.any()),
      alerts: z.array(z.any()),
    }))
    .query(async ({ ctx, input }) => {
      // Dashboard overview
    }),

  /**
   * List staff members
   * Procedure: query
   * Access: Protected (manager/owner)
   */
  getStaff: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      status: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED']).optional(),
    }))
    .output(z.object({
      staff: z.array(z.object({
        id: z.string(),
        user: z.object({
          id: z.string(),
          name: z.string().nullable(),
          email: z.string().nullable(),
          phone: z.string().nullable(),
        }),
        role: z.string(),
        status: z.string(),
        hiredAt: z.date(),
      })),
    }))
    .query(async ({ ctx, input }) => {
      // List staff
    }),

  /**
   * Add staff member
   * Procedure: mutation
   * Access: Protected (manager/owner)
   */
  addStaff: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      email: z.string().email(),
      role: z.enum([
        'MANAGER',
        'ASSISTANT_MANAGER',
        'SERVER',
        'BARTENDER',
        'HOST',
        'KITCHEN_MANAGER',
        'CHEF',
        'LINE_COOK',
      ]),
      hourlyRate: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create user if not exists, add to venue staff
    }),

  /**
   * Remove staff member
   * Procedure: mutation
   * Access: Protected (manager/owner)
   */
  removeStaff: protectedProcedure
    .input(z.object({
      staffId: z.string().cuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Mark as terminated
    }),

  /**
   * Search venues (discovery)
   * Procedure: query
   * Access: Public
   */
  search: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      type: z.array(z.string()).optional(),
      cuisine: z.array(z.string()).optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      radiusMiles: z.number().min(1).max(50).default(10),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }))
    .output(z.object({
      venues: z.array(z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        logo: z.string().nullable(),
        type: z.string(),
        cuisine: z.array(z.string()),
        city: z.string(),
        state: z.string(),
        distanceMiles: z.number().nullable(),
        averageRating: z.number().nullable(),
        expressCheckoutEnabled: z.boolean(),
      })),
      total: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      // Venue search with geolocation
    }),
});
```

---

## Reservation Router

```typescript
// server/api/routers/reservation.ts

export const reservationRouter = router({
  /**
   * Create reservation
   * Procedure: mutation
   * Access: Protected (authenticated user)
   */
  create: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      dateTime: z.date(),
      partySize: z.number().int().min(1).max(50),
      name: z.string().min(1).max(100),
      phone: z.string(),
      email: z.string().email().optional(),
      occasion: z.string().optional(),
      notes: z.string().max(500).optional(),
    }))
    .output(z.object({
      reservation: z.object({
        id: z.string(),
        confirmationCode: z.string(),
        dateTime: z.date(),
        partySize: z.number(),
        status: z.string(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create reservation, check availability
    }),

  /**
   * Get reservation by confirmation code
   * Procedure: query
   * Access: Public
   */
  getByConfirmationCode: publicProcedure
    .input(z.object({
      confirmationCode: z.string(),
    }))
    .output(z.object({
      reservation: z.object({
        id: z.string(),
        venue: z.object({
          name: z.string(),
          address: z.string(),
          phone: z.string(),
        }),
        dateTime: z.date(),
        partySize: z.number(),
        status: z.string(),
        name: z.string(),
        phone: z.string(),
      }),
    }))
    .query(async ({ ctx, input }) => {
      // Lookup reservation
    }),

  /**
   * Cancel reservation
   * Procedure: mutation
   * Access: Protected or Public (with confirmation code)
   */
  cancel: publicProcedure
    .input(z.object({
      confirmationCode: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Mark as canceled
    }),

  /**
   * Get upcoming reservations for venue
   * Procedure: query
   * Access: Protected (venue staff)
   */
  getUpcoming: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      date: z.date().optional(),
    }))
    .output(z.object({
      reservations: z.array(z.object({
        id: z.string(),
        confirmationCode: z.string(),
        dateTime: z.date(),
        partySize: z.number(),
        name: z.string(),
        phone: z.string(),
        status: z.string(),
        table: z.object({
          id: z.string(),
          number: z.string(),
        }).nullable(),
      })),
    }))
    .query(async ({ ctx, input }) => {
      // List reservations for date
    }),

  /**
   * Mark reservation as seated
   * Procedure: mutation
   * Access: Protected (venue staff)
   */
  markSeated: protectedProcedure
    .input(z.object({
      reservationId: z.string().cuid(),
      tableId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update status, assign table
    }),

  /**
   * Mark no-show
   * Procedure: mutation
   * Access: Protected (venue staff)
   */
  markNoShow: protectedProcedure
    .input(z.object({
      reservationId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update status, log incident for trust score
    }),
});
```

---

## Loyalty Router

```typescript
// server/api/routers/loyalty.ts

export const loyaltyRouter = router({
  /**
   * Get customer's loyalty account at venue
   * Procedure: query
   * Access: Protected
   */
  getAccount: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
    }))
    .output(z.object({
      account: z.object({
        balance: z.number(),
        lifetimePoints: z.number(),
        tier: z.string().nullable(),
        program: z.object({
          name: z.string(),
          pointsPerDollar: z.number(),
          dollarsPerPoint: z.number(),
        }),
      }).nullable(),
    }))
    .query(async ({ ctx, input }) => {
      // Get or create loyalty account
    }),

  /**
   * Get transaction history
   * Procedure: query
   * Access: Protected
   */
  getTransactions: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .output(z.object({
      transactions: z.array(z.object({
        id: z.string(),
        type: z.string(),
        points: z.number(),
        description: z.string().nullable(),
        createdAt: z.date(),
      })),
      total: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      // Transaction history
    }),

  /**
   * Redeem points
   * Procedure: mutation
   * Access: Protected
   */
  redeemPoints: protectedProcedure
    .input(z.object({
      accountId: z.string().cuid(),
      points: z.number().int().min(1),
      tabId: z.string().cuid().optional(),
    }))
    .output(z.object({
      success: z.boolean(),
      newBalance: z.number(),
      discountCents: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Deduct points, apply discount
    }),

  /**
   * Award points (internal, called after tab close)
   */
  awardPoints: protectedProcedure
    .input(z.object({
      customerId: z.string().cuid(),
      venueId: z.string().cuid(),
      tabId: z.string().cuid(),
      amountCents: z.number().int().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      // Calculate and award points
    }),
});
```

---

## Inventory Router

```typescript
// server/api/routers/inventory.ts

export const inventoryRouter = router({
  /**
   * List inventory items
   * Procedure: query
   * Access: Protected (venue staff)
   */
  getByVenue: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      category: z.string().optional(),
      lowStock: z.boolean().optional(),
    }))
    .output(z.object({
      items: z.array(z.object({
        id: z.string(),
        name: z.string(),
        sku: z.string().nullable(),
        category: z.string(),
        currentQuantity: z.number(),
        minQuantity: z.number(),
        unit: z.string(),
        unitCostCents: z.number(),
        needsReorder: z.boolean(),
      })),
    }))
    .query(async ({ ctx, input }) => {
      // List inventory
    }),

  /**
   * Add inventory item
   * Procedure: mutation
   * Access: Protected (manager)
   */
  addItem: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      name: z.string().min(1).max(200),
      description: z.string().max(1000).optional(),
      sku: z.string().max(50).optional(),
      category: z.enum([
        'PROTEIN',
        'PRODUCE',
        'DAIRY',
        'BEVERAGE',
        'ALCOHOL',
        'DRY_GOODS',
        'SUPPLIES',
        'PACKAGING',
        'OTHER',
      ]),
      unit: z.string().max(20),
      currentQuantity: z.number().min(0),
      minQuantity: z.number().min(0),
      unitCostCents: z.number().int().min(0),
      supplierId: z.string().cuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create inventory item
    }),

  /**
   * Record inventory transaction
   * Procedure: mutation
   * Access: Protected (staff)
   */
  recordTransaction: protectedProcedure
    .input(z.object({
      inventoryItemId: z.string().cuid(),
      type: z.enum(['PURCHASE', 'USAGE', 'WASTE', 'ADJUSTMENT', 'TRANSFER', 'RETURN']),
      quantity: z.number(),
      unitCostCents: z.number().int().min(0).optional(),
      reason: z.string().max(500).optional(),
      referenceId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Record transaction, update quantity
    }),

  /**
   * Get low stock items
   * Procedure: query
   * Access: Protected (venue staff)
   */
  getLowStock: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
    }))
    .output(z.object({
      items: z.array(z.object({
        id: z.string(),
        name: z.string(),
        currentQuantity: z.number(),
        minQuantity: z.number(),
        supplier: z.object({
          id: z.string(),
          name: z.string(),
          contactName: z.string().nullable(),
          phone: z.string().nullable(),
        }).nullable(),
      })),
    }))
    .query(async ({ ctx, input }) => {
      // Items below min quantity
    }),
});
```

---

## Analytics Router

```typescript
// server/api/routers/analytics.ts

export const analyticsRouter = router({
  /**
   * Get revenue metrics
   * Procedure: query
   * Access: Protected (manager/owner)
   */
  getRevenue: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      startDate: z.date(),
      endDate: z.date(),
      groupBy: z.enum(['day', 'week', 'month']).default('day'),
    }))
    .output(z.object({
      data: z.array(z.object({
        period: z.string(),
        totalRevenueCents: z.number(),
        tabCount: z.number(),
        avgTabValueCents: z.number(),
        tipsCents: z.number(),
      })),
      totals: z.object({
        totalRevenueCents: z.number(),
        totalTabCount: z.number(),
      }),
    }))
    .query(async ({ ctx, input }) => {
      // Revenue analytics
    }),

  /**
   * Get menu item performance
   * Procedure: query
   * Access: Protected (manager/owner)
   */
  getMenuPerformance: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      startDate: z.date(),
      endDate: z.date(),
      limit: z.number().int().min(1).max(100).default(20),
    }))
    .output(z.object({
      items: z.array(z.object({
        menuItemId: z.string(),
        name: z.string(),
        quantitySold: z.number(),
        revenueCents: z.number(),
        avgRating: z.number().nullable(),
      })),
    }))
    .query(async ({ ctx, input }) => {
      // Top/bottom menu items
    }),

  /**
   * Get server performance
   * Procedure: query
   * Access: Protected (manager/owner)
   */
  getServerPerformance: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .output(z.object({
      servers: z.array(z.object({
        serverId: z.string(),
        name: z.string(),
        tabCount: z.number(),
        totalRevenueCents: z.number(),
        avgTipPercent: z.number(),
        avgTabValueCents: z.number(),
      })),
    }))
    .query(async ({ ctx, input }) => {
      // Server stats
    }),

  /**
   * Get Express Checkout metrics
   * Procedure: query
   * Access: Protected (manager/owner)
   */
  getExpressCheckoutMetrics: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .output(z.object({
      adoptionRate: z.number(),  // % of tabs using Express Checkout
      walkAwayRate: z.number(),
      walkAwayRecoveryRate: z.number(),
      avgCloseTimeSeconds: z.number(),
      preAuthSavingsCents: z.number(),  // From trust levels
    }))
    .query(async ({ ctx, input }) => {
      // Express Checkout KPIs
    }),

  /**
   * Get real-time dashboard stats
   * Procedure: query (subscribed via websocket)
   * Access: Protected (venue staff)
   */
  getRealTimeStats: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
    }))
    .output(z.object({
      currentGuests: z.number(),
      openTabs: z.number(),
      todayRevenueCents: z.number(),
      avgWaitTime: z.number(),
      tableOccupancyRate: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      // Real-time metrics
    }),
});
```

---

## Payment Router

```typescript
// server/api/routers/payment.ts

export const paymentRouter = router({
  /**
   * Add payment method
   * Procedure: mutation
   * Access: Protected
   */
  addPaymentMethod: protectedProcedure
    .input(z.object({
      paymentMethodId: z.string(),  // Stripe pm_xxx
    }))
    .output(z.object({
      paymentMethod: z.object({
        id: z.string(),
        type: z.string(),
        last4: z.string(),
        brand: z.string().nullable(),
        isDefault: z.boolean(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Attach to Stripe customer, save to DB
    }),

  /**
   * List payment methods
   * Procedure: query
   * Access: Protected
   */
  getPaymentMethods: protectedProcedure
    .output(z.object({
      paymentMethods: z.array(z.object({
        id: z.string(),
        type: z.string(),
        last4: z.string(),
        brand: z.string().nullable(),
        expMonth: z.number().nullable(),
        expYear: z.number().nullable(),
        isDefault: z.boolean(),
      })),
    }))
    .query(async ({ ctx }) => {
      // List customer payment methods
    }),

  /**
   * Set default payment method
   * Procedure: mutation
   * Access: Protected
   */
  setDefaultPaymentMethod: protectedProcedure
    .input(z.object({
      paymentMethodId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update default flag
    }),

  /**
   * Remove payment method
   * Procedure: mutation
   * Access: Protected
   */
  removePaymentMethod: protectedProcedure
    .input(z.object({
      paymentMethodId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Detach from Stripe, soft delete
    }),

  /**
   * Get Stripe Connect onboarding link (for venue)
   * Procedure: mutation
   * Access: Protected (venue owner)
   */
  getConnectOnboardingUrl: protectedProcedure
    .input(z.object({
      venueId: z.string().cuid(),
    }))
    .output(z.object({
      url: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Generate Stripe Connect onboarding link
    }),
});
```

---

## Notification Router

```typescript
// server/api/routers/notification.ts

export const notificationRouter = router({
  /**
   * Get user notifications
   * Procedure: query
   * Access: Protected
   */
  getAll: protectedProcedure
    .input(z.object({
      read: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .output(z.object({
      notifications: z.array(z.object({
        id: z.string(),
        type: z.string(),
        title: z.string(),
        message: z.string(),
        read: z.boolean(),
        actionUrl: z.string().nullable(),
        createdAt: z.date(),
      })),
      unreadCount: z.number(),
      total: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      // List notifications
    }),

  /**
   * Mark notification as read
   * Procedure: mutation
   * Access: Protected
   */
  markRead: protectedProcedure
    .input(z.object({
      notificationId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update read status
    }),

  /**
   * Mark all as read
   * Procedure: mutation
   * Access: Protected
   */
  markAllRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Bulk update
    }),

  /**
   * Delete notification
   * Procedure: mutation
   * Access: Protected
   */
  delete: protectedProcedure
    .input(z.object({
      notificationId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Soft delete
    }),

  /**
   * Get notification preferences
   * Procedure: query
   * Access: Protected
   */
  getPreferences: protectedProcedure
    .output(z.object({
      email: z.object({
        tabOpened: z.boolean(),
        tabClosed: z.boolean(),
        walkAwayWarning: z.boolean(),
        trustLevelChange: z.boolean(),
      }),
      sms: z.object({
        tabOpened: z.boolean(),
        walkAwayWarning: z.boolean(),
      }),
      push: z.object({
        enabled: z.boolean(),
      }),
    }))
    .query(async ({ ctx }) => {
      // User notification preferences
    }),

  /**
   * Update notification preferences
   * Procedure: mutation
   * Access: Protected
   */
  updatePreferences: protectedProcedure
    .input(z.object({
      email: z.object({
        tabOpened: z.boolean().optional(),
        tabClosed: z.boolean().optional(),
        walkAwayWarning: z.boolean().optional(),
        trustLevelChange: z.boolean().optional(),
      }).optional(),
      sms: z.object({
        tabOpened: z.boolean().optional(),
        walkAwayWarning: z.boolean().optional(),
      }).optional(),
      push: z.object({
        enabled: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update preferences
    }),
});
```

---

## Error Handling

```typescript
// server/api/trpc.ts

import { TRPCError } from '@trpc/server';

// Standard error codes mapping
export const ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',          // Not logged in
  FORBIDDEN: 'FORBIDDEN',                // Insufficient permissions
  
  // Validation
  BAD_REQUEST: 'BAD_REQUEST',            // Invalid input
  PARSE_ERROR: 'PARSE_ERROR',            // Malformed request
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',                // Resource doesn't exist
  CONFLICT: 'CONFLICT',                  // Resource conflict (e.g., duplicate)
  
  // Business logic
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',  // Business rule violated
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',        // Payment declined
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',      // Rate limit exceeded
  
  // System
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

// Example error throwing
export function throwNotFound(resource: string) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: `${resource} not found`
  });
}

export function throwForbidden(action: string) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: `You don't have permission to ${action}`
  });
}

export function throwPaymentRequired(reason: string) {
  throw new TRPCError({
    code: 'PAYMENT_REQUIRED',
    message: reason
  });
}
```

---

## Client-Side Usage Examples

```typescript
// Example: Opening tab with Express Checkout

import { api } from '@/lib/trpc/react';

function OpenTabButton() {
  const openTab = api.tab.openWithExpressCheckout.useMutation({
    onSuccess: (data) => {
      // Display QR code to customer
      setQrCode(data.qrCode);
      toast.success(`Tab ${data.tab.tabNumber} opened`);
    },
    onError: (error) => {
      if (error.data?.code === 'PAYMENT_REQUIRED') {
        toast.error('Card declined. Please use different payment method.');
      } else {
        toast.error('Failed to open tab');
      }
    }
  });
  
  return (
    <button onClick={() => {
      openTab.mutate({
        venueId: currentVenue.id,
        tableId: selectedTable.id,
        paymentMethodId: 'pm_test_card',
        customerPhone: '+15555551234'
      });
    }}>
      Open Tab
    </button>
  );
}

// Example: Real-time tab updates

function CustomerTabView({ accessToken }: { accessToken: string }) {
  // Initial query
  const { data: tabData } = api.tab.getByAccessToken.useQuery({ accessToken });
  
  // Subscribe to real-time updates
  useEffect(() => {
    if (!tabData?.tab.id) return;
    
    socket.on('tab:item-added', (payload) => {
      if (payload.tabId === tabData.tab.id) {
        // Invalidate query to refetch
        utils.tab.getByAccessToken.invalidate({ accessToken });
      }
    });
    
    return () => {
      socket.off('tab:item-added');
    };
  }, [tabData?.tab.id]);
  
  return (
    <div>
      <h1>Your Tab</h1>
      <p>Total: ${(tabData?.tab.totalCents || 0) / 100}</p>
      {/* ... */}
    </div>
  );
}

// Example: Infinite query with pagination

function TabHistory() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = api.tab.getActiveByVenue.useInfiniteQuery(
    { venueId: currentVenue.id, limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );
  
  return (
    <div>
      {data?.pages.map((page) => (
        page.tabs.map((tab) => <TabCard key={tab.id} tab={tab} />)
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

---

## WebSocket Events

```typescript
// socket-server/events/index.ts

export interface SocketEvent {
  event: string;
  payload: any;
}

// Tab events
export const TAB_EVENTS = {
  ITEM_ADDED: 'tab:item-added',
  ITEM_REMOVED: 'tab:item-removed',
  STATUS_CHANGED: 'tab:status-changed',
  CLOSED: 'tab:closed',
  WALK_AWAY_DETECTED: 'tab:walk-away-detected',
} as const;

// Kitchen events
export const KITCHEN_EVENTS = {
  ORDER_RECEIVED: 'kitchen:order-received',
  ORDER_READY: 'kitchen:order-ready',
  ORDER_DELIVERED: 'kitchen:order-delivered',
} as const;

// Notification events
export const NOTIFICATION_EVENTS = {
  NEW_NOTIFICATION: 'notification:new',
} as const;

// Client joins rooms based on context
// - tab:{tabId} for specific tab updates
// - venue:{venueId} for venue-wide updates
// - kitchen:{venueId} for kitchen orders
// - user:{userId} for user notifications
```

---

_API Specifications v1.0_
_Generated: 2025-11-25_
_For: Crowdiant Restaurant OS - Complete tRPC API_
