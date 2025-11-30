import { StaffList } from "~/components/staff/StaffList";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { db } from "~/server/db";

interface StaffPageProps {
    params: Promise<{ slug: string }>;
}

export default async function StaffPage({ params }: StaffPageProps) {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user) {
        redirect("/login");
    }

    // Get venue by slug
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
            role: {
                in: ["OWNER", "MANAGER"],
            },
        },
    });

    if (!staffAssignment) {
        redirect(`/dashboard/${slug}`);
    }

    return (
        <div className="container mx-auto py-8">
            <StaffList venueId={venue.id} />
        </div>
    );
}
