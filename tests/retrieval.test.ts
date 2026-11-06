import assert from "node:assert/strict";
import test from "node:test";
import { KB_CHUNKS } from "../src/lib/catalog";
import { bm25Search, cosineSimilarity } from "../src/lib/retrieval";

test("keyword search ranks the cancellation policy first", () => {
  const hits = bm25Search(KB_CHUNKS, "cancellation fee no-show within 24 hours");
  assert.ok(hits.length > 0);
  assert.equal(hits[0].chunk.id, "kb-cancel");
});

test("keyword search ranks service areas for postal questions", () => {
  const hits = bm25Search(KB_CHUNKS, "which postal codes does Port Meridian cover");
  assert.equal(hits[0].chunk.source, "service-areas");
});

test("cosine similarity prefers a matching vector", () => {
  const query = [1, 0, 0];
  assert.ok(cosineSimilarity(query, [1, 0, 0]) > cosineSimilarity(query, [0, 1, 0]));
});
