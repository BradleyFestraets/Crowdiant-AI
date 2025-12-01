/**
 * Stripe Webhook Handlers
 *
 * Processes incoming Stripe webhook events for:
 * - Account status changes (onboarding, disabled)
 * - Payment events (success, failure, disputes)
 * - Payout events
 *
 * Story 3.1: Stripe Connect Integration Setup
 */

import type Stripe from "stripe";
import { getStripeClient } from "./client";
import { db } from "~/server/db";
import { logger } from "~/server/logger";

/**
 * Result of processing a webhook event
 */
export interface WebhookHandlerResult {
  success: boolean;
  message: string;
  eventId: string;
  eventType: string;
}

/**
 * Process an incoming Stripe webhook event
 *
 * @param payload - Raw request body
 * @param signature - Stripe-Signature header value
 * @returns Processing result
 */
export async function handleStripeWebhook(
  payload: string,
  signature: string,
  webhookSecret: string,
): Promise<WebhookHandlerResult> {
  const stripe = getStripeClient();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown signature error";
    logger.error({ err }, "Webhook signature verification failed");
    throw new Error(`Webhook signature verification failed: ${message}`);
  }

  logger.info(
    { eventId: event.id, eventType: event.type },
    "Processing Stripe webhook",
  );

  try {
    await processWebhookEvent(event);

    return {
      success: true,
      message: "Webhook processed successfully",
      eventId: event.id,
      eventType: event.type,
    };
  } catch (err) {
    logger.error(
      { err, eventId: event.id, eventType: event.type },
      "Error processing webhook",
    );
    throw err;
  }
}

/**
 * Route webhook events to appropriate handlers
 */
async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    // Account events
    case "account.updated":
      await handleAccountUpdated(event.data.object);
      break;

    case "account.application.authorized":
      // This event contains an Application object, but we need the account
      // The account ID is in the event.account field
      if (event.account) {
        await handleAccountAuthorized(event.account);
      }
      break;

    case "account.application.deauthorized":
      // This event contains an Application object, but we need the account
      if (event.account) {
        await handleAccountDeauthorized(event.account);
      }
      break;

    // Payment intent events
    case "payment_intent.succeeded":
      await handlePaymentSucceeded(event.data.object);
      break;

    case "payment_intent.payment_failed":
      await handlePaymentFailed(event.data.object);
      break;

    case "payment_intent.canceled":
      await handlePaymentCanceled(event.data.object);
      break;

    case "payment_intent.requires_action":
      await handlePaymentRequiresAction(
        event.data.object,
      );
      break;

    // Dispute events
    case "charge.dispute.created":
      await handleDisputeCreated(event.data.object);
      break;

    case "charge.dispute.updated":
      await handleDisputeUpdated(event.data.object);
      break;

    case "charge.dispute.closed":
      await handleDisputeClosed(event.data.object);
      break;

    // Payout events
    case "payout.failed":
      await handlePayoutFailed(event.data.object);
      break;

    default:
      logger.info({ eventType: event.type }, "Unhandled webhook event type");
  }
}

// ============================================================================
// Account Handlers
// ============================================================================

/**
 * Handle account.updated event
 * Updates venue's Stripe onboarding status based on account changes
 */
async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const venueId = account.metadata?.venueId;

  if (!venueId) {
    logger.warn(
      { accountId: account.id },
      "Account updated but no venueId in metadata",
    );
    return;
  }

  // Determine onboarding status
  const isOnboarded = account.charges_enabled && account.details_submitted;
  const isDisabled = !!account.requirements?.disabled_reason;

  await db.venue.update({
    where: { id: venueId },
    data: {
      stripeOnboarded: isOnboarded && !isDisabled,
    },
  });

  logger.info(
    {
      venueId,
      accountId: account.id,
      isOnboarded,
      isDisabled,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
    },
    "Venue Stripe status updated",
  );

  // Log any outstanding requirements
  if (
    account.requirements?.currently_due &&
    account.requirements.currently_due.length > 0
  ) {
    logger.info(
      {
        venueId,
        requirements: account.requirements.currently_due,
      },
      "Account has outstanding requirements",
    );
  }
}

/**
 * Handle new account authorization (OAuth connect flow completed)
 * For account.application.authorized, we receive just the account ID
 */
async function handleAccountAuthorized(accountId: string): Promise<void> {
  // Look up the venue by Stripe account ID
  const venue = await db.venue.findFirst({
    where: { stripeAccountId: accountId },
    select: { id: true },
  });

  logger.info(
    { accountId, venueId: venue?.id },
    "Stripe account authorized for platform",
  );

  // The account.updated event will handle the actual status update
}

/**
 * Handle account deauthorization (venue disconnected their Stripe)
 * For account.application.deauthorized, we receive just the account ID
 */
async function handleAccountDeauthorized(accountId: string): Promise<void> {
  // Look up the venue by Stripe account ID
  const venue = await db.venue.findFirst({
    where: { stripeAccountId: accountId },
    select: { id: true },
  });

  if (!venue) {
    logger.warn(
      { accountId },
      "Account deauthorized but no venue found with this account",
    );
    return;
  }

  await db.venue.update({
    where: { id: venue.id },
    data: {
      stripeOnboarded: false,
    },
  });

  logger.warn(
    { venueId: venue.id, accountId },
    "Venue disconnected Stripe account",
  );

  // TODO: Send notification email to venue owner
}

// ============================================================================
// Payment Intent Handlers
// ============================================================================

/**
 * Handle successful payment capture
 */
async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const { venueId, type } = paymentIntent.metadata;

  logger.info(
    {
      paymentIntentId: paymentIntent.id,
      venueId,
      type,
      amount: paymentIntent.amount,
      amountReceived: paymentIntent.amount_received,
    },
    "Payment succeeded",
  );

  // TODO: Update tab status when Tab model exists (Story 3.2+)
}

/**
 * Handle payment failure
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const { venueId, type } = paymentIntent.metadata;
  const error = paymentIntent.last_payment_error;

  logger.error(
    {
      paymentIntentId: paymentIntent.id,
      venueId,
      type,
      errorCode: error?.code,
      errorMessage: error?.message,
    },
    "Payment failed",
  );

  // TODO: Update tab status and notify staff (Story 3.2+)
}

/**
 * Handle canceled payment intent (pre-auth released)
 */
async function handlePaymentCanceled(
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const { venueId, type } = paymentIntent.metadata;

  logger.info(
    {
      paymentIntentId: paymentIntent.id,
      venueId,
      type,
      cancellationReason: paymentIntent.cancellation_reason,
    },
    "Payment canceled/released",
  );

  // TODO: Update tab status (Story 3.2+)
}

/**
 * Handle payment requiring additional action (3DS, etc.)
 */
async function handlePaymentRequiresAction(
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const { venueId } = paymentIntent.metadata;

  logger.info(
    {
      paymentIntentId: paymentIntent.id,
      venueId,
      nextAction: paymentIntent.next_action?.type,
    },
    "Payment requires additional action",
  );

  // TODO: Notify customer via SMS to complete authentication (Story 3.2+)
}

// ============================================================================
// Dispute Handlers
// ============================================================================

/**
 * Handle new dispute created
 */
async function handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
  logger.error(
    {
      disputeId: dispute.id,
      chargeId: dispute.charge,
      amount: dispute.amount,
      reason: dispute.reason,
      status: dispute.status,
    },
    "Dispute created - REQUIRES IMMEDIATE ATTENTION",
  );

  // TODO: Mark tab as disputed, notify venue owner (Story 3.1+)
  // TODO: Send alert to ops team
}

/**
 * Handle dispute status update
 */
async function handleDisputeUpdated(dispute: Stripe.Dispute): Promise<void> {
  logger.info(
    {
      disputeId: dispute.id,
      status: dispute.status,
      reason: dispute.reason,
    },
    "Dispute updated",
  );
}

/**
 * Handle dispute closed (won, lost, or withdrawn)
 */
async function handleDisputeClosed(dispute: Stripe.Dispute): Promise<void> {
  const won = dispute.status === "won";

  logger.info(
    {
      disputeId: dispute.id,
      status: dispute.status,
      won,
    },
    "Dispute closed",
  );

  // TODO: Update venue analytics, adjust trust score if customer disputed
}

// ============================================================================
// Payout Handlers
// ============================================================================

/**
 * Handle failed payout
 */
async function handlePayoutFailed(payout: Stripe.Payout): Promise<void> {
  logger.error(
    {
      payoutId: payout.id,
      amount: payout.amount,
      failureCode: payout.failure_code,
      failureMessage: payout.failure_message,
    },
    "Payout failed - venue needs to update bank details",
  );

  // TODO: Notify venue owner to update bank details
}
