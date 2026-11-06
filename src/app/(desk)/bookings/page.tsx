import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/money";
import { getStore } from "@/lib/store";
import { formatWhen } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/domain";
import Link from "next/link";

export const dynamic = "force-dynamic";

const FILTERS: { label: string; value?: BookingStatus }[] = [
  { label: "All" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Rescheduled", value: "rescheduled" },
  { label: "Cancelled", value: "cancelled" },
];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = FILTERS.find((filter) => filter.value === params.status)?.value;
  const store = await getStore();
  const bookings = await store.listBookings(status);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-brass">Schedule</p>
        <h1 className="font-serif text-4xl text-spruce-deep">Bookings</h1>
      </header>
      <div className="flex flex-wrap gap-2" data-testid="booking-filters">
        {FILTERS.map((filter) => {
          const href = filter.value ? `/bookings?status=${filter.value}` : "/bookings";
          const selected = (status ?? undefined) === filter.value;
          return (
            <Link
              key={filter.label}
              href={href}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                selected ? "border-spruce bg-spruce text-white" : "border-line bg-card text-ink",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>
      <div className="overflow-hidden rounded-3xl border border-line bg-card">
        {bookings.length === 0 ? <p className="p-6 text-sm text-muted">No bookings in this view.</p> : null}
        <ul>
          {bookings.map((booking) => (
            <li key={booking.id} className="border-b border-line last:border-b-0" data-testid="booking-row">
              <Link href={`/bookings/${booking.id}`} className="grid gap-2 px-4 py-4 hover:bg-foam md:grid-cols-[8rem_1fr_1fr_auto] md:items-center">
                <span className="font-medium">{booking.id}</span>
                <span>
                  <span className="block">{booking.customerName}</span>
                  <span className="text-sm text-muted">
                    {booking.addressLine}, {booking.city}
                  </span>
                </span>
                <span className="text-sm text-muted">
                  {booking.serviceName}
                  <span className="block">{formatWhen(booking.startsAt)}</span>
                </span>
                <span className="flex items-center gap-3 md:justify-end">
                  <span>{formatCents(booking.quoteCents)}</span>
                  <Badge>{booking.status}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
