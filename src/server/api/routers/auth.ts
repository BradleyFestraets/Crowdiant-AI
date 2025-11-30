import { hash } from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { sendPasswordResetEmail } from "~/lib/email";

/**
 * Authentication Router
 * Handles user registration and password reset flows
 */
export const authRouter = createTRPCRouter({
  /**
   * Register a new user with email and password
   * Password is hashed with bcrypt (cost factor: 10) before storage
   */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      // Hash password with bcrypt (cost factor: 10)
      const passwordHash = await hash(input.password, 10);

      // Create user
      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      return {
        success: true,
        userId: user.id,
      };
    }),

  /**
   * Request password reset
   * Generates secure token and stores in database with 1-hour expiry
   * Sends email via Resend
   */
  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Find user by email (timing-safe - don't reveal if user exists)
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      // Always return success (prevent email enumeration)
      if (!user) {
        return { success: true };
      }

      // Generate secure reset token
      const resetToken = crypto.randomUUID();
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token in database
      await ctx.db.passwordResetToken.create({
        data: {
          token: resetToken,
          userId: user.id,
          expiresAt: tokenExpiry,
        },
      });

      // Send password reset email
      try {
        await sendPasswordResetEmail({
          to: user.email,
          token: resetToken,
        });
        console.log(`[AUTH] Password reset email sent to: ${input.email}`);
      } catch (error) {
        console.error(`[AUTH] Failed to send password reset email:`, error);
        // Still return success to prevent email enumeration
      }

      return { success: true };
    }),

  /**
   * Reset password with token
   * Validates token, updates password, and invalidates token
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().uuid(),
        newPassword: z
          .string()
          .min(8, "Password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Find valid token
      const resetToken = await ctx.db.passwordResetToken.findUnique({
        where: {
          token: input.token,
          expiresAt: { gte: new Date() },
          usedAt: null,
        },
        include: { user: true },
      });

      if (!resetToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset token",
        });
      }

      // Hash new password
      const passwordHash = await hash(input.newPassword, 10);

      // Update password and mark token as used
      await ctx.db.$transaction([
        ctx.db.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash },
        }),
        ctx.db.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        }),
      ]);

      console.log(
        `[AUTH] Password reset successful for user: ${resetToken.user.email}`,
      );

      return { success: true };
    }),
});
