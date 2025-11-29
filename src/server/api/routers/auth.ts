import { hash } from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
   * Request password reset (skeleton implementation)
   * TODO: Implement in future epic with email verification
   */
  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .mutation(async () => {
      // Skeleton implementation - will be completed in Epic 2
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Password reset not yet implemented",
      });
    }),
});
