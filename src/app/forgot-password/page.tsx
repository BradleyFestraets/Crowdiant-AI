"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/trpc/react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const { add } = useToast();

  const requestReset = api.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      add({
        title: "Password Reset Requested",
        description:
          "If an account exists with this email, you'll receive a reset link shortly.",
      });
      setEmail("");
    },
    onError: (error) => {
      add({
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      add({
        title: "Email Required",
        description: "Please enter your email address",
      });
      return;
    }
    requestReset.mutate({ email });
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Forgot Password</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your email address and we&apos;ll send you a password reset
            link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="chef@restaurant.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              disabled={requestReset.isPending}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={requestReset.isPending}
          >
            {requestReset.isPending ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <div className="text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
