/**
 * Stripe Client Singleton
 *
 * Initializes and exports the Stripe SDK client.
 * Story 3.1: Stripe Connect Integration Setup
 */

import Stripe from "stripe";
import { env } from "~/env";
import { STRIPE_API_VERSION } from "./config";

/**
 * Get the Stripe client instance
 *
 * Uses a singleton pattern to avoid creating multiple Stripe instances.
 * Throws an error if STRIPE_SECRET_KEY is not configured.
 */
function createStripeClient(): Stripe {
  const secretKey = env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. " +
        "Please add it to your environment variables.",
    );
  }

  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
    // Enable automatic retries for idempotent requests
    maxNetworkRetries: 3,
    // Set a reasonable timeout
    timeout: 30000, // 30 seconds
    appInfo: {
      name: "Crowdiant Restaurant OS",
      version: "0.1.0",
      url: "https://crowdiant.com",
    },
  });
}

// Lazy initialization - only create client when first accessed
let stripeClient: Stripe | null = null;

/**
 * Get the Stripe client
 *
 * @returns Stripe client instance
 * @throws Error if STRIPE_SECRET_KEY is not configured
 */
export function getStripeClient(): Stripe {
  stripeClient ??= createStripeClient();
  return stripeClient;
}

/**
 * Stripe client for direct imports
 * Note: Prefer getStripeClient() for better error handling
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripeClient();
    const value = client[prop as keyof Stripe];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
