"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RoleSelector } from "./RoleSelector";

interface InviteStaffModalProps {
  venueId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteStaffModal({
  venueId,
  isOpen,
  onClose,
  onSuccess,
}: InviteStaffModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<
    "OWNER" | "MANAGER" | "SERVER" | "KITCHEN" | "HOST" | "CASHIER"
  >("SERVER");

  const inviteStaff = api.user.inviteStaff.useMutation({
    onSuccess: () => {
      onSuccess();
      setEmail("");
      setRole("SERVER");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteStaff.mutate({ venueId, email, role });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Staff Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your team. They&apos;ll receive an email
            with a link to create their account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <RoleSelector value={role} onChange={setRole} />
            </div>
            {inviteStaff.error && (
              <p className="text-sm text-red-600">
                {inviteStaff.error.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteStaff.isPending}>
              {inviteStaff.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
