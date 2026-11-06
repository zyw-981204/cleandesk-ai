import type {
  Addon,
  AddonSlug,
  Booking,
  BookingStatus,
  ChatLog,
  Cleaner,
  Customer,
  Dataset,
  KbChunk,
  Service,
  ServiceArea,
  ServiceSlug,
  TimeSlot,
} from "@/lib/domain";

export type ServiceRow = {
  slug: ServiceSlug;
  name: string;
  summary: string;
  includes: string[];
  base_cents: number;
  per_sqft_cents: number;
  per_bedroom_cents: number;
  per_bathroom_cents: number;
  duration_hours: number;
};

export type AddonRow = {
  slug: AddonSlug;
  name: string;
  summary: string;
  price_cents: number;
};

export type AreaRow = {
  id: string;
  city: string;
  region: string;
  postal_codes: string[];
  note: string;
};

export type CleanerRow = { id: string; name: string; focus: string };
export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address_line: string;
  city: string;
  postal_code: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
};

export type SlotRow = {
  id: string;
  cleaner_id: string;
  starts_at: string;
  ends_at: string;
  status: "open" | "booked";
};

export type BookingRow = {
  id: string;
  customer_id: string;
  service_slug: ServiceSlug;
  addon_slugs: AddonSlug[];
  slot_id: string;
  status: BookingStatus;
  quote_cents: number;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  postal_code: string;
  address_line: string;
  notes: string;
  created_at: string;
};

export type KbRow = {
  id: string;
  source: string;
  title: string;
  content: string;
  embedding: string | null;
};

export function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export function parseVector(value: unknown): number[] | null {
  if (Array.isArray(value) && value.every((item) => typeof item === "number")) return value;
  if (typeof value === "string" && value.startsWith("[")) {
    const numbers = value
      .slice(1, -1)
      .split(",")
      .filter(Boolean)
      .map((item) => Number(item.trim()));
    return numbers.every((item) => Number.isFinite(item)) ? numbers : null;
  }
  return null;
}

export function datasetToRows(dataset: Dataset) {
  return {
    services: dataset.services.map<ServiceRow>((service) => ({
      slug: service.slug,
      name: service.name,
      summary: service.summary,
      includes: service.includes,
      base_cents: service.baseCents,
      per_sqft_cents: service.perSqftCents,
      per_bedroom_cents: service.perBedroomCents,
      per_bathroom_cents: service.perBathroomCents,
      duration_hours: service.durationHours,
    })),
    addons: dataset.addons.map<AddonRow>((addon) => ({
      slug: addon.slug,
      name: addon.name,
      summary: addon.summary,
      price_cents: addon.priceCents,
    })),
    areas: dataset.areas.map<AreaRow>((area) => ({
      id: area.id,
      city: area.city,
      region: area.region,
      postal_codes: area.postalCodes,
      note: area.note,
    })),
    cleaners: dataset.cleaners.map<CleanerRow>((cleaner) => ({
      id: cleaner.id,
      name: cleaner.name,
      focus: cleaner.focus,
    })),
    customers: dataset.customers.map<CustomerRow>((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address_line: customer.addressLine,
      city: customer.city,
      postal_code: customer.postalCode,
      sqft: customer.sqft,
      bedrooms: customer.bedrooms,
      bathrooms: customer.bathrooms,
    })),
    slots: dataset.slots.map<SlotRow>((slot) => ({
      id: slot.id,
      cleaner_id: slot.cleanerId,
      starts_at: slot.startsAt,
      ends_at: slot.endsAt,
      status: slot.status,
    })),
    bookings: dataset.bookings.map<BookingRow>((booking) => ({
      id: booking.id,
      customer_id: booking.customerId,
      service_slug: booking.serviceSlug,
      addon_slugs: booking.addonSlugs,
      slot_id: booking.slotId,
      status: booking.status,
      quote_cents: booking.quoteCents,
      sqft: booking.sqft,
      bedrooms: booking.bedrooms,
      bathrooms: booking.bathrooms,
      postal_code: booking.postalCode,
      address_line: booking.addressLine,
      notes: booking.notes,
      created_at: booking.createdAt,
    })),
    kb: dataset.kb.map<KbRow>((chunk) => ({
      id: chunk.id,
      source: chunk.source,
      title: chunk.title,
      content: chunk.content,
      embedding: chunk.embedding ? vectorLiteral(chunk.embedding) : null,
    })),
  };
}

export function rowsToDataset(input: {
  services: ServiceRow[];
  addons: AddonRow[];
  areas: AreaRow[];
  cleaners: CleanerRow[];
  customers: CustomerRow[];
  slots: SlotRow[];
  bookings: BookingRow[];
  kb: Array<KbRow & { embedding: unknown }>;
  logs?: ChatLog[];
}): Dataset {
  const services: Service[] = input.services.map((row) => ({
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    includes: row.includes,
    baseCents: row.base_cents,
    perSqftCents: row.per_sqft_cents,
    perBedroomCents: row.per_bedroom_cents,
    perBathroomCents: row.per_bathroom_cents,
    durationHours: row.duration_hours,
  }));
  const addons: Addon[] = input.addons.map((row) => ({
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    priceCents: row.price_cents,
  }));
  const areas: ServiceArea[] = input.areas.map((row) => ({
    id: row.id,
    city: row.city,
    region: row.region,
    postalCodes: row.postal_codes,
    note: row.note,
  }));
  const cleaners: Cleaner[] = input.cleaners;
  const customers: Customer[] = input.customers.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    addressLine: row.address_line,
    city: row.city,
    postalCode: row.postal_code,
    sqft: row.sqft,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
  }));
  const slots: TimeSlot[] = input.slots.map((row) => ({
    id: row.id,
    cleanerId: row.cleaner_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
  }));
  const bookings: Booking[] = input.bookings.map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    serviceSlug: row.service_slug,
    addonSlugs: row.addon_slugs,
    slotId: row.slot_id,
    status: row.status,
    quoteCents: row.quote_cents,
    sqft: row.sqft,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    postalCode: row.postal_code,
    addressLine: row.address_line,
    notes: row.notes,
    createdAt: row.created_at,
  }));
  const kb: KbChunk[] = input.kb.map((row) => ({
    id: row.id,
    source: row.source,
    title: row.title,
    content: row.content,
    embedding: parseVector(row.embedding),
  }));
  return { services, addons, areas, cleaners, customers, slots, bookings, kb, logs: input.logs ?? [] };
}
