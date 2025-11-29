"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  loadingComponent?: ReactNode;
}

/**
 * ProtectedRoute Component
 *
 * Wraps pages/components that require authentication.
 * - Shows loading state while checking session
 * - Redirects to /login if unauthenticated
 * - Renders children if authenticated
 *
 * @example
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  loadingComponent,
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Loading state
  if (status === "loading") {
    return (
      loadingComponent ?? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      )
    );
  }

  // Unauthenticated - will redirect via useEffect
  if (!session) {
    return null;
  }

  // Authenticated - render children
  return <>{children}</>;
}
