import { ADDON_SLUGS, SERVICE_SLUGS, type AddonSlug, type ServiceSlug } from "@/lib/domain";
import { localDateISO, todayISO } from "@/lib/time";
import { z } from "zod";

const serviceSlugSchema = z.enum(SERVICE_SLUGS);
const addonSlugSchema = z.enum(ADDON_SLUGS);

const postalSchema = z
  .string()
  .regex(/^\d{5}$/, { error: "Enter a 5-digit postal code." });

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Use a YYYY-MM-DD date." });

export const quoteInputSchema = z.object({
  serviceSlug: serviceSlugSchema,
  sqft: z.number().int().min(200).max(20000),
  bedrooms: z.number().int().min(0).max(12),
  bathrooms: z.number().int().min(0).max(12),
  addonSlugs: z.array(addonSlugSchema).optional(),
  postalCode: postalSchema,
});

export function availabilityInputSchema(now = new Date()) {
  const today = todayISO(now);
  return z
    .object({
      postalCode: postalSchema,
      date: dateSchema.optional(),
      fromDate: dateSchema.optional(),
      toDate: dateSchema.optional(),
      timeOfDay: z.enum(["morning", "afternoon", "any"]).optional(),
    })
    .superRefine((value, ctx) => {
      for (const key of ["date", "fromDate", "toDate"] as const) {
        const date = value[key];
        if (date && date < today) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Date cannot be in the past.",
          });
        }
      }
    });
}

export const createBookingInputSchema = z.object({
  serviceSlug: serviceSlugSchema,
  addonSlugs: z.array(addonSlugSchema).optional(),
  sqft: z.number().int().min(200).max(20000),
  bedrooms: z.number().int().min(0).max(12),
  bathrooms: z.number().int().min(0).max(12),
  postalCode: postalSchema,
  slotId: z.string().min(3),
  customerName: z.string().trim().min(2).max(80),
  addressLine: z.string().trim().min(4).max(120),
  notes: z.string().trim().max(500).optional(),
});

export const rescheduleInputSchema = z.object({
  bookingId: z.string().min(3),
  slotId: z.string().min(3),
});

export type GuardContext = {
  now: Date;
  areaZips: string[];
  slots: { id: string; startsAt: string; endsAt: string; status: "open" | "booked" }[];
  serviceHours: Partial<Record<ServiceSlug, number>>;
  activeSlotIds: Set<string>;
};

function issues(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(" ");
}

export function guardQuote(
  input: unknown,
  areaZips: string[],
): { ok: true; data: z.infer<typeof quoteInputSchema> & { addonSlugs: AddonSlug[] } } | { ok: false; error: string } {
  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: issues(parsed.error) };
  if (!areaZips.includes(parsed.data.postalCode)) {
    return { ok: false, error: "That postal code is outside the service area." };
  }
  return { ok: true, data: { ...parsed.data, addonSlugs: parsed.data.addonSlugs ?? [] } };
}

export function guardAvailability(
  input: unknown,
  ctx: Pick<GuardContext, "now" | "areaZips">,
):
  | {
      ok: true;
      data: {
        postalCode: string;
        date?: string;
        fromDate?: string;
        toDate?: string;
        timeOfDay: "morning" | "afternoon" | "any";
      };
    }
  | { ok: false; error: string } {
  const parsed = availabilityInputSchema(ctx.now).safeParse(input);
  if (!parsed.success) return { ok: false, error: issues(parsed.error) };
  if (!ctx.areaZips.includes(parsed.data.postalCode)) {
    return { ok: false, error: "That postal code is outside the service area." };
  }
  return { ok: true, data: { ...parsed.data, timeOfDay: parsed.data.timeOfDay ?? "any" } };
}

function slotHours(startsAt: string, endsAt: string): number {
  return (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 3_600_000;
}

export function guardCreate(
  input: unknown,
  ctx: GuardContext,
): { ok: true; data: z.infer<typeof createBookingInputSchema> & { addonSlugs: AddonSlug[] } } | { ok: false; error: string } {
  const parsed = createBookingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: issues(parsed.error) };
  const data = { ...parsed.data, addonSlugs: parsed.data.addonSlugs ?? [] };
  if (!ctx.areaZips.includes(data.postalCode)) {
    return { ok: false, error: "That postal code is outside the service area." };
  }
  const slot = ctx.slots.find((item) => item.id === data.slotId);
  if (!slot) return { ok: false, error: "That arrival window does not exist." };
  if (new Date(slot.startsAt).getTime() <= ctx.now.getTime()) {
    return { ok: false, error: "Date cannot be in the past." };
  }
  if (localDateISO(slot.startsAt) < todayISO(ctx.now)) {
    return { ok: false, error: "Date cannot be in the past." };
  }
  if (slot.status !== "open" || ctx.activeSlotIds.has(slot.id)) {
    return { ok: false, error: "That window already has a booking." };
  }
  const needed = ctx.serviceHours[data.serviceSlug] ?? 0;
  if (slotHours(slot.startsAt, slot.endsAt) + 0.01 < needed) {
    return { ok: false, error: "That window is too short for the selected service." };
  }
  return { ok: true, data };
}

export function guardReschedule(
  input: unknown,
  ctx: GuardContext & { bookingSlotId?: string; bookingStatus?: string; serviceSlug?: ServiceSlug },
): { ok: true; data: z.infer<typeof rescheduleInputSchema> } | { ok: false; error: string } {
  const parsed = rescheduleInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: issues(parsed.error) };
  if (!ctx.bookingStatus) return { ok: false, error: "That booking was not found." };
  if (ctx.bookingStatus === "cancelled") {
    return { ok: false, error: "Cancelled bookings cannot be rescheduled." };
  }
  if (parsed.data.slotId === ctx.bookingSlotId) {
    return { ok: false, error: "Pick a different window than the one already booked." };
  }
  const slot = ctx.slots.find((item) => item.id === parsed.data.slotId);
  if (!slot) return { ok: false, error: "That arrival window does not exist." };
  if (new Date(slot.startsAt).getTime() <= ctx.now.getTime()) {
    return { ok: false, error: "Date cannot be in the past." };
  }
  if (slot.status !== "open" || ctx.activeSlotIds.has(slot.id)) {
    return { ok: false, error: "That window already has a booking." };
  }
  const needed = ctx.serviceHours[ctx.serviceSlug ?? "standard"] ?? 0;
  if (slotHours(slot.startsAt, slot.endsAt) + 0.01 < needed) {
    return { ok: false, error: "That window is too short for the selected service." };
  }
  return { ok: true, data: parsed.data };
}

export function zodIssueMessages(error: z.ZodError): string[] {
  return error.issues.map((issue) => issue.message);
}
