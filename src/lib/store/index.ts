import "server-only";

import { getMemoryStore, type MemoryStore } from "@/lib/store/memory";
import { getSupabaseStore, type SupabaseStore } from "@/lib/store/supabase";
import { cache } from "react";
import { connection } from "next/server";

export type DataStore = MemoryStore | SupabaseStore;

export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export const getStore = cache(async (): Promise<DataStore> => {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return getSupabaseStore(url, key);
  if (url || key) {
    throw new Error(
      "Set both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or leave both empty to use the in-memory demo store.",
    );
  }
  return getMemoryStore();
});
