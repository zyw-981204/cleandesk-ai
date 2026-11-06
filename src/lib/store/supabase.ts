import "server-only";

import {
  applyCreate,
  applyReschedule,
  describeBooking,
  deskStats,
  findOpenSlots,
  listBookingDetails,
  makeQuote,
  proposeCreate,
  proposeReschedule,
} from "@/lib/booking";
import type {
  BookingStatus,
  ChatLog,
  Dataset,
} from "@/lib/domain";
import { rankChunks, type RankedChunk } from "@/lib/retrieval";
import { datasetToRows, rowsToDataset, vectorLiteral, type BookingRow, type CustomerRow, type KbRow, type SlotRow } from "@/lib/store/rows";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function assertOk<T>(label: string, error: { message: string } | null, data: T): T {
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function loadDataset(client: SupabaseClient): Promise<Dataset> {
  const [services, addons, areas, cleaners, customers, slots, bookings, kb] = await Promise.all([
    client.from("services").select("*").order("slug"),
    client.from("addons").select("*").order("slug"),
    client.from("service_areas").select("*").order("city"),
    client.from("cleaners").select("*").order("name"),
    client.from("customers").select("*").order("name"),
    client.from("time_slots").select("*"),
    client.from("bookings").select("*"),
    client.from("kb_chunks").select("id, source, title, content, embedding"),
  ]);
  return rowsToDataset({
    services: assertOk("services", services.error, services.data ?? []),
    addons: assertOk("addons", addons.error, addons.data ?? []),
    areas: assertOk("areas", areas.error, areas.data ?? []),
    cleaners: assertOk("cleaners", cleaners.error, cleaners.data ?? []),
    customers: assertOk("customers", customers.error, customers.data ?? []),
    slots: assertOk("slots", slots.error, slots.data ?? []),
    bookings: assertOk("bookings", bookings.error, bookings.data ?? []),
    kb: assertOk("kb", kb.error, kb.data ?? []),
  });
}

export function createSupabaseStore(url: string, serviceRoleKey: string) {
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    mode: "supabase" as const,
    client,
    async listServices() {
      return (await loadDataset(client)).services;
    },
    async listAddons() {
      return (await loadDataset(client)).addons;
    },
    async listAreas() {
      return (await loadDataset(client)).areas;
    },
    async listCleaners() {
      return (await loadDataset(client)).cleaners;
    },
    async listCustomers() {
      return (await loadDataset(client)).customers;
    },
    async listBookings(status?: BookingStatus) {
      return listBookingDetails(await loadDataset(client), status);
    },
    async getBooking(id: string) {
      const dataset = await loadDataset(client);
      const booking = dataset.bookings.find((item) => item.id === id);
      return booking ? describeBooking(dataset, booking) : null;
    },
    async stats(now = new Date()) {
      return deskStats(await loadDataset(client), now);
    },
    async searchKnowledge(query: string, embedding?: number[] | null): Promise<RankedChunk[]> {
      if (embedding && embedding.length > 0) {
        const match = await client.rpc("match_kb_chunks", {
          query_embedding: vectorLiteral(embedding),
          match_count: 4,
        });
        if (!match.error && Array.isArray(match.data) && match.data.length > 0) {
          return match.data.map((row: { id: string; source: string; title: string; content: string; similarity: number }) => ({
            score: row.similarity,
            chunk: {
              id: row.id,
              source: row.source,
              title: row.title,
              content: row.content,
              embedding: null,
            },
          }));
        }
      }
      const dataset = await loadDataset(client);
      return rankChunks(dataset.kb, query, null);
    },
    async listKb() {
      return (await loadDataset(client)).kb;
    },
    async quote(input: unknown) {
      return makeQuote(await loadDataset(client), input);
    },
    async openSlots(input: unknown, now = new Date()) {
      return findOpenSlots(await loadDataset(client), input, now);
    },
    async proposeCreate(input: unknown, now = new Date()) {
      return proposeCreate(await loadDataset(client), input, now);
    },
    async proposeReschedule(input: unknown, now = new Date()) {
      return proposeReschedule(await loadDataset(client), input, now);
    },
    async commitCreate(input: unknown, now = new Date()) {
      const dataset = await loadDataset(client);
      const result = applyCreate(dataset, input, now);
      if (!result.ok) return result;
      if (result.createdCustomer) {
        const row: CustomerRow = datasetToRows({ ...dataset, customers: [result.createdCustomer], slots: [], bookings: [], kb: [], logs: [], services: [], addons: [], areas: [], cleaners: [] }).customers[0];
        const inserted = await client.from("customers").insert(row);
        if (inserted.error) return { ok: false, error: inserted.error.message };
      }
      const slotUpdate = await client
        .from("time_slots")
        .update({ status: "booked" })
        .eq("id", result.booking.slotId)
        .eq("status", "open")
        .select("id")
        .maybeSingle();
      if (slotUpdate.error || !slotUpdate.data) {
        return { ok: false, error: "That window already has a booking." };
      }
      const bookingRow: BookingRow = {
        id: result.booking.id,
        customer_id: result.booking.customerId,
        service_slug: result.booking.serviceSlug,
        addon_slugs: result.booking.addonSlugs,
        slot_id: result.booking.slotId,
        status: result.booking.status,
        quote_cents: result.booking.quoteCents,
        sqft: result.booking.sqft,
        bedrooms: result.booking.bedrooms,
        bathrooms: result.booking.bathrooms,
        postal_code: result.booking.postalCode,
        address_line: result.booking.addressLine,
        notes: result.booking.notes,
        created_at: result.booking.createdAt,
      };
      const bookingInsert = await client.from("bookings").insert(bookingRow);
      if (bookingInsert.error) {
        await client.from("time_slots").update({ status: "open" }).eq("id", result.booking.slotId);
        return { ok: false, error: bookingInsert.error.message };
      }
      return result;
    },
    async commitReschedule(input: unknown, now = new Date()) {
      const dataset = await loadDataset(client);
      const result = applyReschedule(dataset, input, now);
      if (!result.ok) return result;
      const claimed = await client
        .from("time_slots")
        .update({ status: "booked" })
        .eq("id", result.booking.slotId)
        .eq("status", "open")
        .select("id")
        .maybeSingle();
      if (claimed.error || !claimed.data) {
        return { ok: false, error: "That window already has a booking." };
      }
      const bookingUpdate = await client
        .from("bookings")
        .update({ slot_id: result.booking.slotId, status: "rescheduled" })
        .eq("id", result.booking.id)
        .neq("status", "cancelled");
      if (bookingUpdate.error) {
        await client.from("time_slots").update({ status: "open" }).eq("id", result.booking.slotId);
        return { ok: false, error: bookingUpdate.error.message };
      }
      await client.from("time_slots").update({ status: "open" }).eq("id", result.previousSlotId);
      return result;
    },
    async logChat(entry: Omit<ChatLog, "id" | "createdAt">) {
      const inserted = await client.from("chat_logs").insert({
        session_id: entry.sessionId,
        tool_name: entry.toolName,
        args: entry.args,
        result: entry.result,
        status: entry.status,
      });
      if (inserted.error) throw new Error(inserted.error.message);
    },
    async listLogs(limit = 40): Promise<ChatLog[]> {
      const rows = await client
        .from("chat_logs")
        .select("id, session_id, tool_name, args, result, status, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      const data = assertOk("chat_logs", rows.error, rows.data ?? []);
      return data.map((row) => ({
        id: String(row.id),
        sessionId: row.session_id,
        toolName: row.tool_name,
        args: row.args,
        result: row.result,
        status: row.status,
        createdAt: row.created_at,
      }));
    },
    async saveEmbeddings(chunks: { id: string; embedding: number[] }[]) {
      for (const chunk of chunks) {
        const updated = await client
          .from("kb_chunks")
          .update({ embedding: vectorLiteral(chunk.embedding) })
          .eq("id", chunk.id);
        if (updated.error) throw new Error(updated.error.message);
      }
    },
  };
}

export type SupabaseStore = ReturnType<typeof createSupabaseStore>;

const clients = new Map<string, SupabaseStore>();

export function getSupabaseStore(url: string, serviceRoleKey: string): SupabaseStore {
  const cacheKey = `${url}:${serviceRoleKey.slice(0, 8)}`;
  const existing = clients.get(cacheKey);
  if (existing) return existing;
  const store = createSupabaseStore(url, serviceRoleKey);
  clients.set(cacheKey, store);
  return store;
}

export type { KbRow, SlotRow };
