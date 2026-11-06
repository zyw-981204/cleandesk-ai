import {
  ADDONS,
  AREAS,
  BOOKING_BLUEPRINTS,
  CLEANERS,
  CUSTOMERS,
  KB_CHUNKS,
  SERVICES,
} from "@/lib/catalog";
import type { Dataset, TimeSlot } from "@/lib/domain";
import { calculateQuote } from "@/lib/pricing";
import { addDaysISO, todayISO, weekdayIndex, zonedTimeToUtc } from "@/lib/time";

const WINDOWS = [
  { start: 8, end: 13 },
  { start: 13, end: 18 },
] as const;

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createDataset(now = new Date()): Dataset {
  const today = todayISO(now);
  const slots: TimeSlot[] = [];
  for (let offset = -7; offset <= 21; offset += 1) {
    const date = addDaysISO(today, offset);
    if (weekdayIndex(date) === 0) continue;
    for (const cleaner of CLEANERS) {
      WINDOWS.forEach((window, index) => {
        slots.push({
          id: `sl-${date}-${cleaner.id}-w${index}`,
          cleanerId: cleaner.id,
          startsAt: zonedTimeToUtc(date, window.start).toISOString(),
          endsAt: zonedTimeToUtc(date, window.end).toISOString(),
          status: "open",
        });
      });
    }
  }

  const dataset: Dataset = {
    services: clone(SERVICES),
    addons: clone(ADDONS),
    areas: clone(AREAS),
    cleaners: clone(CLEANERS),
    customers: clone(CUSTOMERS),
    slots,
    bookings: [],
    kb: clone(KB_CHUNKS),
    logs: [],
  };

  BOOKING_BLUEPRINTS.forEach((plan, index) => {
    let date = addDaysISO(today, plan.day);
    let slot: TimeSlot | undefined;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (weekdayIndex(date) === 0) {
        date = addDaysISO(date, 1);
        continue;
      }
      const candidate = dataset.slots.find(
        (item) => item.id === `sl-${date}-${CLEANERS[plan.cleaner].id}-w${plan.window}`,
      );
      if (candidate && candidate.status === "open") {
        slot = candidate;
        break;
      }
      date = addDaysISO(date, 1);
    }
    if (!slot) return;
    const service = dataset.services.find((item) => item.slug === plan.service);
    const customer = dataset.customers[plan.customer];
    if (!service || !customer) return;
    const addons = dataset.addons.filter((item) => plan.addons.includes(item.slug));
    const quote = calculateQuote({
      service,
      addons,
      sqft: customer.sqft,
      bedrooms: customer.bedrooms,
      bathrooms: customer.bathrooms,
    });
    if (plan.status !== "cancelled") slot.status = "booked";
    const created = new Date(now);
    created.setUTCHours(created.getUTCHours() - (BOOKING_BLUEPRINTS.length - index) * 6);
    dataset.bookings.push({
      id: `bk-${2100 + index}`,
      customerId: customer.id,
      serviceSlug: service.slug,
      addonSlugs: addons.map((item) => item.slug),
      slotId: slot.id,
      status: plan.status,
      quoteCents: quote.totalCents,
      sqft: customer.sqft,
      bedrooms: customer.bedrooms,
      bathrooms: customer.bathrooms,
      postalCode: customer.postalCode,
      addressLine: customer.addressLine,
      notes: plan.notes,
      createdAt: created.toISOString(),
    });
  });

  return dataset;
}
