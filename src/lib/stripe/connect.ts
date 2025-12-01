/**
 * Stripe Connect Service
 *
 * Handles Stripe Connect account operations for venues:
 * - Account creation and onboarding
 * - Account status checks
 * - Account disconnection
 *
 * Story 3.1: Stripe Connect Integration Setup
 */

import type Stripe from "stripe";
import { getStripeClient } from "./client";
import { STRIPE_CONFIG, getStripeDashboardUrl } from "./config";
import { env } from "~/env";

/**
 * Account onboarding status
 */
export type OnboardingStatus =
  | "not_started"
  | "incomplete"
  | "pending_verification"
  | "complete"
  | "restricted"
  | "disabled";

/**
 * Connected account details
 */
export interface ConnectedAccountDetails {
  accountId: string;
  onboardingStatus: OnboardingStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    pendingVerification: string[];
  };
  dashboardUrl: string;
}

/**
 * Create a new Stripe Connect Express account for a venue
 *
 * @param venueId - The venue ID (for metadata)
 * @param venueName - The venue's business name
 * @param email - The venue owner's email
 * @returns The created Stripe account ID
 */
export async function createConnectAccount(
  venueId: string,
  venueName: string,
  email: string,
): Promise<string> {
  const stripe = getStripeClient();

  const account = await stripe.accounts.create({
    type: STRIPE_CONFIG.ACCOUNT_TYPE,
    email,
    business_type: "company",
    business_profile: {
      name: venueName,
      mcc: "5812", // Restaurants
      product_description: "Restaurant food and beverage services",
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      venueId,
      platform: "crowdiant",
    },
  });

  return account.id;
}

/**
 * Generate an Account Link for onboarding or updating
 *
 * @param accountId - The Stripe account ID
 * @param venueSlug - The venue slug for return URLs
 * @param type - The type of link (onboarding or update)
 * @returns The account link URL
 */
export async function createAccountLink(
  accountId: string,
  venueSlug: string,
  type: "account_onboarding" | "account_update" = "account_onboarding",
): Promise<string> {
  const stripe = getStripeClient();

  const baseUrl = env.NEXTAUTH_URL ?? "http://localhost:3000";
  const returnUrl = `${baseUrl}/dashboard/${venueSlug}/settings/payments?onboarding=complete`;
  const refreshUrl = `${baseUrl}/dashboard/${venueSlug}/settings/payments?onboarding=refresh`;

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    type,
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });

  return accountLink.url;
}

/**
 * Get the current status of a connected account
 *
 * @param accountId - The Stripe account ID
 * @returns Account details including onboarding status
 */
export async function getAccountDetails(
  accountId: string,
): Promise<ConnectedAccountDetails> {
  const stripe = getStripeClient();

  const account = await stripe.accounts.retrieve(accountId);

  return {
    accountId: account.id,
    onboardingStatus: determineOnboardingStatus(account),
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    requirements: {
      currentlyDue: account.requirements?.currently_due ?? [],
      eventuallyDue: account.requirements?.eventually_due ?? [],
      pastDue: account.requirements?.past_due ?? [],
      pendingVerification: account.requirements?.pending_verification ?? [],
    },
    dashboardUrl: getStripeDashboardUrl(accountId),
  };
}

/**
 * Check if a connected account is fully onboarded and ready for payments
 *
 * @param accountId - The Stripe account ID
 * @returns True if the account can accept charges
 */
export async function isAccountReady(accountId: string): Promise<boolean> {
  const details = await getAccountDetails(accountId);
  return details.chargesEnabled && details.detailsSubmitted;
}

/**
 * Create a login link for the Express dashboard
 *
 * @param accountId - The Stripe account ID
 * @returns URL to the Express dashboard
 */
export async function createDashboardLoginLink(
  accountId: string,
): Promise<string> {
  const stripe = getStripeClient();

  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}

/**
 * Determine the onboarding status from account data
 */
function determineOnboardingStatus(account: Stripe.Account): OnboardingStatus {
  // Check if account is disabled
  if (account.requirements?.disabled_reason) {
    return "disabled";
  }

  // Check for restrictions
  if (
    account.requirements?.past_due &&
    account.requirements.past_due.length > 0
  ) {
    return "restricted";
  }

  // Check if fully onboarded
  if (account.charges_enabled && account.details_submitted) {
    // Still pending verification?
    if (
      account.requirements?.pending_verification &&
      account.requirements.pending_verification.length > 0
    ) {
      return "pending_verification";
    }
    return "complete";
  }

  // Has started but not complete
  if (account.details_submitted) {
    return "pending_verification";
  }

  // Has account but hasn't submitted details
  if (account.id) {
    return "incomplete";
  }

  return "not_started";
}

/**
 * Error codes for Stripe Connect operations
 */
export const StripeConnectErrorCodes = {
  ONBOARDING_INCOMPLETE: "ONBOARDING_INCOMPLETE",
  ACCOUNT_DISABLED: "ACCOUNT_DISABLED",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  CHARGES_DISABLED: "CHARGES_DISABLED",
  INVALID_REQUEST: "INVALID_REQUEST",
} as const;

export type StripeConnectErrorCode =
  (typeof StripeConnectErrorCodes)[keyof typeof StripeConnectErrorCodes];
