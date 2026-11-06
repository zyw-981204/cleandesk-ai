export const SERVICE_SLUGS = ["standard", "deep", "move", "office"] as const;
export const ADDON_SLUGS = ["oven", "fridge", "windows", "carpets"] as const;
export const BOOKING_STATUSES = ["confirmed", "rescheduled", "cancelled"] as const;

export type ServiceSlug = (typeof SERVICE_SLUGS)[number];
export type AddonSlug = (typeof ADDON_SLUGS)[number];
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type TimeOfDay = "morning" | "afternoon" | "any";

export type Service = {
  slug: ServiceSlug;
  name: string;
  summary: string;
  includes: string[];
  baseCents: number;
  perSqftCents: number;
  perBedroomCents: number;
  perBathroomCents: number;
  durationHours: number;
};

export type Addon = {
  slug: AddonSlug;
  name: string;
  summary: string;
  priceCents: number;
};

export type ServiceArea = {
  id: string;
  city: string;
  region: string;
  postalCodes: string[];
  note: string;
};

export type Cleaner = {
  id: string;
  name: string;
  focus: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
};

export type TimeSlot = {
  id: string;
  cleanerId: string;
  startsAt: string;
  endsAt: string;
  status: "open" | "booked";
};

export type Booking = {
  id: string;
  customerId: string;
  serviceSlug: ServiceSlug;
  addonSlugs: AddonSlug[];
  slotId: string;
  status: BookingStatus;
  quoteCents: number;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  postalCode: string;
  addressLine: string;
  notes: string;
  createdAt: string;
};

export type KbChunk = {
  id: string;
  source: string;
  title: string;
  content: string;
  embedding: number[] | null;
};

export type ChatLog = {
  id: string;
  sessionId: string;
  toolName: string;
  args: unknown;
  result: unknown;
  status: "executed" | "proposed" | "committed" | "error";
  createdAt: string;
};

export type Dataset = {
  services: Service[];
  addons: Addon[];
  areas: ServiceArea[];
  cleaners: Cleaner[];
  customers: Customer[];
  slots: TimeSlot[];
  bookings: Booking[];
  kb: KbChunk[];
  logs: ChatLog[];
};

export type QuoteLine = { label: string; cents: number };

export type QuoteOk = {
  ok: true;
  serviceSlug: ServiceSlug;
  serviceName: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  postalCode: string;
  areaName: string;
  addons: { slug: AddonSlug; name: string; cents: number }[];
  lines: QuoteLine[];
  totalCents: number;
};

export type SlotChoice = {
  id: string;
  startsAt: string;
  endsAt: string;
  cleanerId: string;
  cleanerName: string;
  label: string;
};

export type AvailabilityOk = {
  ok: true;
  postalCode: string;
  areaName: string;
  fromDate: string;
  toDate: string;
  timeOfDay: TimeOfDay;
  slots: SlotChoice[];
};

export type CreateBookingInput = {
  serviceSlug: ServiceSlug;
  addonSlugs: AddonSlug[];
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  postalCode: string;
  slotId: string;
  customerName: string;
  addressLine: string;
  notes?: string;
};

export type CreateProposal = {
  ok: true;
  kind: "create";
  input: CreateBookingInput;
  serviceName: string;
  addonNames: string[];
  areaName: string;
  slot: SlotChoice;
  lines: QuoteLine[];
  totalCents: number;
};

export type RescheduleInput = {
  bookingId: string;
  slotId: string;
};

export type RescheduleProposal = {
  ok: true;
  kind: "reschedule";
  bookingId: string;
  customerName: string;
  serviceName: string;
  addressLine: string;
  postalCode: string;
  fromSlot: SlotChoice;
  toSlot: SlotChoice;
  totalCents: number;
};

export type ToolFailure = { ok: false; error: string };

export type BookingDetail = {
  id: string;
  status: BookingStatus;
  serviceName: string;
  serviceSlug: ServiceSlug;
  addonNames: string[];
  addonSlugs: AddonSlug[];
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine: string;
  postalCode: string;
  city: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  quoteCents: number;
  notes: string;
  createdAt: string;
  slotId: string;
  startsAt: string;
  endsAt: string;
  cleanerName: string;
};

export type DeskStats = {
  upcoming: number;
  openSlots: number;
  confirmed: number;
  rescheduled: number;
  cancelled: number;
};
