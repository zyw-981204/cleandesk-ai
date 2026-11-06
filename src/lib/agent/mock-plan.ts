import type {
  AvailabilityOk,
  BookingDetail,
  CreateProposal,
  Customer,
  KbChunk,
  QuoteOk,
  RescheduleProposal,
  TimeOfDay,
  ToolFailure,
} from "@/lib/domain";
import {
  detectIntent,
  findAddons,
  findAddress,
  findBookingId,
  findCount,
  findDateRange,
  findPersonName,
  findPostalCode,
  findService,
  findSqft,
  findTimeOfDay,
} from "@/lib/agent/intent";
import { formatCents } from "@/lib/money";
import type { RankedChunk } from "@/lib/retrieval";
import { addDaysISO, localDateISO, localHour } from "@/lib/time";

export type AgentStore = {
  listCustomers(): Promise<Customer[]>;
  listBookings(): Promise<BookingDetail[]>;
  listKb(): Promise<KbChunk[]>;
  searchKnowledge(query: string, embedding?: number[] | null): Promise<RankedChunk[]>;
  quote(input: unknown): Promise<QuoteOk | ToolFailure>;
  openSlots(input: unknown, now?: Date): Promise<AvailabilityOk | ToolFailure>;
  proposeCreate(input: unknown, now?: Date): Promise<CreateProposal | ToolFailure>;
  proposeReschedule(input: unknown, now?: Date): Promise<RescheduleProposal | ToolFailure>;
};

type Part = { type: string; text?: string; output?: unknown; input?: unknown };
export type LooseMessage = { role: string; parts?: Part[] };

export type PlannedTool = {
  name: "get_quote" | "check_availability" | "create_booking" | "reschedule_booking";
  input: unknown;
  output: unknown;
  status: "executed" | "proposed" | "error";
};

export type MockPlan = {
  text: string;
  sources: { id: string; title: string; source: string }[];
  tools: PlannedTool[];
};

type Draft = {
  serviceSlug?: QuoteOk["serviceSlug"];
  sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  postalCode?: string;
  addonSlugs: QuoteOk["addons"][number]["slug"][];
  slots: AvailabilityOk["slots"];
  customerName?: string;
  addressLine?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isQuote(value: unknown): value is QuoteOk {
  return isRecord(value) && value.ok === true && typeof value.totalCents === "number" && typeof value.serviceSlug === "string";
}

function isAvailability(value: unknown): value is AvailabilityOk {
  return isRecord(value) && value.ok === true && Array.isArray(value.slots);
}

function statusFor(name: PlannedTool["name"], output: unknown): PlannedTool["status"] {
  const ok = isRecord(output) && output.ok === true;
  if (!ok) return "error";
  return name === "create_booking" || name === "reschedule_booking" ? "proposed" : "executed";
}

function tool(name: PlannedTool["name"], input: unknown, output: unknown): PlannedTool {
  return { name, input, output, status: statusFor(name, output) };
}

async function cite(store: AgentStore, query: string, preferred: string[]): Promise<MockPlan["sources"]> {
  const [hits, kb] = await Promise.all([store.searchKnowledge(query), store.listKb()]);
  const chunks = hits.map((hit) => hit.chunk);
  for (const source of preferred) {
    if (chunks.some((chunk) => chunk.source === source)) continue;
    const extra = kb.find((chunk) => chunk.source === source);
    if (extra) chunks.unshift(extra);
  }
  return chunks.slice(0, 3).map((chunk) => ({ id: chunk.id, title: chunk.title, source: chunk.source }));
}

function readDraft(messages: LooseMessage[]): Draft {
  const draft: Draft = { addonSlugs: [], slots: [] };
  for (const message of messages) {
    const text = (message.parts ?? [])
      .filter((part) => part.type === "text" && part.text)
      .map((part) => part.text)
      .join(" ");
    if (message.role === "user" && text) {
      const service = findService(text);
      const sqft = findSqft(text);
      const bedrooms = findCount(text, "bed");
      const bathrooms = findCount(text, "bath");
      const postalCode = findPostalCode(text);
      const addons = findAddons(text);
      const name = findPersonName(text);
      const address = findAddress(text);
      if (service) draft.serviceSlug = service;
      if (sqft) draft.sqft = sqft;
      if (bedrooms !== undefined) draft.bedrooms = bedrooms;
      if (bathrooms !== undefined) draft.bathrooms = bathrooms;
      if (postalCode) draft.postalCode = postalCode;
      if (addons.length > 0) draft.addonSlugs = addons;
      if (name) draft.customerName = name;
      if (address) draft.addressLine = address;
    }
    for (const part of message.parts ?? []) {
      if (!part.type.startsWith("tool-") || !part.output) continue;
      if (isQuote(part.output)) {
        draft.serviceSlug = part.output.serviceSlug;
        draft.sqft = part.output.sqft;
        draft.bedrooms = part.output.bedrooms;
        draft.bathrooms = part.output.bathrooms;
        draft.postalCode = part.output.postalCode;
        draft.addonSlugs = part.output.addons.map((addon) => addon.slug);
      }
      if (isAvailability(part.output)) {
        draft.slots = part.output.slots;
        draft.postalCode = part.output.postalCode;
      }
    }
  }
  return draft;
}

function lastUserText(messages: LooseMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role !== "user") continue;
    const text = (messages[index].parts ?? [])
      .filter((part) => part.type === "text" && part.text)
      .map((part) => part.text ?? "")
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "";
}

function pickSlot(slots: AvailabilityOk["slots"], timeOfDay: TimeOfDay, after?: string) {
  return slots
    .filter((slot) => (after ? slot.startsAt > after : true))
    .filter((slot) => {
      const hour = localHour(slot.startsAt);
      if (timeOfDay === "morning") return hour < 12;
      if (timeOfDay === "afternoon") return hour >= 12;
      return true;
    })
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0];
}

export async function planMockTurn(messages: LooseMessage[], store: AgentStore, now = new Date()): Promise<MockPlan> {
  const text = lastUserText(messages);
  const intent = detectIntent(text || "hello");
  const draft = readDraft(messages);
  if (intent === "quote") return planQuote(text, draft, store);
  if (intent === "availability") return planAvailability(text, draft, store, now);
  if (intent === "create") return planCreate(text, draft, store, now);
  if (intent === "reschedule") return planReschedule(text, draft, store, now);
  return planFaq(text, store);
}

async function planFaq(text: string, store: AgentStore): Promise<MockPlan> {
  const hits = await store.searchKnowledge(text);
  const top = hits[0]?.chunk;
  const second = hits[1] && hits[1].score > hits[0].score * 0.72 ? hits[1].chunk : undefined;
  const body = top
    ? `Here's what BrightHarbor has on file.\n\n${top.content}${second ? `\n\n${second.content}` : ""}`
    : "I don't have a note on that yet. I can quote a visit, check open windows, or prepare a booking for you to confirm.";
  return {
    text: body,
    sources: hits.slice(0, 3).map((hit) => ({ id: hit.chunk.id, title: hit.chunk.title, source: hit.chunk.source })),
    tools: [],
  };
}

async function planQuote(text: string, draft: Draft, store: AgentStore): Promise<MockPlan> {
  const sources = await cite(store, text, ["pricing-guide"]);
  const missing: string[] = [];
  if (!draft.serviceSlug) missing.push("which service (standard, deep, move-in/out, or office)");
  if (!draft.sqft) missing.push("the square footage");
  if (draft.bedrooms === undefined) missing.push("how many bedrooms");
  if (draft.bathrooms === undefined) missing.push("how many bathrooms");
  if (!draft.postalCode) missing.push("a Harborlight postal code");
  if (missing.length > 0) {
    return {
      text: `I can price that once I know ${missing.join(", ")}.`,
      sources,
      tools: [],
    };
  }
  const input = {
    serviceSlug: draft.serviceSlug,
    sqft: draft.sqft,
    bedrooms: draft.bedrooms,
    bathrooms: draft.bathrooms,
    postalCode: draft.postalCode,
    addonSlugs: draft.addonSlugs,
  };
  const output = await store.quote(input);
  if (!output.ok) return { text: output.error, sources, tools: [tool("get_quote", input, output)] };
  const addons = output.addons.length > 0 ? output.addons.map((addon) => addon.name).join(", ") : "no add-ons";
  return {
    text: `${output.serviceName} for ${output.bedrooms} bedroom${output.bedrooms === 1 ? "" : "s"}, ${output.bathrooms} bathroom${output.bathrooms === 1 ? "" : "s"}, ${output.sqft.toLocaleString("en-US")} sq ft in ${output.areaName} (${output.postalCode}) is ${formatCents(output.totalCents)}. That includes ${addons}. The card lists each line. Nothing is booked yet.`,
    sources,
    tools: [tool("get_quote", input, output)],
  };
}

async function planAvailability(text: string, draft: Draft, store: AgentStore, now: Date): Promise<MockPlan> {
  const sources = await cite(store, text, ["scheduling", "service-areas"]);
  const postalCode = findPostalCode(text) ?? draft.postalCode;
  if (!postalCode) {
    return {
      text: "Which town or postal code should I check? BrightHarbor covers Port Meridian, Cedarwharf, Northglass, and Millhaven.",
      sources,
      tools: [],
    };
  }
  const range = findDateRange(text, now);
  const input = {
    postalCode,
    ...range,
    timeOfDay: findTimeOfDay(text),
  };
  const output = await store.openSlots(input, now);
  if (!output.ok) return { text: output.error, sources, tools: [tool("check_availability", input, output)] };
  const when = output.fromDate === output.toDate ? output.fromDate : `${output.fromDate} through ${output.toDate}`;
  const summary = output.slots.length
    ? `I found ${output.slots.length} open ${output.timeOfDay === "any" ? "" : `${output.timeOfDay} `}window${output.slots.length === 1 ? "" : "s"} in ${output.areaName} for ${when}. The soonest is ${output.slots[0].label} with ${output.slots[0].cleanerName}. Tell me which one to book, or say "book the first morning."`
    : `I don't see an open window in ${output.areaName} for ${when}. Try another day, or ask for the following week.`;
  return { text: summary, sources, tools: [tool("check_availability", input, output)] };
}

async function planCreate(text: string, draft: Draft, store: AgentStore, now: Date): Promise<MockPlan> {
  const sources = await cite(store, text, ["scheduling"]);
  const customers = await store.listCustomers();
  const named = draft.customerName ? customers.find((customer) => customer.name.toLowerCase() === draft.customerName?.toLowerCase()) : undefined;
  const serviceSlug = draft.serviceSlug ?? (named ? undefined : undefined);
  const postalCode = draft.postalCode ?? named?.postalCode;
  const sqft = draft.sqft ?? named?.sqft;
  const bedrooms = draft.bedrooms ?? named?.bedrooms;
  const bathrooms = draft.bathrooms ?? named?.bathrooms;
  const addressLine = draft.addressLine ?? named?.addressLine;
  const customerName = draft.customerName ?? named?.name;
  const missing: string[] = [];
  if (!serviceSlug) missing.push("the service");
  if (!sqft || bedrooms === undefined || bathrooms === undefined) missing.push("the home size");
  if (!postalCode) missing.push("the postal code");
  if (!customerName) missing.push("the customer name");
  if (!addressLine) missing.push("the street address");
  if (missing.length > 0) {
    return { text: `I can prepare the booking card once I have ${missing.join(", ")}.`, sources, tools: [] };
  }
  const tools: PlannedTool[] = [];
  let slots = draft.slots;
  const timeOfDay = findTimeOfDay(text);
  let chosen = pickSlot(slots, timeOfDay === "any" ? "morning" : timeOfDay);
  if (!chosen) {
    const range = findDateRange(text, now);
    const fromDate = range.fromDate ?? range.date ?? addDaysISO(localDateISO(now.toISOString()), 1);
    const input = {
      postalCode,
      fromDate,
      toDate: range.toDate ?? range.date ?? addDaysISO(fromDate, 6),
      timeOfDay: timeOfDay === "any" ? "morning" : timeOfDay,
    };
    const output = await store.openSlots(input, now);
    tools.push(tool("check_availability", input, output));
    if (!output.ok) return { text: output.error, sources, tools };
    slots = output.slots;
    chosen = pickSlot(slots, input.timeOfDay);
  }
  if (!chosen) {
    return {
      text: "I checked the open windows and none match that request. Ask for another morning or afternoon.",
      sources,
      tools,
    };
  }
  const input = {
    serviceSlug,
    addonSlugs: draft.addonSlugs,
    sqft,
    bedrooms,
    bathrooms,
    postalCode,
    slotId: chosen.id,
    customerName,
    addressLine,
  };
  const output = await store.proposeCreate(input, now);
  tools.push(tool("create_booking", input, output));
  if (!output.ok) return { text: output.error, sources, tools };
  return {
    text: `I prepared a ${output.serviceName} for ${output.input.customerName} at ${output.input.addressLine}, ${output.areaName}. Arrival would be ${output.slot.label} with ${output.slot.cleanerName}, quoted at ${formatCents(output.totalCents)}. Nothing is saved until you press Confirm.`,
    sources,
    tools,
  };
}

async function planReschedule(text: string, _draft: Draft, store: AgentStore, now: Date): Promise<MockPlan> {
  const sources = await cite(store, text, ["cancellation-policy", "scheduling"]);
  const bookings = await store.listBookings();
  const requested = findBookingId(text);
  const booking = requested
    ? bookings.find((item) => item.id === requested)
    : bookings.find((item) => item.status !== "cancelled");
  if (!booking) {
    return { text: "I couldn't find an active booking to move. Check the bookings list for an id like bk-2106.", sources, tools: [] };
  }
  const timeOfDay = findTimeOfDay(text) === "any" ? "afternoon" : findTimeOfDay(text);
  const startDate = localDateISO(booking.startsAt);
  const inputSearch = {
    postalCode: booking.postalCode,
    fromDate: startDate,
    toDate: addDaysISO(startDate, 10),
    timeOfDay,
  };
  const availability = await store.openSlots(inputSearch, now);
  const tools: PlannedTool[] = [tool("check_availability", inputSearch, availability)];
  if (!availability.ok) return { text: availability.error, sources, tools };
  const chosen = pickSlot(availability.slots, timeOfDay, booking.startsAt);
  if (!chosen) {
    return {
      text: `I don't see a later ${timeOfDay} window near ${booking.id}. Try another week.`,
      sources,
      tools,
    };
  }
  const input = { bookingId: booking.id, slotId: chosen.id };
  const output = await store.proposeReschedule(input, now);
  tools.push(tool("reschedule_booking", input, output));
  if (!output.ok) return { text: output.error, sources, tools };
  return {
    text: `I can move ${output.bookingId} for ${output.customerName} from ${output.fromSlot.label} to ${output.toSlot.label} (${output.toSlot.cleanerName}). Press Confirm on the card to save the change. Until then the original window stays on the books.`,
    sources,
    tools,
  };
}
