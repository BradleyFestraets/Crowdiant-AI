import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import Link from "next/link";
import { LogoutButton } from "~/components/auth/LogoutButton";
import { VenueSelector } from "~/components/venue/VenueSelector";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const session = await auth();
  const { slug } = await params;

  if (!session?.user) {
    redirect("/login");
  }

  // Get venue and verify access
  const venue = await db.venue.findUnique({
    where: { slug },
  });

  if (!venue) {
    redirect("/dashboard");
  }

  // Verify user has access to this venue
  const staffAssignment = await db.staffAssignment.findFirst({
    where: {
      userId: session.user.id,
      venueId: venue.id,
      deletedAt: null,
    },
  });

  if (!staffAssignment) {
    redirect("/dashboard");
  }

  // Get all venues the user has access to for the venue selector
  const allStaffAssignments = await db.staffAssignment.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
    },
    include: {
      venue: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const venues = allStaffAssignments.map((sa) => ({
    id: sa.venue.id,
    name: sa.venue.name,
    slug: sa.venue.slug,
    role: sa.role,
  }));

  const currentVenue = {
    id: venue.id,
    name: venue.name,
    slug: venue.slug,
    role: staffAssignment.role,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left side - Logo and venue selector */}
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/${slug}`}
              className="flex items-center gap-2"
            >
              <span className="text-primary text-xl font-bold">Crowdiant</span>
            </Link>
            <span className="text-gray-300">|</span>
            <VenueSelector currentVenue={currentVenue} venues={venues} />
          </div>

          {/* Right side - Navigation and user menu */}
          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-4 md:flex">
              <Link
                href={`/dashboard/${slug}`}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              {(staffAssignment.role === "OWNER" ||
                staffAssignment.role === "MANAGER") && (
                <Link
                  href={`/dashboard/${slug}/settings/staff`}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Staff
                </Link>
              )}
            </nav>

            {/* User menu */}
            <div className="flex items-center gap-3 border-l pl-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {session.user.name}
                </p>
                <p className="text-xs text-gray-500">Logged in</p>
              </div>
              <LogoutButton variant="ghost" size="sm" />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
