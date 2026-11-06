import { createDataset } from "../src/lib/dataset";
import { datasetToRows } from "../src/lib/store/rows";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env";

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("Supabase env vars are not set. The running app uses its in-memory store, which seeds itself. Nothing was written.");
  process.exit(0);
}

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const rows = datasetToRows(createDataset());

async function clear(table: string, column: string) {
  const { error } = await client.from(table).delete().neq(column, "");
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function insert(table: string, values: unknown[]) {
  const { error } = await client.from(table).insert(values);
  if (error) throw new Error(`${table}: ${error.message}`);
}

await clear("chat_logs", "session_id");
await clear("bookings", "id");
await clear("time_slots", "id");
await clear("kb_chunks", "id");
await clear("customers", "id");
await clear("cleaners", "id");
await clear("service_areas", "id");
await clear("addons", "slug");
await clear("services", "slug");

await insert("services", rows.services);
await insert("addons", rows.addons);
await insert("service_areas", rows.areas);
await insert("cleaners", rows.cleaners);
await insert("customers", rows.customers);
await insert("time_slots", rows.slots);
await insert("kb_chunks", rows.kb);
await insert("bookings", rows.bookings);

console.log(
  `Seeded BrightHarbor: ${rows.services.length} services, ${rows.slots.length} slots, ${rows.bookings.length} bookings, ${rows.kb.length} knowledge chunks.`,
);
