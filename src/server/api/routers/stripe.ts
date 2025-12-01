/**
 * Stripe Connect Router
 *
 * Handles Stripe Connect operations for venue payment processing:
 * - Account onboarding
 * - Account status checks
 * - Dashboard access
 * - Pre-authorization operations
 *
 * Story 3.1: Stripe Connect Integration Setup
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  venueProtectedProcedure,
} from "~/server/api/trpc";
import {
  createConnectAccount,
  createAccountLink,
  getAccountDetails,
  createDashboardLoginLink,
} from "~/lib/stripe/connect";
import { getStripeClient } from "~/lib/stripe/client";
import { StaffRole } from "generated/prisma";

/**
 * Check if user has permission to manage Stripe settings
 * Only OWNER role can manage payment settings
 */
function assertCanManagePayments(role: StaffRole) {
  if (role !== StaffRole.OWNER) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only venue owners can manage payment settings",
    });
  }
}

export const stripeRouter = createTRPCRouter({
  /**
   * Start Stripe Connect onboarding for a venue
   *
   * Creates a connected account if one doesn't exist,
   * then returns an Account Link URL for onboarding.
   */
  startOnboarding: venueProtectedProcedure
    .input(z.object({ venueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only owners can set up payments
      assertCanManagePayments(ctx.venueAssignment.role);

      const { venueId } = input;

      // Get venue with current Stripe status
      const venue = await ctx.db.venue.findUnique({
        where: { id: venueId },
        select: {
          id: true,
          name: true,
          slug: true,
          stripeAccountId: true,
          stripeOnboarded: true,
        },
      });

      if (!venue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venue not found",
        });
      }

      // Get owner's email for the Stripe account
      // Note: session is guaranteed to exist by venueProtectedProcedure
      const ownerEmail =
        ctx.session.user.email ?? `owner-${venue.id}@crowdiant.com`;

      let accountId = venue.stripeAccountId;

      // Create new Connect account if none exists
      if (!accountId) {
        try {
          accountId = await createConnectAccount(
            venue.id,
            venue.name,
            ownerEmail,
          );

          // Save the account ID to the venue
          await ctx.db.venue.update({
            where: { id: venue.id },
            data: {
              stripeAccountId: accountId,
              stripeOnboarded: false,
            },
          });
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create Stripe Connect account",
            cause: error,
          });
        }
      }

      // Generate account link for onboarding
      try {
        const onboardingUrl = await createAccountLink(accountId, venue.slug);
        return {
          success: true,
          onboardingUrl,
          accountId,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate onboarding link",
          cause: error,
        });
      }
    }),

  /**
   * Get the current Stripe Connect status for a venue
   */
  getStatus: venueProtectedProcedure
    .input(z.object({ venueId: z.string() }))
    .query(async ({ ctx, input }) => {
      const venue = await ctx.db.venue.findUnique({
        where: { id: input.venueId },
        select: {
          id: true,
          stripeAccountId: true,
          stripeOnboarded: true,
          preAuthAmountCents: true,
        },
      });

      if (!venue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venue not found",
        });
      }

      // No Stripe account yet
      if (!venue.stripeAccountId) {
        return {
          hasAccount: false,
          isOnboarded: false,
          status: "not_started" as const,
          preAuthAmountCents: venue.preAuthAmountCents,
        };
      }

      try {
        const details = await getAccountDetails(venue.stripeAccountId);

        // Update onboarded status if changed
        const isNowOnboarded =
          details.chargesEnabled && details.detailsSubmitted;
        if (isNowOnboarded !== venue.stripeOnboarded) {
          await ctx.db.venue.update({
            where: { id: venue.id },
            data: { stripeOnboarded: isNowOnboarded },
          });
        }

        return {
          hasAccount: true,
          isOnboarded: isNowOnboarded,
          status: details.onboardingStatus,
          chargesEnabled: details.chargesEnabled,
          payoutsEnabled: details.payoutsEnabled,
          requirements: details.requirements,
          dashboardUrl: details.dashboardUrl,
          preAuthAmountCents: venue.preAuthAmountCents,
        };
      } catch {
        // Account might have been deleted externally
        return {
          hasAccount: true,
          isOnboarded: false,
          status: "error" as const,
          error: "Unable to retrieve account status",
          preAuthAmountCents: venue.preAuthAmountCents,
        };
      }
    }),

  /**
   * Get a link to complete or update onboarding
   * Used when onboarding was abandoned or needs updating
   */
  getOnboardingLink: venueProtectedProcedure
    .input(z.object({ venueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCanManagePayments(ctx.venueAssignment.role);

      const venue = await ctx.db.venue.findUnique({
        where: { id: input.venueId },
        select: {
          id: true,
          slug: true,
          stripeAccountId: true,
        },
      });

      if (!venue?.stripeAccountId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No Stripe account exists for this venue",
        });
      }

      const onboardingUrl = await createAccountLink(
        venue.stripeAccountId,
        venue.slug,
        "account_onboarding",
      );

      return { onboardingUrl };
    }),

  /**
   * Get a login link to the Stripe Express Dashboard
   * Allows venue owners to manage their Stripe account
   */
  getDashboardLink: venueProtectedProcedure
    .input(z.object({ venueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCanManagePayments(ctx.venueAssignment.role);

      const venue = await ctx.db.venue.findUnique({
        where: { id: input.venueId },
        select: { stripeAccountId: true, stripeOnboarded: true },
      });

      if (!venue?.stripeAccountId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No Stripe account exists for this venue",
        });
      }

      if (!venue.stripeOnboarded) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe onboarding is not complete",
        });
      }

      try {
        const dashboardUrl = await createDashboardLoginLink(
          venue.stripeAccountId,
        );
        return { dashboardUrl };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create dashboard login link",
          cause: error,
        });
      }
    }),

  /**
   * Update pre-authorization settings for a venue
   */
  updatePreAuthSettings: venueProtectedProcedure
    .input(
      z.object({
        venueId: z.string(),
        preAuthAmountCents: z
          .number()
          .int()
          .min(1000) // Minimum $10
          .max(50000), // Maximum $500
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCanManagePayments(ctx.venueAssignment.role);

      const venue = await ctx.db.venue.update({
        where: { id: input.venueId },
        data: {
          preAuthAmountCents: input.preAuthAmountCents,
        },
        select: {
          id: true,
          preAuthAmountCents: true,
        },
      });

      return {
        success: true,
        preAuthAmountCents: venue.preAuthAmountCents,
      };
    }),

  /**
   * Create a payment intent for pre-authorization
   * Used when opening a new tab with Express Checkout
   */
  createPreAuth: venueProtectedProcedure
    .input(
      z.object({
        venueId: z.string(),
        amountCents: z.number().int().positive(),
        customerId: z.string().optional(), // Stripe customer ID if available
        metadata: z.record(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const venue = await ctx.db.venue.findUnique({
        where: { id: input.venueId },
        select: {
          id: true,
          stripeAccountId: true,
          stripeOnboarded: true,
          currency: true,
        },
      });

      if (!venue?.stripeAccountId || !venue.stripeOnboarded) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe is not configured for this venue",
        });
      }

      try {
        const stripe = getStripeClient();

        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: input.amountCents,
            currency: venue.currency.toLowerCase(),
            capture_method: "manual", // Pre-auth: don't capture immediately
            customer: input.customerId,
            metadata: {
              venueId: venue.id,
              type: "express_checkout_preauth",
              ...input.metadata,
            },
          },
          {
            stripeAccount: venue.stripeAccountId,
          },
        );

        return {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          status: paymentIntent.status,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create pre-authorization",
          cause: error,
        });
      }
    }),

  /**
   * Capture a pre-authorized payment
   * Used when closing a tab
   */
  capturePreAuth: venueProtectedProcedure
    .input(
      z.object({
        venueId: z.string(),
        paymentIntentId: z.string(),
        amountToCapture: z.number().int().positive().optional(), // Capture less than authorized
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const venue = await ctx.db.venue.findUnique({
        where: { id: input.venueId },
        select: { stripeAccountId: true },
      });

      if (!venue?.stripeAccountId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe is not configured for this venue",
        });
      }

      try {
        const stripe = getStripeClient();

        const captureParams: { amount_to_capture?: number } = {};
        if (input.amountToCapture) {
          captureParams.amount_to_capture = input.amountToCapture;
        }

        const paymentIntent = await stripe.paymentIntents.capture(
          input.paymentIntentId,
          captureParams,
          { stripeAccount: venue.stripeAccountId },
        );

        return {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          amountCaptured: paymentIntent.amount_received,
          status: paymentIntent.status,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to capture payment",
          cause: error,
        });
      }
    }),

  /**
   * Cancel/release a pre-authorized payment
   * Used when a tab is voided without charges
   */
  cancelPreAuth: venueProtectedProcedure
    .input(
      z.object({
        venueId: z.string(),
        paymentIntentId: z.string(),
        reason: z
          .enum(["duplicate", "fraudulent", "requested_by_customer", "abandoned"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const venue = await ctx.db.venue.findUnique({
        where: { id: input.venueId },
        select: { stripeAccountId: true },
      });

      if (!venue?.stripeAccountId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe is not configured for this venue",
        });
      }

      try {
        const stripe = getStripeClient();

        const paymentIntent = await stripe.paymentIntents.cancel(
          input.paymentIntentId,
          {
            cancellation_reason: input.reason ?? "requested_by_customer",
          },
          { stripeAccount: venue.stripeAccountId },
        );

        return {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel pre-authorization",
          cause: error,
        });
      }
    }),
});
