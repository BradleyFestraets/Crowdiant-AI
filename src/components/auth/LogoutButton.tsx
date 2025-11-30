"use client";

import { signOut } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  className?: string;
}

export function LogoutButton({
  variant = "ghost",
  size = "default",
  showIcon = true,
  className,
}: LogoutButtonProps) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      className={className}
    >
      {showIcon && <LogOut className="mr-2 h-4 w-4" />}
      Sign out
    </Button>
  );
}
