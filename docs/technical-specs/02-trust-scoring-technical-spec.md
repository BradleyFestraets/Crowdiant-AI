# Trust Scoring System - Technical Specification

**Component:** Customer Trust & Risk Management
**Version:** 1.0
**Date:** 2025-11-25
**Author:** Technical Architect

---

## Overview

The Trust Scoring System enables dynamic risk assessment of customers, reducing pre-authorization amounts and enabling VIP perks for trusted patrons. This system differentiates Crowdiant from competitors by making Express Checkout financially viable for venues.

---

## Trust Level Taxonomy

### Level Definitions

```typescript
enum TrustLevel {
  NEW = 0,        // First visit, no history
  FAMILIAR = 1,   // 2-5 successful visits
  REGULAR = 2,    // 6-15 successful visits
  TRUSTED = 3,    // 15+ visits, excellent history
  VIP = 4         // Handpicked by venue or corporate accounts
}

interface TrustLevelConfig {
  level: TrustLevel;
  label: string;
  preAuthReduction: number;  // Percentage reduction (0.0 - 1.0)
  benefits: string[];
  requirements: TrustRequirement;
}

const TRUST_LEVELS: TrustLevelConfig[] = [
  {
    level: 0,
    label: 'New',
    preAuthReduction: 0.0,  // 100% pre-auth
    benefits: ['Express checkout access'],
    requirements: {
      minVisits: 0,
      minTotalSpent: 0,
      maxIncidents: 999
    }
  },
  {
    level: 1,
    label: 'Familiar',
    preAuthReduction: 0.0,  // 100% pre-auth
    benefits: ['Express checkout access', 'Priority support'],
    requirements: {
      minVisits: 2,
      minTotalSpent: 5000,  // $50
      maxIncidents: 0,
      minAvgTip: 0.10  // 10%
    }
  },
  {
    level: 2,
    label: 'Regular',
    preAuthReduction: 0.5,  // 50% pre-auth
    benefits: ['Reduced pre-auth', 'Expedited seating', 'Birthday rewards'],
    requirements: {
      minVisits: 6,
      minTotalSpent: 20000,  // $200
      maxIncidents: 0,
      minAvgTip: 0.15,  // 15%
      minRecency: 90  // days
    }
  },
  {
    level: 3,
    label: 'Trusted',
    preAuthReduction: 0.8,  // 20% pre-auth
    benefits: ['Minimal pre-auth', 'Complimentary items', 'Reservation priority', 'Early access features'],
    requirements: {
      minVisits: 15,
      minTotalSpent: 75000,  // $750
      maxIncidents: 0,
      minAvgTip: 0.18,  // 18%
      minRecency: 60  // days
    }
  },
  {
    level: 4,
    label: 'VIP',
    preAuthReduction: 1.0,  // 0% pre-auth (no hold)
    benefits: ['No pre-auth', 'Concierge service', 'Private events access', 'Custom menu items'],
    requirements: {
      // Manual assignment OR:
      minVisits: 25,
      minTotalSpent: 200000,  // $2000
      maxIncidents: 0,
      minAvgTip: 0.20,  // 20%
      minRecency: 30,  // days
      requiresApproval: true
    }
  }
];
```

---

## Scoring Algorithm

### Point System

```typescript
interface TrustScoreComponents {
  visitPoints: number;
  spendPoints: number;
  tipPoints: number;
  recencyPoints: number;
  incidentPenalty: number;
  manualAdjustments: number;
  total: number;
}

class TrustScoreCalculator {
  /**
   * Calculate trust score for a customer at a specific venue
   */
  async calculateScore(
    customerId: string, 
    venueId: string
  ): Promise<TrustScoreComponents> {
    const history = await this.getCustomerHistory(customerId, venueId);
    
    const visitPoints = this.calculateVisitPoints(history.visitCount);
    const spendPoints = this.calculateSpendPoints(history.totalSpentCents);
    const tipPoints = this.calculateTipPoints(history.avgTipPercent);
    const recencyPoints = this.calculateRecencyPoints(history.lastVisitDate);
    const incidentPenalty = this.calculateIncidentPenalty(history.incidents);
    const manualAdjustments = history.manualAdjustments || 0;
    
    const total = Math.max(0, 
      visitPoints + 
      spendPoints + 
      tipPoints + 
      recencyPoints + 
      incidentPenalty +
      manualAdjustments
    );
    
    return {
      visitPoints,
      spendPoints,
      tipPoints,
      recencyPoints,
      incidentPenalty,
      manualAdjustments,
      total
    };
  }
  
  /**
   * Visit frequency scoring
   * More visits = more points, with diminishing returns
   */
  private calculateVisitPoints(visitCount: number): number {
    if (visitCount === 0) return 0;
    if (visitCount === 1) return 10;
    if (visitCount <= 5) return 10 + (visitCount - 1) * 8;  // 18, 26, 34, 42
    if (visitCount <= 15) return 42 + (visitCount - 5) * 5; // 47, 52, ... 92
    return 92 + (visitCount - 15) * 2;  // Diminishing returns after 15
  }
  
  /**
   * Lifetime spending scoring
   * Higher spend = more points
   */
  private calculateSpendPoints(totalSpentCents: number): number {
    const dollars = totalSpentCents / 100;
    
    if (dollars < 50) return 0;
    if (dollars < 200) return Math.floor(dollars / 10);  // $50-200: 5-20 pts
    if (dollars < 500) return 20 + Math.floor((dollars - 200) / 20);  // $200-500: 20-35 pts
    return 35 + Math.floor((dollars - 500) / 50);  // $500+: 35+ pts (diminishing)
  }
  
  /**
   * Tipping behavior scoring
   * Generous tippers are more trustworthy
   */
  private calculateTipPoints(avgTipPercent: number): number {
    if (avgTipPercent < 0.10) return -10;  // Penalty for poor tipping
    if (avgTipPercent < 0.15) return 0;
    if (avgTipPercent < 0.18) return 5;
    if (avgTipPercent < 0.20) return 10;
    if (avgTipPercent < 0.25) return 15;
    return 20;  // Exceptional tippers
  }
  
  /**
   * Recency scoring
   * Recent visits indicate active customer
   */
  private calculateRecencyPoints(lastVisitDate: Date | null): number {
    if (!lastVisitDate) return 0;
    
    const daysSinceVisit = Math.floor(
      (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceVisit <= 7) return 15;
    if (daysSinceVisit <= 14) return 12;
    if (daysSinceVisit <= 30) return 10;
    if (daysSinceVisit <= 60) return 5;
    if (daysSinceVisit <= 90) return 2;
    return 0;  // Inactive customers get no recency bonus
  }
  
  /**
   * Incident penalty calculation
   * Negative events reduce trust significantly
   */
  private calculateIncidentPenalty(incidents: TrustIncident[]): number {
    let penalty = 0;
    
    for (const incident of incidents) {
      switch (incident.type) {
        case 'WALK_AWAY':
          penalty -= 30;  // Severe penalty
          break;
        case 'PAYMENT_DECLINED':
          penalty -= 20;
          break;
        case 'CHARGEBACK':
          penalty -= 50;  // Very severe
          break;
        case 'COMPLAINT':
          penalty -= 5;
          break;
        case 'LATE_RESPONSE':
          penalty -= 10;
          break;
      }
      
      // Time-based decay: incidents older than 6 months have reduced impact
      const monthsSince = (Date.now() - incident.date.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince > 6) {
        penalty *= 0.5;  // 50% reduction
      }
      if (monthsSince > 12) {
        penalty *= 0.25;  // Further reduction
      }
    }
    
    return Math.floor(penalty);
  }
  
  /**
   * Map total score to trust level
   */
  determineTrustLevel(score: number, history: CustomerHistory): TrustLevel {
    // Check if meets requirements for each level (highest first)
    for (let level = 4; level >= 0; level--) {
      const config = TRUST_LEVELS[level];
      
      if (this.meetsRequirements(history, config.requirements)) {
        return level as TrustLevel;
      }
    }
    
    return TrustLevel.NEW;
  }
  
  /**
   * Validate requirements for a trust level
   */
  private meetsRequirements(
    history: CustomerHistory, 
    requirements: TrustRequirement
  ): boolean {
    if (history.visitCount < requirements.minVisits) return false;
    if (history.totalSpentCents < requirements.minTotalSpent) return false;
    if (history.incidents.length > requirements.maxIncidents) return false;
    
    if (requirements.minAvgTip && history.avgTipPercent < requirements.minAvgTip) {
      return false;
    }
    
    if (requirements.minRecency && history.lastVisitDate) {
      const daysSince = (Date.now() - history.lastVisitDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > requirements.minRecency) return false;
    }
    
    return true;
  }
  
  /**
   * Get customer history aggregated data
   */
  private async getCustomerHistory(
    customerId: string, 
    venueId: string
  ): Promise<CustomerHistory> {
    // Aggregate from closed tabs
    const tabs = await prisma.tab.findMany({
      where: {
        customerId,
        venueId,
        status: { in: ['CLOSED', 'AUTO_CLOSED'] }
      },
      select: {
        totalCents: true,
        tipCents: true,
        subtotalCents: true,
        closedAt: true
      }
    });
    
    const visitCount = tabs.length;
    const totalSpentCents = tabs.reduce((sum, t) => sum + t.totalCents, 0);
    const totalTipCents = tabs.reduce((sum, t) => sum + t.tipCents, 0);
    const totalSubtotalCents = tabs.reduce((sum, t) => sum + t.subtotalCents, 0);
    
    const avgTipPercent = totalSubtotalCents > 0 
      ? totalTipCents / totalSubtotalCents 
      : 0;
    
    const lastVisitDate = tabs.length > 0
      ? tabs.sort((a, b) => b.closedAt!.getTime() - a.closedAt!.getTime())[0].closedAt
      : null;
    
    // Get incidents
    const incidents = await prisma.trustIncident.findMany({
      where: { customerId, venueId },
      orderBy: { date: 'desc' }
    });
    
    // Get manual adjustments
    const manualAdjustments = await prisma.trustAdjustment.aggregate({
      where: { customerId, venueId },
      _sum: { pointsChange: true }
    });
    
    return {
      visitCount,
      totalSpentCents,
      avgTipPercent,
      lastVisitDate,
      incidents,
      manualAdjustments: manualAdjustments._sum.pointsChange || 0
    };
  }
}
```

---

## Cross-Venue Trust Transfer

### Network Effect Strategy

```typescript
/**
 * Cross-venue trust enables customers to carry reputation
 * across multiple restaurants in the Crowdiant network.
 */
class CrossVenueTrustManager {
  /**
   * Calculate network-wide trust score
   * Weighted average across all venues where customer has visited
   */
  async calculateNetworkTrust(customerId: string): Promise<number> {
    const venueScores = await prisma.trustScore.findMany({
      where: { customerId },
      include: { venue: true }
    });
    
    if (venueScores.length === 0) return 0;
    
    // Weight by visit count and recency
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    for (const score of venueScores) {
      const weight = this.calculateVenueWeight(
        score.visitCount, 
        score.lastVisitAt
      );
      
      totalWeightedScore += score.totalPoints * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }
  
  /**
   * Get initial trust level for new venue based on network reputation
   */
  async getInitialTrustLevel(
    customerId: string, 
    venueId: string
  ): Promise<TrustLevel> {
    // Check if customer already has score at this venue
    const existingScore = await prisma.trustScore.findUnique({
      where: { 
        customerId_venueId: { customerId, venueId } 
      }
    });
    
    if (existingScore) {
      return existingScore.level;
    }
    
    // Calculate network trust
    const networkScore = await this.calculateNetworkTrust(customerId);
    
    // Map network score to starting trust level
    // New venues start 1 level below network average (with floor of NEW)
    if (networkScore >= 150) return TrustLevel.TRUSTED;  // Start at 3 if network VIP
    if (networkScore >= 100) return TrustLevel.REGULAR;   // Start at 2
    if (networkScore >= 50) return TrustLevel.FAMILIAR;   // Start at 1
    return TrustLevel.NEW;  // No network history
  }
  
  /**
   * Weight calculation for cross-venue aggregation
   */
  private calculateVenueWeight(visitCount: number, lastVisitAt: Date | null): number {
    // Base weight on visit frequency
    let weight = Math.min(visitCount, 20);  // Cap at 20 visits
    
    // Apply recency decay
    if (lastVisitAt) {
      const monthsSince = (Date.now() - lastVisitAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince > 3) {
        weight *= Math.exp(-monthsSince / 12);  // Exponential decay
      }
    }
    
    return weight;
  }
  
  /**
   * Sync trust score update across venue network
   * When customer has incident at one venue, notify all venues
   */
  async propagateIncident(customerId: string, incident: TrustIncident): Promise<void> {
    // Get all venues where customer has trust score
    const venueScores = await prisma.trustScore.findMany({
      where: { customerId },
      select: { venueId: true }
    });
    
    // Create incident record for each venue (reduced penalty)
    for (const score of venueScores) {
      await prisma.trustIncident.create({
        data: {
          customerId,
          venueId: score.venueId,
          type: incident.type,
          date: incident.date,
          metadata: {
            ...incident.metadata,
            crossVenue: true,
            originalVenueId: incident.venueId,
            penaltyReduction: 0.5  // 50% penalty for cross-venue
          }
        }
      });
    }
    
    // Trigger recalculation for all venues
    for (const score of venueScores) {
      await this.recalculateTrustScore(customerId, score.venueId);
    }
  }
  
  private async recalculateTrustScore(customerId: string, venueId: string): Promise<void> {
    const calculator = new TrustScoreCalculator();
    const score = await calculator.calculateScore(customerId, venueId);
    const history = await calculator.getCustomerHistory(customerId, venueId);
    const level = calculator.determineTrustLevel(score.total, history);
    
    await prisma.trustScore.upsert({
      where: {
        customerId_venueId: { customerId, venueId }
      },
      update: {
        level,
        totalPoints: score.total,
        visitPoints: score.visitPoints,
        spendPoints: score.spendPoints,
        tipPoints: score.tipPoints,
        recencyPoints: score.recencyPoints,
        incidentPenalty: score.incidentPenalty,
        lastCalculatedAt: new Date()
      },
      create: {
        customerId,
        venueId,
        level,
        totalPoints: score.total,
        visitPoints: score.visitPoints,
        spendPoints: score.spendPoints,
        tipPoints: score.tipPoints,
        recencyPoints: score.recencyPoints,
        incidentPenalty: score.incidentPenalty,
        visitCount: history.visitCount,
        lastVisitAt: history.lastVisitDate
      }
    });
  }
}
```

---

## tRPC API Implementation

### Trust Score Router

```typescript
// server/api/routers/trust.ts

import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc';
import { TrustScoreCalculator, CrossVenueTrustManager } from '@/lib/trust';
import { TRPCError } from '@trpc/server';

export const trustRouter = router({
  /**
   * Get trust score for a customer at specific venue
   */
  getScore: protectedProcedure
    .input(z.object({
      customerId: z.string().optional(),  // Defaults to current user
      venueId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const customerId = input.customerId || ctx.session.user.id;
      
      // Check permission: can only view own score unless admin
      if (customerId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot view other customer trust scores'
        });
      }
      
      const score = await ctx.prisma.trustScore.findUnique({
        where: {
          customerId_venueId: { customerId, venueId: input.venueId }
        }
      });
      
      if (!score) {
        // Calculate initial score
        const calculator = new TrustScoreCalculator();
        const components = await calculator.calculateScore(customerId, input.venueId);
        const history = await calculator.getCustomerHistory(customerId, input.venueId);
        const level = calculator.determineTrustLevel(components.total, history);
        
        return {
          level,
          totalPoints: components.total,
          components,
          benefits: TRUST_LEVELS[level].benefits,
          nextLevel: level < 4 ? {
            level: level + 1,
            requirements: TRUST_LEVELS[level + 1].requirements
          } : null
        };
      }
      
      return {
        ...score,
        benefits: TRUST_LEVELS[score.level].benefits,
        nextLevel: score.level < 4 ? {
          level: score.level + 1,
          requirements: TRUST_LEVELS[score.level + 1].requirements
        } : null
      };
    }),
  
  /**
   * Get network-wide trust summary
   */
  getNetworkSummary: protectedProcedure
    .query(async ({ ctx }) => {
      const manager = new CrossVenueTrustManager();
      const networkScore = await manager.calculateNetworkTrust(ctx.session.user.id);
      
      const venueScores = await ctx.prisma.trustScore.findMany({
        where: { customerId: ctx.session.user.id },
        include: { venue: { select: { name: true, city: true } } },
        orderBy: { totalPoints: 'desc' }
      });
      
      return {
        networkScore,
        totalVenues: venueScores.length,
        totalVisits: venueScores.reduce((sum, s) => sum + s.visitCount, 0),
        highestLevel: Math.max(...venueScores.map(s => s.level), 0),
        venues: venueScores.map(s => ({
          venueId: s.venueId,
          venueName: s.venue.name,
          city: s.venue.city,
          level: s.level,
          levelLabel: TRUST_LEVELS[s.level].label,
          visitCount: s.visitCount,
          lastVisit: s.lastVisitAt
        }))
      };
    }),
  
  /**
   * Get trust score history/timeline
   */
  getHistory: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ ctx, input }) => {
      const events = await ctx.prisma.trustEvent.findMany({
        where: {
          customerId: ctx.session.user.id,
          venueId: input.venueId
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit
      });
      
      return events.map(e => ({
        date: e.createdAt,
        type: e.type,
        pointsChange: e.pointsChange,
        description: this.formatEventDescription(e),
        newLevel: e.newLevel
      }));
    }),
  
  /**
   * Admin: Manually adjust trust score
   */
  adjustScore: protectedProcedure
    .input(z.object({
      customerId: z.string(),
      venueId: z.string(),
      pointsChange: z.number().int(),
      reason: z.string().min(10),
      setLevel: z.number().int().min(0).max(4).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Check admin permission
      if (!['ADMIN', 'MANAGER'].includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can adjust trust scores'
        });
      }
      
      // Create adjustment record
      await ctx.prisma.trustAdjustment.create({
        data: {
          customerId: input.customerId,
          venueId: input.venueId,
          pointsChange: input.pointsChange,
          reason: input.reason,
          adjustedBy: ctx.session.user.id
        }
      });
      
      // Recalculate score
      const manager = new CrossVenueTrustManager();
      await manager.recalculateTrustScore(input.customerId, input.venueId);
      
      // If explicit level set, override calculation
      if (input.setLevel !== undefined) {
        await ctx.prisma.trustScore.update({
          where: {
            customerId_venueId: {
              customerId: input.customerId,
              venueId: input.venueId
            }
          },
          data: { level: input.setLevel }
        });
      }
      
      return { success: true };
    }),
  
  /**
   * Admin: Promote customer to VIP
   */
  promoteToVIP: protectedProcedure
    .input(z.object({
      customerId: z.string(),
      venueId: z.string(),
      reason: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Check admin permission
      if (!['ADMIN', 'MANAGER'].includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can promote to VIP'
        });
      }
      
      await ctx.prisma.trustScore.upsert({
        where: {
          customerId_venueId: {
            customerId: input.customerId,
            venueId: input.venueId
          }
        },
        update: {
          level: TrustLevel.VIP,
          manualOverride: true
        },
        create: {
          customerId: input.customerId,
          venueId: input.venueId,
          level: TrustLevel.VIP,
          manualOverride: true,
          totalPoints: 200,  // Base VIP score
          visitCount: 0
        }
      });
      
      // Log promotion
      await ctx.prisma.trustEvent.create({
        data: {
          customerId: input.customerId,
          venueId: input.venueId,
          type: 'VIP_PROMOTION',
          pointsChange: 0,
          newLevel: TrustLevel.VIP,
          metadata: {
            reason: input.reason,
            promotedBy: ctx.session.user.id
          }
        }
      });
      
      return { success: true };
    }),
  
  /**
   * Public: Check if customer qualifies for Express Checkout
   */
  checkEligibility: publicProcedure
    .input(z.object({
      customerEmail: z.string().email(),
      venueId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.prisma.user.findUnique({
        where: { email: input.customerEmail }
      });
      
      if (!customer) {
        return { eligible: true, level: 0 };  // New customers always eligible
      }
      
      const score = await ctx.prisma.trustScore.findUnique({
        where: {
          customerId_venueId: {
            customerId: customer.id,
            venueId: input.venueId
          }
        }
      });
      
      // Check for blocking incidents (e.g., chargebacks)
      const recentChargebacks = await ctx.prisma.trustIncident.count({
        where: {
          customerId: customer.id,
          type: 'CHARGEBACK',
          date: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)  // 90 days
          }
        }
      });
      
      if (recentChargebacks > 0) {
        return { 
          eligible: false, 
          reason: 'Recent payment disputes',
          level: score?.level || 0
        };
      }
      
      return {
        eligible: true,
        level: score?.level || 0,
        preAuthReduction: TRUST_LEVELS[score?.level || 0].preAuthReduction
      };
    })
});
```

---

## Background Jobs

### Trust Score Recalculation Worker

```typescript
// workers/trust-score-recalculation.ts

import { Queue, Worker } from 'bullmq';
import { redis } from '@/lib/redis';

export const trustRecalcQueue = new Queue('trust-recalculation', {
  connection: redis
});

// Trigger recalculation after tab close
export async function scheduleRecalculation(customerId: string, venueId: string) {
  await trustRecalcQueue.add(
    'recalculate',
    { customerId, venueId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    }
  );
}

// Worker
export const trustRecalcWorker = new Worker(
  'trust-recalculation',
  async (job) => {
    const { customerId, venueId } = job.data;
    
    const manager = new CrossVenueTrustManager();
    await manager.recalculateTrustScore(customerId, venueId);
    
    logger.info(`Recalculated trust score for customer ${customerId} at venue ${venueId}`);
  },
  { connection: redis }
);
```

### Nightly Trust Level Review

```typescript
// workers/nightly-trust-review.ts

/**
 * Cron job: Review all trust scores nightly
 * - Recalculate based on new data
 * - Apply time-based decay
 * - Identify candidates for promotion/demotion
 */
export async function runNightlyTrustReview() {
  const calculator = new TrustScoreCalculator();
  
  // Get all trust scores that need recalculation (>24 hours old)
  const staleScores = await prisma.trustScore.findMany({
    where: {
      lastCalculatedAt: {
        lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    take: 1000  // Batch process
  });
  
  logger.info(`Reviewing ${staleScores.length} trust scores`);
  
  for (const score of staleScores) {
    try {
      const newScore = await calculator.calculateScore(score.customerId, score.venueId);
      const history = await calculator.getCustomerHistory(score.customerId, score.venueId);
      const newLevel = calculator.determineTrustLevel(newScore.total, history);
      
      // Check for level change
      if (newLevel !== score.level) {
        logger.info(`Trust level changed for customer ${score.customerId}: ${score.level} -> ${newLevel}`);
        
        // Create event
        await prisma.trustEvent.create({
          data: {
            customerId: score.customerId,
            venueId: score.venueId,
            type: newLevel > score.level ? 'LEVEL_UP' : 'LEVEL_DOWN',
            pointsChange: newScore.total - score.totalPoints,
            oldLevel: score.level,
            newLevel
          }
        });
        
        // Send notification
        await sendTrustLevelChangeNotification(
          score.customerId,
          score.venueId,
          score.level,
          newLevel
        );
      }
      
      // Update score
      await prisma.trustScore.update({
        where: { id: score.id },
        data: {
          level: newLevel,
          totalPoints: newScore.total,
          visitPoints: newScore.visitPoints,
          spendPoints: newScore.spendPoints,
          tipPoints: newScore.tipPoints,
          recencyPoints: newScore.recencyPoints,
          incidentPenalty: newScore.incidentPenalty,
          lastCalculatedAt: new Date()
        }
      });
      
    } catch (error) {
      logger.error(`Failed to recalculate score for ${score.customerId}`, error);
    }
  }
}
```

---

## UI Components

### Trust Badge Display

```typescript
// components/TrustBadge.tsx

import { TrustLevel } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Heart, User } from 'lucide-react';

interface TrustBadgeProps {
  level: TrustLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TrustBadge({ level, showLabel = true, size = 'md' }: TrustBadgeProps) {
  const config = getTrustBadgeConfig(level);
  
  const Icon = config.icon;
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={config.variant} 
        className={config.className}
      >
        <Icon className={sizeClasses[size]} />
        {showLabel && <span className="ml-1">{config.label}</span>}
      </Badge>
    </div>
  );
}

function getTrustBadgeConfig(level: TrustLevel) {
  const configs = {
    0: {
      label: 'New',
      icon: User,
      variant: 'secondary' as const,
      className: 'bg-gray-100 text-gray-700'
    },
    1: {
      label: 'Familiar',
      icon: User,
      variant: 'secondary' as const,
      className: 'bg-blue-100 text-blue-700'
    },
    2: {
      label: 'Regular',
      icon: Heart,
      variant: 'default' as const,
      className: 'bg-green-100 text-green-700'
    },
    3: {
      label: 'Trusted',
      icon: Star,
      variant: 'default' as const,
      className: 'bg-purple-100 text-purple-700'
    },
    4: {
      label: 'VIP',
      icon: Crown,
      variant: 'default' as const,
      className: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
    }
  };
  
  return configs[level];
}
```

### Trust Score Dashboard

```typescript
// components/TrustScoreDashboard.tsx

import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrustBadge } from './TrustBadge';

export function TrustScoreDashboard({ venueId }: { venueId: string }) {
  const { data: score } = trpc.trust.getScore.useQuery({ venueId });
  
  if (!score) return <div>Loading...</div>;
  
  const { level, totalPoints, components, benefits, nextLevel } = score;
  
  return (
    <div className="space-y-6">
      {/* Current Level */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Your Trust Level</h3>
            <p className="text-sm text-gray-600">At this venue</p>
          </div>
          <TrustBadge level={level} size="lg" />
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Trust Score: {totalPoints} points</span>
            {nextLevel && <span>Next: {nextLevel.level}</span>}
          </div>
          {nextLevel && (
            <Progress 
              value={(totalPoints / 150) * 100}  // Assume 150 for next level
              className="h-2"
            />
          )}
        </div>
      </Card>
      
      {/* Benefits */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Your Benefits</h3>
        <ul className="space-y-2">
          {benefits.map((benefit, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </Card>
      
      {/* Score Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
        <div className="space-y-3">
          <ScoreRow label="Visit Frequency" points={components.visitPoints} />
          <ScoreRow label="Total Spending" points={components.spendPoints} />
          <ScoreRow label="Tipping Behavior" points={components.tipPoints} />
          <ScoreRow label="Recent Activity" points={components.recencyPoints} />
          {components.incidentPenalty !== 0 && (
            <ScoreRow 
              label="Incidents" 
              points={components.incidentPenalty} 
              negative 
            />
          )}
        </div>
      </Card>
      
      {/* Next Level Requirements */}
      {nextLevel && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Path to {TRUST_LEVELS[nextLevel.level].label}
          </h3>
          <RequirementsList requirements={nextLevel.requirements} />
        </Card>
      )}
    </div>
  );
}

function ScoreRow({ label, points, negative = false }: { 
  label: string; 
  points: number; 
  negative?: boolean 
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-700">{label}</span>
      <span className={negative ? 'text-red-500' : 'text-green-500'}>
        {points > 0 ? '+' : ''}{points}
      </span>
    </div>
  );
}
```

---

## Analytics & Reporting

### Trust Metrics Dashboard

```typescript
// lib/analytics/trust-metrics.ts

export async function getTrustMetrics(venueId: string, dateRange: DateRange) {
  // Trust level distribution
  const levelDistribution = await prisma.trustScore.groupBy({
    by: ['level'],
    where: { venueId },
    _count: true
  });
  
  // Average trust score trend over time
  const trustTrend = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('day', last_calculated_at) as date,
      AVG(total_points) as avg_score,
      COUNT(*) as customer_count
    FROM trust_scores
    WHERE venue_id = ${venueId}
      AND last_calculated_at >= ${dateRange.start}
      AND last_calculated_at <= ${dateRange.end}
    GROUP BY DATE_TRUNC('day', last_calculated_at)
    ORDER BY date
  `;
  
  // Incident rate
  const incidents = await prisma.trustIncident.groupBy({
    by: ['type'],
    where: {
      venueId,
      date: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    },
    _count: true
  });
  
  // Pre-auth savings (from trust level reductions)
  const savings = await calculatePreAuthSavings(venueId, dateRange);
  
  return {
    levelDistribution: levelDistribution.map(d => ({
      level: d.level,
      label: TRUST_LEVELS[d.level].label,
      count: d._count
    })),
    trustTrend,
    incidents,
    savings
  };
}

async function calculatePreAuthSavings(venueId: string, dateRange: DateRange) {
  const tabs = await prisma.tab.findMany({
    where: {
      venueId,
      openedAt: {
        gte: dateRange.start,
        lte: dateRange.end
      },
      status: { in: ['CLOSED', 'AUTO_CLOSED'] }
    },
    include: {
      customer: {
        include: {
          trustScores: {
            where: { venueId }
          }
        }
      }
    }
  });
  
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { preAuthAmountCents: true }
  });
  
  let totalSavings = 0;
  
  for (const tab of tabs) {
    const trustLevel = tab.customer?.trustScores[0]?.level || 0;
    const reduction = TRUST_LEVELS[trustLevel].preAuthReduction;
    const savedAmount = venue!.preAuthAmountCents * reduction;
    totalSavings += savedAmount;
  }
  
  return {
    totalSavingsCents: totalSavings,
    averageSavingPerTabCents: tabs.length > 0 ? totalSavings / tabs.length : 0,
    tabCount: tabs.length
  };
}
```

---

## Testing

### Trust Calculator Tests

```typescript
// __tests__/lib/trust/calculator.test.ts

import { describe, it, expect } from 'vitest';
import { TrustScoreCalculator } from '@/lib/trust';

describe('TrustScoreCalculator', () => {
  const calculator = new TrustScoreCalculator();
  
  describe('calculateVisitPoints', () => {
    it('should award points for visits with diminishing returns', () => {
      expect(calculator['calculateVisitPoints'](0)).toBe(0);
      expect(calculator['calculateVisitPoints'](1)).toBe(10);
      expect(calculator['calculateVisitPoints'](5)).toBe(42);
      expect(calculator['calculateVisitPoints'](15)).toBe(92);
      expect(calculator['calculateVisitPoints'](25)).toBe(112);
    });
  });
  
  describe('calculateTipPoints', () => {
    it('should penalize poor tipping', () => {
      expect(calculator['calculateTipPoints'](0.05)).toBe(-10);
    });
    
    it('should reward generous tipping', () => {
      expect(calculator['calculateTipPoints'](0.15)).toBe(0);
      expect(calculator['calculateTipPoints'](0.20)).toBe(10);
      expect(calculator['calculateTipPoints'](0.25)).toBe(15);
    });
  });
  
  describe('calculateIncidentPenalty', () => {
    it('should apply severe penalty for walk-aways', () => {
      const incidents = [{
        type: 'WALK_AWAY',
        date: new Date(),
        metadata: {}
      }];
      
      expect(calculator['calculateIncidentPenalty'](incidents)).toBe(-30);
    });
    
    it('should apply time-based decay', () => {
      const oldIncident = [{
        type: 'WALK_AWAY',
        date: new Date(Date.now() - 7 * 30 * 24 * 60 * 60 * 1000),  // 7 months ago
        metadata: {}
      }];
      
      const penalty = calculator['calculateIncidentPenalty'](oldIncident);
      expect(penalty).toBeGreaterThan(-30);  // Reduced penalty
      expect(penalty).toBeLessThan(0);
    });
  });
  
  describe('determineTrustLevel', () => {
    it('should return NEW for first-time customer', () => {
      const history = {
        visitCount: 0,
        totalSpentCents: 0,
        avgTipPercent: 0,
        lastVisitDate: null,
        incidents: [],
        manualAdjustments: 0
      };
      
      const level = calculator.determineTrustLevel(0, history);
      expect(level).toBe(TrustLevel.NEW);
    });
    
    it('should promote to REGULAR with sufficient history', () => {
      const history = {
        visitCount: 8,
        totalSpentCents: 25000,
        avgTipPercent: 0.18,
        lastVisitDate: new Date(),
        incidents: [],
        manualAdjustments: 0
      };
      
      const level = calculator.determineTrustLevel(100, history);
      expect(level).toBe(TrustLevel.REGULAR);
    });
  });
});
```

---

## Security Considerations

### PII Protection

```typescript
// Trust scores contain sensitive customer behavior data
// Apply strict access controls

// 1. Row Level Security (PostgreSQL)
CREATE POLICY trust_score_customer_view ON trust_scores
  FOR SELECT
  USING (
    auth.uid() = customer_id 
    OR 
    auth.role() IN ('ADMIN', 'MANAGER')
  );

// 2. API authorization checks (see tRPC router above)

// 3. Anonymization for analytics
export async function getAnonymizedTrustMetrics(venueId: string) {
  return await prisma.trustScore.groupBy({
    by: ['level'],
    where: { venueId },
    _count: true,
    _avg: { totalPoints: true }
    // No customer identifiers exposed
  });
}
```

### Fraud Detection

```typescript
// lib/fraud/trust-fraud-detector.ts

export class TrustFraudDetector {
  async detectSuspiciousActivity(customerId: string): Promise<FraudAlert[]> {
    const alerts: FraudAlert[] = [];
    
    // Check 1: Rapid trust farming (multiple quick visits)
    const recentVisits = await prisma.tab.count({
      where: {
        customerId,
        openedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)  // Last 7 days
        }
      }
    });
    
    if (recentVisits > 10) {
      alerts.push({
        type: 'RAPID_VISITS',
        severity: 'MEDIUM',
        message: `${recentVisits} visits in 7 days - possible trust farming`
      });
    }
    
    // Check 2: Unusual spending patterns
    const tabs = await prisma.tab.findMany({
      where: {
        customerId,
        status: 'CLOSED',
        closedAt: { not: null }
      },
      select: { totalCents: true },
      orderBy: { closedAt: 'desc' },
      take: 10
    });
    
    const avgSpend = tabs.reduce((sum, t) => sum + t.totalCents, 0) / tabs.length;
    const hasUnusualSpikes = tabs.some(t => t.totalCents > avgSpend * 3);
    
    if (hasUnusualSpikes) {
      alerts.push({
        type: 'SPENDING_ANOMALY',
        severity: 'LOW',
        message: 'Unusual spending pattern detected'
      });
    }
    
    // Check 3: Multiple recent chargebacks
    const chargebacks = await prisma.trustIncident.count({
      where: {
        customerId,
        type: 'CHARGEBACK',
        date: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    if (chargebacks > 0) {
      alerts.push({
        type: 'CHARGEBACK_RISK',
        severity: 'HIGH',
        message: `${chargebacks} chargebacks in 90 days`
      });
    }
    
    return alerts;
  }
}
```

---

_Technical Specification v1.0_
_Generated: 2025-11-25_
_For: Crowdiant Restaurant OS - Trust Scoring System_
