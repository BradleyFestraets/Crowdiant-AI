import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { LogoutButton } from "~/components/auth/LogoutButton";
import { Building2, Plus } from "lucide-react";

export default async function DashboardIndexPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Get all venues the user has access to
  const staffAssignments = await db.staffAssignment.findMany({
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

  // If user only has one venue, redirect directly to it
  if (staffAssignments.length === 1 && staffAssignments[0]) {
    redirect(`/dashboard/${staffAssignments[0].venue.slug}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-primary text-xl font-bold">Crowdiant</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{session.user.name}</span>
            <LogoutButton variant="ghost" size="sm" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Venues</h1>
          <p className="mt-2 text-gray-600">
            Select a venue to manage or create a new one.
          </p>
        </div>

        {staffAssignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No venues yet
              </h3>
              <p className="mb-6 max-w-sm text-center text-gray-500">
                You don&apos;t have access to any venues. Create your first
                venue to get started.
              </p>
              <Button asChild>
                <Link href="/register/venue">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Venue
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {staffAssignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/dashboard/${assignment.venue.slug}`}
              >
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="text-primary h-5 w-5" />
                      {assignment.venue.name}
                    </CardTitle>
                    <CardDescription>
                      {assignment.role} • {assignment.venue.timezone}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      /{assignment.venue.slug}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Add new venue card */}
            <Link href="/register/venue">
              <Card className="h-full cursor-pointer border-dashed transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Plus className="mb-2 h-8 w-8 text-gray-400" />
                  <p className="font-medium text-gray-600">Add Another Venue</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
