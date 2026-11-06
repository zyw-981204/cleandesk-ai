import type { Addon, QuoteLine, Service } from "@/lib/domain";

export type QuoteParts = {
  service: Pick<
    Service,
    "name" | "baseCents" | "perSqftCents" | "perBedroomCents" | "perBathroomCents"
  >;
  addons: Pick<Addon, "name" | "priceCents">[];
  sqft: number;
  bedrooms: number;
  bathrooms: number;
};

export type QuoteBreakdown = {
  lines: QuoteLine[];
  totalCents: number;
};

export function calculateQuote(input: QuoteParts): QuoteBreakdown {
  const sqft = Math.max(0, Math.round(input.sqft));
  const bedrooms = Math.max(0, Math.round(input.bedrooms));
  const bathrooms = Math.max(0, Math.round(input.bathrooms));
  const sqftCents = sqft * input.service.perSqftCents;
  const bedroomCents = bedrooms * input.service.perBedroomCents;
  const bathroomCents = bathrooms * input.service.perBathroomCents;
  const lines: QuoteLine[] = [
    { label: `${input.service.name} base`, cents: input.service.baseCents },
    { label: `${sqft.toLocaleString("en-US")} sq ft`, cents: sqftCents },
    { label: `${bedrooms} bedroom${bedrooms === 1 ? "" : "s"}`, cents: bedroomCents },
    { label: `${bathrooms} bathroom${bathrooms === 1 ? "" : "s"}`, cents: bathroomCents },
  ];
  for (const addon of input.addons) {
    lines.push({ label: addon.name, cents: addon.priceCents });
  }
  const totalCents = lines.reduce((sum, line) => sum + line.cents, 0);
  return { lines, totalCents };
}
