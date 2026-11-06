import Link from "next/link";

export default function BookingMissing() {
  return (
    <div className="space-y-2">
      <h1 className="font-serif text-3xl text-spruce-deep">That booking is not on the desk.</h1>
      <Link href="/bookings" className="text-sm text-spruce underline-offset-2 hover:underline">
        Back to bookings
      </Link>
    </div>
  );
}
