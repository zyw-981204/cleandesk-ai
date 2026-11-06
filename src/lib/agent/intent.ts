import type { AddonSlug, ServiceSlug, TimeOfDay } from "@/lib/domain";
import { addDaysISO, todayISO, upcomingWeekday, weekdayIndex } from "@/lib/time";

const CITY_ZIPS: Record<string, string> = {
  "port meridian": "88012",
  cedarwharf: "88021",
  northglass: "88031",
  millhaven: "88041",
};

export type IntentName = "quote" | "availability" | "create" | "reschedule" | "faq";

export function detectIntent(text: string): IntentName {
  const normalized = text.toLowerCase();
  if (/\breschedul/.test(normalized) || /\bmove (my|the|this) booking\b/.test(normalized) || /\bchange (the|my) (time|booking|appointment)\b/.test(normalized)) {
    return "reschedule";
  }
  if (/\b(book|schedule|reserve)\b/.test(normalized) && !/\bpolicy\b/.test(normalized)) return "create";
  if (/\b(quote|how much|price|pricing|cost)\b/.test(normalized) && !/\b(policy|cancel)\b/.test(normalized)) {
    return "quote";
  }
  if (
    /\b(available|availability|openings?)\b/.test(normalized) ||
    /mornings? (are |is )?open/.test(normalized) ||
    /afternoons? (are |is )?open/.test(normalized) ||
    /\bwhat times\b/.test(normalized) ||
    /\bwhich (morning|afternoon|day)s?\b/.test(normalized)
  ) {
    return "availability";
  }
  return "faq";
}

export function findService(text: string): ServiceSlug | undefined {
  const normalized = text.toLowerCase();
  if (/\bdeep\b/.test(normalized)) return "deep";
  if (/move-?\s?in|move-?\s?out|\bmove\b/.test(normalized)) return "move";
  if (/\boffice\b|\bstudio\b/.test(normalized)) return "office";
  if (/\bstandard\b|\brefresh\b|\bregular\b|\bbasic\b/.test(normalized)) return "standard";
  return undefined;
}

export function findAddons(text: string): AddonSlug[] {
  const normalized = text.toLowerCase();
  const found: AddonSlug[] = [];
  if (/\boven\b/.test(normalized)) found.push("oven");
  if (/\bfridge\b|\brefrigerator\b/.test(normalized)) found.push("fridge");
  if (/\bwindows?\b/.test(normalized)) found.push("windows");
  if (/\bcarpets?\b|\brugs?\b/.test(normalized)) found.push("carpets");
  return found;
}

export function findSqft(text: string): number | undefined {
  const match = text.match(/(\d{1,3}(?:,\d{3})+|\d{3,5})\s*(?:sq\.?\s*ft|sqft|square feet)/i);
  if (!match) return undefined;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : undefined;
}

export function findCount(text: string, unit: "bed" | "bath"): number | undefined {
  const match = text.match(new RegExp(`(\\d+)\\s*-?\\s*${unit}`, "i"));
  return match ? Number(match[1]) : undefined;
}

export function findPostalCode(text: string): string | undefined {
  const zip = text.match(/\b(88\d{3})\b/);
  if (zip) return zip[1];
  const normalized = text.toLowerCase();
  for (const [city, code] of Object.entries(CITY_ZIPS)) {
    if (normalized.includes(city)) return code;
  }
  return undefined;
}

export function findAddress(text: string): string | undefined {
  const match = text.match(/\bat\s+(\d+[^,.\n]+)/i);
  if (!match) return undefined;
  const trimmed = match[1].replace(/\b(for|on|in|with|tomorrow|today|next)\b.*$/i, "").trim();
  return trimmed.length >= 4 ? trimmed : undefined;
}

export function findPersonName(text: string): string | undefined {
  const match = text.match(/\bfor\s+([a-z]+(?:\s+[a-z]+){1,2})\b/i);
  if (!match) return undefined;
  const banned = new Set(["at", "on", "in", "the", "a", "with", "and", "my", "our", "me"]);
  const parts = match[1].split(/\s+/);
  while (parts.length > 0 && banned.has(parts[parts.length - 1].toLowerCase())) parts.pop();
  if (parts.length < 2) return undefined;
  if (banned.has(parts[0].toLowerCase())) return undefined;
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ");
}

export function findBookingId(text: string): string | undefined {
  const match = text.match(/\bbk-\d+\b/i);
  return match ? match[0].toLowerCase() : undefined;
}

export function findTimeOfDay(text: string): TimeOfDay {
  const normalized = text.toLowerCase();
  if (/\bmornings?\b/.test(normalized)) return "morning";
  if (/\bafternoons?\b/.test(normalized)) return "afternoon";
  return "any";
}

export function findDateRange(
  text: string,
  now: Date,
): { date?: string; fromDate?: string; toDate?: string } {
  const normalized = text.toLowerCase();
  const today = todayISO(now);
  const explicit = normalized.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (explicit) return { date: explicit[1] };
  if (/\btomorrow\b/.test(normalized)) return { date: addDaysISO(today, 1) };
  if (/\btoday\b/.test(normalized)) return { date: today };
  const weekday = normalized.match(
    /\b(?:next|this)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
  );
  if (weekday) {
    const index = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(
      weekday[1],
    );
    return { date: upcomingWeekday(today, index) };
  }
  if (/\bnext week\b/.test(normalized)) {
    const monday = weekdayIndex(today) === 1 ? addDaysISO(today, 7) : upcomingWeekday(today, 1);
    return { fromDate: monday, toDate: addDaysISO(monday, 4) };
  }
  return {};
}
