import assert from "node:assert/strict";
import test from "node:test";
import { guardAvailability, guardCreate, guardReschedule } from "../src/lib/guards";

const now = new Date("2026-11-06T18:00:00.000Z");

const slots = [
  {
    id: "past",
    startsAt: "2026-11-01T16:00:00.000Z",
    endsAt: "2026-11-01T21:00:00.000Z",
    status: "open" as const,
  },
  {
    id: "taken",
    startsAt: "2026-11-10T16:00:00.000Z",
    endsAt: "2026-11-10T21:00:00.000Z",
    status: "booked" as const,
  },
  {
    id: "open",
    startsAt: "2026-11-10T16:00:00.000Z",
    endsAt: "2026-11-10T21:00:00.000Z",
    status: "open" as const,
  },
  {
    id: "short",
    startsAt: "2026-11-10T16:00:00.000Z",
    endsAt: "2026-11-10T17:00:00.000Z",
    status: "open" as const,
  },
];

const ctx = {
  now,
  areaZips: ["88012", "88021"],
  slots,
  serviceHours: { deep: 4, standard: 2 },
  activeSlotIds: new Set(["taken"]),
};

const valid = {
  serviceSlug: "deep",
  addonSlugs: ["oven"],
  sqft: 1100,
  bedrooms: 2,
  bathrooms: 2,
  postalCode: "88012",
  slotId: "open",
  customerName: "Quinn Hale",
  addressLine: "18 Lantern Row",
};

test("availability rejects a past date", () => {
  const result = guardAvailability({ postalCode: "88012", date: "2026-11-01" }, { now, areaZips: ctx.areaZips });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /past/i);
});

test("create booking rejects postal codes outside the service area", () => {
  const result = guardCreate({ ...valid, postalCode: "10001" }, ctx);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /service area/i);
});

test("create booking rejects past windows and slots that already have a booking", () => {
  const past = guardCreate({ ...valid, slotId: "past" }, ctx);
  assert.equal(past.ok, false);
  if (!past.ok) assert.match(past.error, /past/i);

  const conflict = guardCreate({ ...valid, slotId: "taken" }, ctx);
  assert.equal(conflict.ok, false);
  if (!conflict.ok) assert.match(conflict.error, /already has a booking/i);
});

test("create booking rejects a window shorter than the service", () => {
  const result = guardCreate({ ...valid, slotId: "short" }, ctx);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /too short/i);
});

test("an open future window in the service area passes", () => {
  const result = guardCreate(valid, ctx);
  assert.equal(result.ok, true);
});

test("reschedule rejects the same slot and cancelled bookings", () => {
  const same = guardReschedule(
    { bookingId: "bk-1", slotId: "open" },
    { ...ctx, bookingSlotId: "open", bookingStatus: "confirmed", serviceSlug: "standard" },
  );
  assert.equal(same.ok, false);

  const cancelled = guardReschedule(
    { bookingId: "bk-1", slotId: "open" },
    { ...ctx, bookingSlotId: "taken", bookingStatus: "cancelled", serviceSlug: "standard" },
  );
  assert.equal(cancelled.ok, false);
  if (!cancelled.ok) assert.match(cancelled.error, /Cancelled/);
});
