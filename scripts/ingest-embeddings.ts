import { embedDocuments } from "../src/lib/ai/embed";
import { EMBEDDING_DIMENSIONS } from "../src/lib/ai/config";
import { createDataset } from "../src/lib/dataset";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env";

loadEnv();

const dataset = createDataset();
const vectors = await embedDocuments(dataset.kb.map((chunk) => `${chunk.title}\n${chunk.content}`));
const chunks = Object.fromEntries(dataset.kb.map((chunk, index) => [chunk.id, vectors[index]]));
const payload = {
  model: process.env.DASHSCOPE_EMBEDDING_MODEL || "text-embedding-v3",
  dimensions: EMBEDDING_DIMENSIONS,
  chunks,
};

const target = path.join(process.cwd(), "data", "embeddings.json");
mkdirSync(path.dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(payload));
console.log(`Wrote ${target} (${dataset.kb.length} vectors, ${EMBEDDING_DIMENSIONS} dimensions).`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("Supabase env vars are not set, so only the local embedding cache was written.");
  process.exit(0);
}

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

for (const chunk of dataset.kb) {
  const embedding = `[${chunks[chunk.id].join(",")}]`;
  const { error } = await client.from("kb_chunks").update({ embedding }).eq("id", chunk.id);
  if (error) throw new Error(`${chunk.id}: ${error.message}`);
}

console.log("Updated kb_chunks.embedding in Supabase.");
