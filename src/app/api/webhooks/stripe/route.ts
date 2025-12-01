/**
 * Stripe Webhook API Route
 *
 * Receives and processes Stripe webhook events.
 * Verifies webhook signature before processing.
 *
 * Story 3.1: Stripe Connect Integration Setup
 */

import { type NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "~/lib/stripe/webhooks";
import { env } from "~/env";
import { logger } from "~/server/logger";

/**
 * Stripe sends webhooks as POST requests with raw body
 */
export async function POST(request: NextRequest) {
  // Get webhook secret from environment
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  // Get the raw request body for signature verification
  const payload = await request.text();

  // Get Stripe signature header
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    logger.warn("Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 },
    );
  }

  try {
    const result = await handleStripeWebhook(payload, signature, webhookSecret);

    logger.info(
      { eventId: result.eventId, eventType: result.eventType },
      "Webhook processed successfully",
    );

    return NextResponse.json({
      received: true,
      eventId: result.eventId,
      eventType: result.eventType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Log the full error
    logger.error({ error, message }, "Webhook processing failed");

    // Return 400 for signature errors (Stripe will retry)
    if (message.includes("signature")) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 },
      );
    }

    // Return 500 for processing errors (Stripe will retry)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

/**
 * Stripe requires this endpoint to accept OPTIONS for CORS preflight
 * (though webhooks typically don't need CORS)
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
