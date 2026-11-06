import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import { getStore } from "@/lib/store";
import { formatTime, formatWhen } from "@/lib/time";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const booking = await store.getBooking(id);
  if (!booking) notFound();
  const facts = [
    ["Customer", booking.customerName],
    ["Email", booking.customerEmail],
    ["Phone", booking.customerPhone],
    ["Address", `${booking.addressLine}, ${booking.city} ${booking.postalCode}`],
    ["Home", `${booking.bedrooms} bed · ${booking.bathrooms} bath · ${booking.sqft.toLocaleString("en-US")} sq ft`],
    ["Window", `${formatWhen(booking.startsAt)} – ${formatTime(booking.endsAt)}`],
    ["Cleaner", booking.cleanerName],
    ["Add-ons", booking.addonNames.length > 0 ? booking.addonNames.join(", ") : "None"],
    ["Quote", formatCents(booking.quoteCents)],
    ["Notes", booking.notes || "None"],
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/bookings" className="text-sm text-spruce underline-offset-2 hover:underline">
        All bookings
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>
              {booking.id} · {booking.serviceName}
            </CardTitle>
            <Badge>{booking.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
