"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { useState } from "react";
import { InviteStaffModal } from "./InviteStaffModal";

interface StaffListProps {
  venueId: string;
}

export function StaffList({ venueId }: StaffListProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const { data, isLoading, refetch } = api.user.listStaff.useQuery({ venueId });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const roleColors: Record<string, string> = {
    OWNER: "bg-purple-100 text-purple-800",
    MANAGER: "bg-blue-100 text-blue-800",
    SERVER: "bg-green-100 text-green-800",
    KITCHEN: "bg-orange-100 text-orange-800",
    HOST: "bg-pink-100 text-pink-800",
    CASHIER: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Staff Management</h2>
        <Button onClick={() => setIsInviteModalOpen(true)}>
          + Invite Staff
        </Button>
      </div>

      {/* Active Staff */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">
          Active Staff ({data?.activeStaff.length ?? 0})
        </h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.activeStaff.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell className="font-medium">
                    {staff.user.name}
                  </TableCell>
                  <TableCell>{staff.user.email}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[staff.role]}>
                      {staff.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(staff.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pending Invitations */}
      {data?.pendingInvitations && data.pendingInvitations.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold">
            Pending Invitations ({data.pendingInvitations.length})
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      {invitation.email}
                    </TableCell>
                    <TableCell>
                      <Badge className={roleColors[invitation.role]}>
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <InviteStaffModal
        venueId={venueId}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => {
          void refetch();
          setIsInviteModalOpen(false);
        }}
      />
    </div>
  );
}
