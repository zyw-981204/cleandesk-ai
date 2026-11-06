import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { upcomingVisits } from "@/lib/booking";
import { formatCents } from "@/lib/money";
import { getStore } from "@/lib/store";
import { formatWhen } from "@/lib/time";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const store = await getStore();
  const [stats, bookings, areas] = await Promise.all([
    store.stats(),
    store.listBookings(),
    store.listAreas(),
  ]);
  const upcoming = upcomingVisits(bookings);

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-sm text-brass">Today on the desk</p>
        <h1 className="mt-1 font-serif text-4xl tracking-tight text-spruce-deep md:text-5xl">
          Visits, quotes, and an assistant that waits to be sure.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          BrightHarbor Cleaning covers four Harborlight towns. Prices come from the catalog. A booking is written only after someone presses Confirm.
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Upcoming", stats.upcoming],
          ["Open windows", stats.openSlots],
          ["Rescheduled", stats.rescheduled],
          ["Cancelled", stats.cancelled],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
              <p className="mt-1 font-serif text-4xl text-spruce-deep">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Next visits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.map((booking) => (
              <Link key={booking.id} href={`/bookings/${booking.id}`} className="block rounded-2xl border border-line px-3 py-3 hover:bg-foam">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{booking.customerName}</p>
                  <Badge>{booking.status}</Badge>
                </div>
                <p className="text-sm text-muted">
                  {booking.serviceName} · {formatWhen(booking.startsAt)} · {formatCents(booking.quoteCents)}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Service towns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {areas.map((area) => (
              <div key={area.id}>
                <p className="font-medium">{area.city}</p>
                <p className="text-muted">{area.postalCodes.join(", ")}</p>
              </div>
            ))}
            <Link href="/assistant" className="inline-block pt-2 text-spruce underline-offset-2 hover:underline">
              Ask the assistant for a quote
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
