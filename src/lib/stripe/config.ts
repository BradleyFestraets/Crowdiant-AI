/**
 * Stripe Configuration
 *
 * Centralized configuration for Stripe API settings.
 * Story 3.1: Stripe Connect Integration Setup
 */

import type Stripe from "stripe";

/**
 * Stripe API Version
 * Pin to a specific API version for stability
 * Must match the version in node_modules/stripe/package.json
 */
export const STRIPE_API_VERSION = "2025-11-17.clover" as const;

/**
 * Stripe Connect Configuration
 */
export const STRIPE_CONFIG = {
  /**
   * Account type for venues
   * Using Express accounts for simplified onboarding and managed payouts
   */
  ACCOUNT_TYPE: "express" as const,

  /**
   * Default Express Checkout pre-authorization amounts (in cents)
   */
  PRE_AUTH_DEFAULTS: {
    FOOD_TRUCK: 3000, // $30
    CASUAL_DINING: 5000, // $50
    FINE_DINING: 10000, // $100
    BAR: 7500, // $75
    DEFAULT: 5000, // $50
  },

  /**
   * Pre-authorization settings
   */
  PRE_AUTH: {
    /** Number of days before pre-auth expires (Stripe default is 7) */
    EXPIRY_DAYS: 7,
    /** Alert server at this percentage of pre-auth */
    WARNING_THRESHOLD: 0.9,
    /** Incremental auth amount in cents */
    INCREMENT_AMOUNT: 2500, // $25
  },

  /**
   * Webhook endpoint settings
   */
  WEBHOOK: {
    /** Events we subscribe to */
    EVENTS: [
      "account.updated",
      "account.application.authorized",
      "account.application.deauthorized",
      "payment_intent.created",
      "payment_intent.succeeded",
      "payment_intent.payment_failed",
      "payment_intent.canceled",
      "payment_intent.requires_action",
      "charge.dispute.created",
      "charge.dispute.updated",
      "charge.dispute.closed",
      "payout.failed",
    ] as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
  },

  /**
   * Retry settings for Stripe operations
   */
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY_MS: 1000,
    MAX_DELAY_MS: 10000,
  },
} as const;

/**
 * Platform fee percentage (if applicable)
 * Set to 0 for now - can be configured per venue tier later
 */
export const PLATFORM_FEE_PERCENT = 0;

/**
 * Get the Stripe dashboard URL for a connected account
 */
export function getStripeDashboardUrl(accountId: string): string {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://dashboard.stripe.com"
      : "https://dashboard.stripe.com/test";
  return `${baseUrl}/connect/accounts/${accountId}`;
}
