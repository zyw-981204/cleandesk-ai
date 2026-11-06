import type { KbChunk } from "@/lib/domain";

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "for",
  "in",
  "on",
  "at",
  "is",
  "are",
  "was",
  "be",
  "our",
  "your",
  "you",
  "we",
  "with",
  "do",
  "does",
  "what",
  "how",
  "can",
  "i",
  "my",
  "me",
  "it",
  "this",
  "that",
  "from",
  "by",
  "about",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP.has(token));
}

export type RankedChunk = { chunk: KbChunk; score: number };

export function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function bm25Search(chunks: KbChunk[], query: string, limit = 4): RankedChunk[] {
  const docs = chunks.map((chunk) => tokenize(`${chunk.title} ${chunk.source} ${chunk.content}`));
  const terms = tokenize(query);
  if (terms.length === 0 || chunks.length === 0) return [];
  const average = docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length || 1;
  const documentFrequency = new Map<string, number>();
  for (const doc of docs) {
    for (const term of new Set(doc)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }
  const k1 = 1.2;
  const b = 0.75;
  const ranked: RankedChunk[] = [];
  docs.forEach((doc, index) => {
    const frequency = new Map<string, number>();
    for (const term of doc) frequency.set(term, (frequency.get(term) ?? 0) + 1);
    let score = 0;
    for (const term of terms) {
      const found = frequency.get(term) ?? 0;
      if (found === 0) continue;
      const docsWithTerm = documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (chunks.length - docsWithTerm + 0.5) / (docsWithTerm + 0.5));
      const denom = found + k1 * (1 - b + b * (doc.length / average));
      score += (idf * (found * (k1 + 1))) / denom;
    }
    if (score > 0) ranked.push({ chunk: chunks[index], score });
  });
  ranked.sort((left, right) => right.score - left.score);
  return ranked.slice(0, limit);
}

export function rankChunks(
  chunks: KbChunk[],
  query: string,
  embedding?: number[] | null,
  limit = 4,
): RankedChunk[] {
  const embedded = chunks.filter((chunk) => chunk.embedding && chunk.embedding.length > 0);
  const canUseVectors =
    Boolean(embedding && embedding.length > 0) && embedded.length >= Math.ceil(chunks.length / 2);
  if (!canUseVectors || !embedding) return bm25Search(chunks, query, limit);
  const ranked = chunks
    .map((chunk) => ({
      chunk,
      score: chunk.embedding ? cosineSimilarity(embedding, chunk.embedding) : 0,
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);
  if (ranked.length === 0) return bm25Search(chunks, query, limit);
  return ranked.slice(0, limit);
}
