import assert from "node:assert/strict";
import test from "node:test";
import { planMockTurn, type LooseMessage } from "../src/lib/agent/mock-plan";
import { createDataset } from "../src/lib/dataset";
import { createMemoryStore } from "../src/lib/store/memory";
import { localHour } from "../src/lib/time";

const now = new Date("2026-11-06T18:00:00.000Z");

function user(text: string): LooseMessage {
  return { role: "user", parts: [{ type: "text", text }] };
}

function assistant(plan: Awaited<ReturnType<typeof planMockTurn>>): LooseMessage {
  return {
    role: "assistant",
    parts: [
      { type: "text", text: plan.text },
      ...plan.tools.map((call) => ({
        type: `tool-${call.name}`,
        input: call.input,
        output: call.output,
      })),
    ],
  };
}

test("mock planner quotes, checks mornings, and only proposes a booking", async () => {
  const store = createMemoryStore(createDataset(now));
  const quote = await planMockTurn(
    [user("Quote a deep clean, 2 bed, 2 bath, 1,100 sq ft in 88012, with oven")],
    store,
    now,
  );
  assert.equal(quote.tools[0]?.name, "get_quote");
  assert.equal(quote.tools[0]?.status, "executed");
  assert.equal((quote.tools[0]?.output as { totalCents: number }).totalCents, 50400);
  assert.ok(quote.sources.some((source) => source.source === "pricing-guide"));

  const availability = await planMockTurn(
    [user("Quote a deep clean, 2 bed, 2 bath, 1,100 sq ft in 88012, with oven"), assistant(quote), user("Which mornings are open next week in Port Meridian?")],
    store,
    now,
  );
  assert.equal(availability.tools[0]?.name, "check_availability");
  const slots = (availability.tools[0]?.output as { slots: { id: string; startsAt: string }[] }).slots;
  assert.ok(slots.length > 0);
  assert.ok(slots.every((slot) => slot.startsAt > now.toISOString()));
  assert.ok(slots.every((slot) => localHour(slot.startsAt) < 12));

  const before = (await store.listBookings()).length;
  const booking = await planMockTurn(
    [
      user("Quote a deep clean, 2 bed, 2 bath, 1,100 sq ft in 88012, with oven"),
      assistant(quote),
      user("Which mornings are open next week in Port Meridian?"),
      assistant(availability),
      user("Book the first open morning for Quinn Hale at 18 Lantern Row"),
    ],
    store,
    now,
  );
  const proposal = booking.tools.find((call) => call.name === "create_booking");
  assert.ok(proposal);
  assert.equal(proposal.status, "proposed");
  assert.equal((await store.listBookings()).length, before, "proposing a booking must not write");

  const committed = await store.commitCreate((proposal.output as { input: unknown }).input, now);
  assert.equal(committed.ok, true);
  if (!committed.ok) return;
  assert.equal(committed.detail.serviceSlug, "deep");
  assert.equal(committed.detail.customerName, "Quinn Hale");
  assert.equal(committed.detail.quoteCents, 50400);

  const moved = await planMockTurn(
    [user("Reschedule the newest booking to the following afternoon")],
    store,
    now,
  );
  const reschedule = moved.tools.find((call) => call.name === "reschedule_booking");
  assert.ok(reschedule);
  assert.equal(reschedule.status, "proposed");
  const saved = await store.commitReschedule(reschedule.input, now);
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.detail.id, committed.detail.id);
  assert.equal(saved.detail.status, "rescheduled");
  assert.notEqual(saved.detail.slotId, committed.detail.slotId);
});

test("policy questions cite the cancellation note and do not book", async () => {
  const store = createMemoryStore(createDataset(now));
  const plan = await planMockTurn([user("What is your cancellation policy?")], store, now);
  assert.equal(plan.tools.length, 0);
  assert.equal(plan.sources[0]?.source, "cancellation-policy");
  assert.match(plan.text, /24 hours/i);
});
