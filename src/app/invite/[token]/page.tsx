"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";
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

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const acceptInvitation = api.user.acceptInvitation.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/${data.venueSlug}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    acceptInvitation.mutate({ token, name, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            Create your account to join the team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {acceptInvitation.error && (
              <p className="text-sm text-red-600">
                {acceptInvitation.error.message}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={acceptInvitation.isPending}
            >
              {acceptInvitation.isPending
                ? "Creating Account..."
                : "Accept & Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
