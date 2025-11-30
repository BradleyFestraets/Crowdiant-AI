import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Users, CalendarDays, DollarSign, TrendingUp } from "lucide-react";

interface DashboardPageProps {
    params: Promise<{ slug: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user) {
        redirect("/login");
    }

    // Get venue
    const venue = await db.venue.findUnique({
        where: { slug },
        include: {
            staff: {
                where: { deletedAt: null },
                include: { user: true },
            },
        },
    });

    if (!venue) {
        redirect("/dashboard");
    }

    // Verify user has access
    const staffAssignment = venue.staff.find(s => s.userId === session.user.id);
    if (!staffAssignment) {
        redirect("/dashboard");
    }

    // Stats (placeholder - will be real data in future epics)
    const stats = [
        {
            title: "Active Staff",
            value: venue.staff.length.toString(),
            description: "Team members",
            icon: Users,
            trend: "+2 this week",
        },
        {
            title: "Today's Revenue",
            value: "$0.00",
            description: "Coming soon",
            icon: DollarSign,
            trend: "POS integration pending",
        },
        {
            title: "Reservations",
            value: "0",
            description: "Coming soon",
            icon: CalendarDays,
            trend: "Reservations pending",
        },
        {
            title: "Express Checkouts",
            value: "0",
            description: "Coming soon",
            icon: TrendingUp,
            trend: "Epic 3 pending",
        },
    ];

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">
                    Welcome back, {session.user.name?.split(" ")[0] ?? "there"}!
                </h1>
                <p className="mt-2 text-gray-600">
                    Here&apos;s what&apos;s happening at {venue.name} today.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-gray-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">{stat.trend}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                        Common tasks for managing your venue
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        {(staffAssignment.role === "OWNER" || staffAssignment.role === "MANAGER") && (
                            <a
                                href={`/dashboard/${slug}/settings/staff`}
                                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                            >
                                <Users className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-medium">Manage Staff</p>
                                    <p className="text-sm text-gray-500">Invite and manage team</p>
                                </div>
                            </a>
                        )}
                        <div className="flex items-center gap-3 rounded-lg border p-4 bg-gray-50 opacity-50 cursor-not-allowed">
                            <DollarSign className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="font-medium text-gray-500">Point of Sale</p>
                                <p className="text-sm text-gray-400">Coming in Epic 4</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg border p-4 bg-gray-50 opacity-50 cursor-not-allowed">
                            <CalendarDays className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="font-medium text-gray-500">Reservations</p>
                                <p className="text-sm text-gray-400">Coming in Epic 11</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Venue Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Venue Information</CardTitle>
                    <CardDescription>
                        Details about your venue
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Venue Name</dt>
                            <dd className="mt-1 text-sm text-gray-900">{venue.name}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">URL Slug</dt>
                            <dd className="mt-1 text-sm text-gray-900">{venue.slug}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Timezone</dt>
                            <dd className="mt-1 text-sm text-gray-900">{venue.timezone}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Currency</dt>
                            <dd className="mt-1 text-sm text-gray-900">{venue.currency}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Your Role</dt>
                            <dd className="mt-1 text-sm text-gray-900">{staffAssignment.role}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Stripe Connected</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {venue.stripeOnboarded ? "Yes" : "Not yet (Epic 3)"}
                            </dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>
        </div>
    );
}
