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
import { createDataset } from "@/lib/dataset";
import type {
  Addon,
  BookingDetail,
  BookingStatus,
  ChatLog,
  Cleaner,
  Customer,
  Dataset,
  DeskStats,
  KbChunk,
  Service,
  ServiceArea,
} from "@/lib/domain";
import { rankChunks, type RankedChunk } from "@/lib/retrieval";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type MemoryStore = ReturnType<typeof createMemoryStore>;

function attachEmbeddings(dataset: Dataset) {
  const file = path.join(process.cwd(), "data", "embeddings.json");
  if (!existsSync(file)) return;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { chunks?: Record<string, number[]> };
    for (const chunk of dataset.kb) {
      const vector = parsed.chunks?.[chunk.id];
      if (vector && vector.length > 0) chunk.embedding = vector;
    }
  } catch {
    // Keyword search remains available when the cache cannot be read.
  }
}

export function createMemoryStore(seed = createDataset()) {
  attachEmbeddings(seed);
  return {
    mode: "memory" as const,
    snapshot(): Dataset {
      return seed;
    },
    async listServices(): Promise<Service[]> {
      return seed.services;
    },
    async listAddons(): Promise<Addon[]> {
      return seed.addons;
    },
    async listAreas(): Promise<ServiceArea[]> {
      return seed.areas;
    },
    async listCleaners(): Promise<Cleaner[]> {
      return seed.cleaners;
    },
    async listCustomers(): Promise<Customer[]> {
      return seed.customers;
    },
    async listBookings(status?: BookingStatus): Promise<BookingDetail[]> {
      return listBookingDetails(seed, status);
    },
    async getBooking(id: string): Promise<BookingDetail | null> {
      const booking = seed.bookings.find((item) => item.id === id);
      return booking ? describeBooking(seed, booking) : null;
    },
    async stats(now = new Date()): Promise<DeskStats> {
      return deskStats(seed, now);
    },
    async searchKnowledge(query: string, embedding?: number[] | null): Promise<RankedChunk[]> {
      return rankChunks(seed.kb, query, embedding);
    },
    async listKb(): Promise<KbChunk[]> {
      return seed.kb;
    },
    quote: async (input: unknown) => makeQuote(seed, input),
    openSlots: async (input: unknown, now = new Date()) => findOpenSlots(seed, input, now),
    proposeCreate: async (input: unknown, now = new Date()) => proposeCreate(seed, input, now),
    proposeReschedule: async (input: unknown, now = new Date()) => proposeReschedule(seed, input, now),
    commitCreate: async (input: unknown, now = new Date()) => applyCreate(seed, input, now),
    commitReschedule: async (input: unknown, now = new Date()) => applyReschedule(seed, input, now),
    async logChat(entry: Omit<ChatLog, "id" | "createdAt">): Promise<void> {
      seed.logs.unshift({
        ...entry,
        id: `log-${seed.logs.length + 1}`,
        createdAt: new Date().toISOString(),
      });
    },
    async listLogs(limit = 40): Promise<ChatLog[]> {
      return seed.logs.slice(0, limit);
    },
  };
}

const globalStore = globalThis as { __cleandesk?: MemoryStore };

export function getMemoryStore(): MemoryStore {
  if (!globalStore.__cleandesk) globalStore.__cleandesk = createMemoryStore();
  return globalStore.__cleandesk;
}
