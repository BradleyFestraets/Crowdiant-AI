/**
 * Stripe Integration Module
 *
 * Story 3.1: Stripe Connect Integration Setup
 *
 * Exports all Stripe-related utilities for use across the application.
 */

// Client
export { getStripeClient, stripe } from "./client";

// Configuration
export {
  STRIPE_API_VERSION,
  STRIPE_CONFIG,
  PLATFORM_FEE_PERCENT,
  getStripeDashboardUrl,
} from "./config";

// Connect operations
export {
  createConnectAccount,
  createAccountLink,
  getAccountDetails,
  isAccountReady,
  createDashboardLoginLink,
  StripeConnectErrorCodes,
  type OnboardingStatus,
  type ConnectedAccountDetails,
  type StripeConnectErrorCode,
} from "./connect";

// Webhook handling
export {
  handleStripeWebhook,
  type WebhookHandlerResult,
} from "./webhooks";
