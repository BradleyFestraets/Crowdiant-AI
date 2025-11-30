"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useToast } from "~/components/ui/toast";
import { api } from "~/trpc/react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { add } = useToast();

  const requestReset = api.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setSubmitted(true);
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

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Check Your Email
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Password reset instructions sent
            </p>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <div className="mb-4 rounded-full bg-green-100 p-3">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                Email Sent!
              </h3>
              <p className="mb-6 max-w-sm text-center text-gray-500">
                If an account exists with <strong>{email}</strong>, you&apos;ll
                receive a password reset link shortly.
              </p>
              <p className="mb-4 text-sm text-gray-500">
                The link will expire in 1 hour.
              </p>
              <Button asChild variant="outline">
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-gray-500">
            <p>
              Didn&apos;t receive the email?{" "}
              <button
                onClick={() => setSubmitted(false)}
                className="text-primary hover:underline"
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Forgot Password</h1>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;ll send you a link to reset your password
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              Enter the email address associated with your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
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

            <div className="mt-6 text-center text-sm text-gray-600">
              Remember your password?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
