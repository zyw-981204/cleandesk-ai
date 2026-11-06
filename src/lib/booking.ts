import type {
  AddonSlug,
  AvailabilityOk,
  Booking,
  BookingDetail,
  BookingStatus,
  CreateBookingInput,
  CreateProposal,
  Customer,
  Dataset,
  DeskStats,
  QuoteOk,
  RescheduleInput,
  RescheduleProposal,
  ServiceSlug,
  SlotChoice,
  TimeOfDay,
  ToolFailure,
} from "@/lib/domain";
import { guardAvailability, guardCreate, guardQuote, guardReschedule, type GuardContext } from "@/lib/guards";
import { calculateQuote } from "@/lib/pricing";
import { addDaysISO, formatWhen, localDateISO, localHour, todayISO } from "@/lib/time";

function areaName(dataset: Dataset, postalCode: string): string | undefined {
  return dataset.areas.find((area) => area.postalCodes.includes(postalCode))?.city;
}

function areaZips(dataset: Dataset): string[] {
  return dataset.areas.flatMap((area) => area.postalCodes);
}

function serviceHours(dataset: Dataset): Partial<Record<ServiceSlug, number>> {
  return Object.fromEntries(dataset.services.map((service) => [service.slug, service.durationHours]));
}

function activeSlotIds(dataset: Dataset): Set<string> {
  return new Set(
    dataset.bookings
      .filter((booking) => booking.status !== "cancelled")
      .map((booking) => booking.slotId),
  );
}

function context(dataset: Dataset, now: Date): GuardContext {
  return {
    now,
    areaZips: areaZips(dataset),
    slots: dataset.slots,
    serviceHours: serviceHours(dataset),
    activeSlotIds: activeSlotIds(dataset),
  };
}

function choice(dataset: Dataset, slotId: string): SlotChoice | undefined {
  const slot = dataset.slots.find((item) => item.id === slotId);
  if (!slot) return undefined;
  const cleaner = dataset.cleaners.find((item) => item.id === slot.cleanerId);
  return {
    id: slot.id,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    cleanerId: slot.cleanerId,
    cleanerName: cleaner?.name ?? "Crew",
    label: formatWhen(slot.startsAt),
  };
}

export function describeBooking(dataset: Dataset, booking: Booking): BookingDetail {
  const customer = dataset.customers.find((item) => item.id === booking.customerId);
  const service = dataset.services.find((item) => item.slug === booking.serviceSlug);
  const slot = dataset.slots.find((item) => item.id === booking.slotId);
  const cleaner = dataset.cleaners.find((item) => item.id === slot?.cleanerId);
  const city = dataset.areas.find((area) => area.postalCodes.includes(booking.postalCode))?.city ?? "";
  return {
    id: booking.id,
    status: booking.status,
    serviceName: service?.name ?? booking.serviceSlug,
    serviceSlug: booking.serviceSlug,
    addonNames: booking.addonSlugs.map(
      (slug) => dataset.addons.find((addon) => addon.slug === slug)?.name ?? slug,
    ),
    addonSlugs: booking.addonSlugs,
    customerId: booking.customerId,
    customerName: customer?.name ?? "Customer",
    customerEmail: customer?.email ?? "",
    customerPhone: customer?.phone ?? "",
    addressLine: booking.addressLine,
    postalCode: booking.postalCode,
    city,
    sqft: booking.sqft,
    bedrooms: booking.bedrooms,
    bathrooms: booking.bathrooms,
    quoteCents: booking.quoteCents,
    notes: booking.notes,
    createdAt: booking.createdAt,
    slotId: booking.slotId,
    startsAt: slot?.startsAt ?? "",
    endsAt: slot?.endsAt ?? "",
    cleanerName: cleaner?.name ?? "Crew",
  };
}

export function listBookingDetails(dataset: Dataset, status?: BookingStatus): BookingDetail[] {
  return dataset.bookings
    .filter((booking) => (status ? booking.status === status : true))
    .map((booking) => describeBooking(dataset, booking))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.startsAt.localeCompare(left.startsAt));
}

export function upcomingVisits(bookings: BookingDetail[], now = new Date(), limit = 4): BookingDetail[] {
  return bookings
    .filter((booking) => booking.status !== "cancelled" && new Date(booking.startsAt).getTime() > now.getTime())
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    .slice(0, limit);
}

export function deskStats(dataset: Dataset, now = new Date()): DeskStats {
  const details = listBookingDetails(dataset);
  return {
    upcoming: details.filter(
      (booking) => booking.status !== "cancelled" && new Date(booking.startsAt).getTime() > now.getTime(),
    ).length,
    openSlots: dataset.slots.filter(
      (slot) => slot.status === "open" && new Date(slot.startsAt).getTime() > now.getTime(),
    ).length,
    confirmed: details.filter((booking) => booking.status === "confirmed").length,
    rescheduled: details.filter((booking) => booking.status === "rescheduled").length,
    cancelled: details.filter((booking) => booking.status === "cancelled").length,
  };
}

export function makeQuote(dataset: Dataset, input: unknown): QuoteOk | ToolFailure {
  const guarded = guardQuote(input, areaZips(dataset));
  if (!guarded.ok) return guarded;
  const service = dataset.services.find((item) => item.slug === guarded.data.serviceSlug);
  if (!service) return { ok: false, error: "That service is not on the catalog." };
  const addons = guarded.data.addonSlugs.map((slug) => dataset.addons.find((item) => item.slug === slug));
  if (addons.some((addon) => !addon)) return { ok: false, error: "One of those add-ons is not on the catalog." };
  const picked = addons.filter((addon): addon is NonNullable<typeof addon> => Boolean(addon));
  const quote = calculateQuote({
    service,
    addons: picked,
    sqft: guarded.data.sqft,
    bedrooms: guarded.data.bedrooms,
    bathrooms: guarded.data.bathrooms,
  });
  return {
    ok: true,
    serviceSlug: service.slug,
    serviceName: service.name,
    sqft: guarded.data.sqft,
    bedrooms: guarded.data.bedrooms,
    bathrooms: guarded.data.bathrooms,
    postalCode: guarded.data.postalCode,
    areaName: areaName(dataset, guarded.data.postalCode) ?? "Harborlight",
    addons: picked.map((addon) => ({ slug: addon.slug, name: addon.name, cents: addon.priceCents })),
    lines: quote.lines,
    totalCents: quote.totalCents,
  };
}

export function findOpenSlots(
  dataset: Dataset,
  input: unknown,
  now = new Date(),
): AvailabilityOk | ToolFailure {
  const guarded = guardAvailability(input, { now, areaZips: areaZips(dataset) });
  if (!guarded.ok) return guarded;
  const today = todayISO(now);
  const fromDate = guarded.data.date ?? guarded.data.fromDate ?? today;
  const toDate = guarded.data.date ?? guarded.data.toDate ?? addDaysISO(fromDate, guarded.data.date ? 0 : 6);
  const timeOfDay: TimeOfDay = guarded.data.timeOfDay;
  const taken = activeSlotIds(dataset);
  const slots = dataset.slots
    .filter((slot) => {
      if (slot.status !== "open" || taken.has(slot.id)) return false;
      if (new Date(slot.startsAt).getTime() <= now.getTime()) return false;
      const date = localDateISO(slot.startsAt);
      if (date < fromDate || date > toDate) return false;
      const hour = localHour(slot.startsAt);
      if (timeOfDay === "morning" && hour >= 12) return false;
      if (timeOfDay === "afternoon" && hour < 12) return false;
      return true;
    })
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    .slice(0, 8)
    .map((slot) => choice(dataset, slot.id))
    .filter((slot): slot is SlotChoice => Boolean(slot));
  return {
    ok: true,
    postalCode: guarded.data.postalCode,
    areaName: areaName(dataset, guarded.data.postalCode) ?? "Harborlight",
    fromDate,
    toDate,
    timeOfDay,
    slots,
  };
}

export function proposeCreate(
  dataset: Dataset,
  input: unknown,
  now = new Date(),
): CreateProposal | ToolFailure {
  const guarded = guardCreate(input, context(dataset, now));
  if (!guarded.ok) return guarded;
  const quote = makeQuote(dataset, guarded.data);
  if (!quote.ok) return quote;
  const slot = choice(dataset, guarded.data.slotId);
  if (!slot) return { ok: false, error: "That arrival window does not exist." };
  const proposalInput: CreateBookingInput = {
    serviceSlug: guarded.data.serviceSlug,
    addonSlugs: guarded.data.addonSlugs,
    sqft: guarded.data.sqft,
    bedrooms: guarded.data.bedrooms,
    bathrooms: guarded.data.bathrooms,
    postalCode: guarded.data.postalCode,
    slotId: guarded.data.slotId,
    customerName: guarded.data.customerName,
    addressLine: guarded.data.addressLine,
    notes: guarded.data.notes,
  };
  return {
    ok: true,
    kind: "create",
    input: proposalInput,
    serviceName: quote.serviceName,
    addonNames: quote.addons.map((addon) => addon.name),
    areaName: quote.areaName,
    slot,
    lines: quote.lines,
    totalCents: quote.totalCents,
  };
}

export function proposeReschedule(
  dataset: Dataset,
  input: unknown,
  now = new Date(),
): RescheduleProposal | ToolFailure {
  const rough = typeof input === "object" && input ? (input as { bookingId?: string }) : {};
  const booking = dataset.bookings.find((item) => item.id === rough.bookingId);
  const guarded = guardReschedule(input, {
    ...context(dataset, now),
    bookingSlotId: booking?.slotId,
    bookingStatus: booking?.status,
    serviceSlug: booking?.serviceSlug,
  });
  if (!guarded.ok) return guarded;
  if (!booking) return { ok: false, error: "That booking was not found." };
  const fromSlot = choice(dataset, booking.slotId);
  const toSlot = choice(dataset, guarded.data.slotId);
  if (!fromSlot || !toSlot) return { ok: false, error: "That arrival window does not exist." };
  const detail = describeBooking(dataset, booking);
  return {
    ok: true,
    kind: "reschedule",
    bookingId: booking.id,
    customerName: detail.customerName,
    serviceName: detail.serviceName,
    addressLine: booking.addressLine,
    postalCode: booking.postalCode,
    fromSlot,
    toSlot,
    totalCents: booking.quoteCents,
  };
}

function nextBookingId(dataset: Dataset): string {
  const numbers = dataset.bookings.map((booking) => Number(booking.id.replace(/\D/g, "")) || 0);
  return `bk-${Math.max(3000, ...numbers) + 1}`;
}

function ensureCustomer(dataset: Dataset, input: CreateBookingInput): Customer {
  const found = dataset.customers.find(
    (customer) => customer.name.toLowerCase() === input.customerName.toLowerCase(),
  );
  if (found) return found;
  const city = areaName(dataset, input.postalCode) ?? "Harborlight";
  const created: Customer = {
    id: `cus-${dataset.customers.length + 1}`,
    name: input.customerName,
    email: `${input.customerName.toLowerCase().replace(/[^a-z]+/g, ".")}@bright-harbor.example`,
    phone: "(555) 010-0190",
    addressLine: input.addressLine,
    city,
    postalCode: input.postalCode,
    sqft: input.sqft,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
  };
  dataset.customers.push(created);
  return created;
}

export type CreateCommit =
  | { ok: true; booking: Booking; detail: BookingDetail; createdCustomer: Customer | null }
  | ToolFailure;

export function applyCreate(dataset: Dataset, input: unknown, now = new Date()): CreateCommit {
  const proposal = proposeCreate(dataset, input, now);
  if (!proposal.ok) return proposal;
  const existingIds = new Set(dataset.customers.map((customer) => customer.id));
  const customer = ensureCustomer(dataset, proposal.input);
  const slot = dataset.slots.find((item) => item.id === proposal.input.slotId);
  if (!slot || slot.status !== "open") {
    return { ok: false, error: "That window already has a booking." };
  }
  slot.status = "booked";
  const booking: Booking = {
    id: nextBookingId(dataset),
    customerId: customer.id,
    serviceSlug: proposal.input.serviceSlug,
    addonSlugs: proposal.input.addonSlugs,
    slotId: slot.id,
    status: "confirmed",
    quoteCents: proposal.totalCents,
    sqft: proposal.input.sqft,
    bedrooms: proposal.input.bedrooms,
    bathrooms: proposal.input.bathrooms,
    postalCode: proposal.input.postalCode,
    addressLine: proposal.input.addressLine,
    notes: proposal.input.notes ?? "",
    createdAt: now.toISOString(),
  };
  dataset.bookings.push(booking);
  return {
    ok: true,
    booking,
    detail: describeBooking(dataset, booking),
    createdCustomer: existingIds.has(customer.id) ? null : customer,
  };
}

export type RescheduleCommit =
  | { ok: true; booking: Booking; detail: BookingDetail; previousSlotId: string }
  | ToolFailure;

export function applyReschedule(dataset: Dataset, input: RescheduleInput | unknown, now = new Date()): RescheduleCommit {
  const proposal = proposeReschedule(dataset, input, now);
  if (!proposal.ok) return proposal;
  const booking = dataset.bookings.find((item) => item.id === proposal.bookingId);
  const next = dataset.slots.find((item) => item.id === proposal.toSlot.id);
  const previous = dataset.slots.find((item) => item.id === proposal.fromSlot.id);
  if (!booking || !next || next.status !== "open") {
    return { ok: false, error: "That window already has a booking." };
  }
  const previousSlotId = booking.slotId;
  next.status = "booked";
  booking.slotId = next.id;
  booking.status = "rescheduled";
  if (previous && !dataset.bookings.some((item) => item !== booking && item.status !== "cancelled" && item.slotId === previous.id)) {
    previous.status = "open";
  }
  return { ok: true, booking, detail: describeBooking(dataset, booking), previousSlotId };
}

export function newestActiveBooking(dataset: Dataset): BookingDetail | undefined {
  return listBookingDetails(dataset).find((booking) => booking.status !== "cancelled");
}

export function addonSlugs(values: string[]): AddonSlug[] {
  return values.filter((value): value is AddonSlug =>
    value === "oven" || value === "fridge" || value === "windows" || value === "carpets",
  );
}
