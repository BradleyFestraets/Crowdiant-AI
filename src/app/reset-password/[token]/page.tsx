"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { CheckCircle, Lock } from "lucide-react";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const { add } = useToast();

  const resetPassword = api.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    },
    onError: (error) => {
      add({
        title: "Reset Failed",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      add({
        title: "Passwords Don't Match",
        description: "Please ensure both passwords are identical.",
      });
      return;
    }

    if (newPassword.length < 8) {
      add({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    resetPassword.mutate({ token, newPassword });
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Password Reset</h1>
            <p className="mt-2 text-sm text-gray-600">
              Your password has been updated
            </p>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <div className="mb-4 rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                Success!
              </h3>
              <p className="mb-6 max-w-sm text-center text-gray-500">
                Your password has been reset successfully. You&apos;ll be
                redirected to the login page in a moment.
              </p>
              <Button asChild>
                <Link href="/login">Continue to Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create a new password for your account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Set New Password
            </CardTitle>
            <CardDescription>
              Choose a strong password with at least 8 characters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewPassword(e.target.value)
                  }
                  disabled={resetPassword.isPending}
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setConfirmPassword(e.target.value)
                  }
                  disabled={resetPassword.isPending}
                  required
                  minLength={8}
                />
              </div>

              {/* Password requirements hint */}
              <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
                <p className="font-medium">Password requirements:</p>
                <ul className="mt-1 list-inside list-disc">
                  <li>At least 8 characters long</li>
                  <li>Mix of letters and numbers recommended</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={resetPassword.isPending}
              >
                {resetPassword.isPending ? "Resetting..." : "Reset Password"}
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
