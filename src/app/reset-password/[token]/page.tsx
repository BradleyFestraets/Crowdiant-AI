"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { api } from "@/trpc/react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { add } = useToast();
  
  const resetPassword = api.auth.resetPassword.useMutation({
    onSuccess: () => {
      add({
        title: "Password Reset Successful",
        description: "You can now log in with your new password.",
      });
      setTimeout(() => router.push("/login"), 2000);
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

  return (
    <ToastProvider>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
              disabled={resetPassword.isPending}
              required
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              disabled={resetPassword.isPending}
              required
              minLength={8}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={resetPassword.isPending}
          >
            {resetPassword.isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

          <div className="text-center text-sm">
            <Link
              href="/login"
              className="text-primary hover:underline"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
