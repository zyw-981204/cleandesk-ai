import assert from "node:assert/strict";
import test from "node:test";
import { ADDONS, SERVICES } from "../src/lib/catalog";
import { calculateQuote } from "../src/lib/pricing";

test("deep clean quote matches the catalog formula", () => {
  const service = SERVICES.find((item) => item.slug === "deep");
  const oven = ADDONS.find((item) => item.slug === "oven");
  assert.ok(service && oven);
  const quote = calculateQuote({
    service,
    addons: [oven],
    sqft: 1100,
    bedrooms: 2,
    bathrooms: 2,
  });
  assert.equal(quote.totalCents, 50400);
  assert.deepEqual(
    quote.lines.map((line) => line.cents),
    [14900, 17600, 6000, 7000, 4900],
  );
});

test("office quotes ignore bedrooms and still charge restrooms", () => {
  const service = SERVICES.find((item) => item.slug === "office");
  assert.ok(service);
  const quote = calculateQuote({
    service,
    addons: [],
    sqft: 1800,
    bedrooms: 0,
    bathrooms: 2,
  });
  assert.equal(quote.totalCents, 12900 + 1800 * 12 + 3000 * 2);
});

test("negative sizes are treated as zero before the base price", () => {
  const service = SERVICES.find((item) => item.slug === "standard");
  assert.ok(service);
  const quote = calculateQuote({
    service,
    addons: [],
    sqft: -10,
    bedrooms: -1,
    bathrooms: -1,
  });
  assert.equal(quote.totalCents, service.baseCents);
});
