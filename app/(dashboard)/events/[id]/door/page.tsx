import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DoorScanner } from "@/components/dashboard/door-scanner";
import { getDoorStats } from "@/app/actions/check-in";

// Attendance changes by the second while a door is running.
export const dynamic = "force-dynamic";

export default async function DoorPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, creator_id")
    .eq("id", params.id)
    .maybeSingle();

  // RLS would hide someone else's event anyway; this is the readable
  // version of the same answer.
  if (!event || !user || event.creator_id !== user.id) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-lg font-bold text-text">Event not found</h1>
        <p className="mt-2 text-sm text-subtle">
          This event doesn&apos;t exist, or it isn&apos;t yours.
        </p>
        <Link
          href="/events"
          className="mt-6 inline-block text-sm font-semibold text-[var(--coral)] hover:underline"
        >
          Back to events
        </Link>
      </div>
    );
  }

  const stats = await getDoorStats(event.id);

  return <DoorScanner eventId={event.id} eventTitle={event.title} initialStats={stats} />;
}
