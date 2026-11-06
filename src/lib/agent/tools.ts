import { availabilityInputSchema, createBookingInputSchema, quoteInputSchema, rescheduleInputSchema } from "@/lib/guards";
import type { DataStore } from "@/lib/store";
import { tool } from "ai";

export function buildAgentTools(store: DataStore, sessionId: string, now = new Date()) {
  const log = async (toolName: string, args: unknown, result: unknown, status: "executed" | "proposed" | "error") => {
    await store.logChat({ sessionId, toolName, args, result, status });
  };

  return {
    get_quote: tool({
      description:
        "Price a BrightHarbor visit from the catalog formula. Does not create a booking. Use service slugs standard, deep, move, or office.",
      inputSchema: quoteInputSchema,
      execute: async (input) => {
        const result = await store.quote(input);
        await log("get_quote", input, result, result.ok ? "executed" : "error");
        return result;
      },
    }),
    check_availability: tool({
      description:
        "List open arrival windows in a service-area postal code. Optional date or fromDate/toDate as YYYY-MM-DD, and timeOfDay morning, afternoon, or any. Does not book.",
      inputSchema: availabilityInputSchema(now),
      execute: async (input) => {
        const result = await store.openSlots(input, now);
        await log("check_availability", input, result, result.ok ? "executed" : "error");
        return result;
      },
    }),
    create_booking: tool({
      description:
        "Prepare a booking confirmation card from a slotId returned by check_availability. This does not save the booking. The guest must press Confirm in the chat.",
      inputSchema: createBookingInputSchema,
      execute: async (input) => {
        const result = await store.proposeCreate(input, now);
        await log("create_booking", input, result, result.ok ? "proposed" : "error");
        return result;
      },
    }),
    reschedule_booking: tool({
      description:
        "Prepare a reschedule card for an existing booking id and a new open slotId. This does not change the booking until the guest presses Confirm.",
      inputSchema: rescheduleInputSchema,
      execute: async (input) => {
        const result = await store.proposeReschedule(input, now);
        await log("reschedule_booking", input, result, result.ok ? "proposed" : "error");
        return result;
      },
    }),
  };
}
