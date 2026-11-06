import { EMBEDDING_DIMENSIONS, dashscopeConfig, llmProvider } from "@/lib/ai/config";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { embed, embedMany } from "ai";

function provider() {
  const config = dashscopeConfig();
  return {
    config,
    client: createOpenAICompatible({
      name: "dashscope",
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    }),
  };
}

export async function embedQuery(value: string): Promise<number[] | null> {
  if (llmProvider() !== "qwen" || !process.env.DASHSCOPE_API_KEY) return null;
  try {
    const { config, client } = provider();
    const result = await embed({
      model: client.embeddingModel(config.embeddingModel),
      value,
      dimensions: EMBEDDING_DIMENSIONS,
      providerOptions: {
        dashscope: { dimensions: EMBEDDING_DIMENSIONS },
      },
    });
    if (result.embedding.length !== EMBEDDING_DIMENSIONS) return null;
    return result.embedding;
  } catch {
    return null;
  }
}

export async function embedDocuments(values: string[]): Promise<number[][]> {
  const { config, client } = provider();
  const result = await embedMany({
    model: client.embeddingModel(config.embeddingModel),
    values,
    dimensions: EMBEDDING_DIMENSIONS,
    providerOptions: {
      dashscope: { dimensions: EMBEDDING_DIMENSIONS },
    },
  });
  for (const vector of result.embeddings) {
    if (vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `text-embedding-v3 returned ${vector.length} dimensions, expected ${EMBEDDING_DIMENSIONS}. The pgvector column is vector(${EMBEDDING_DIMENSIONS}).`,
      );
    }
  }
  return result.embeddings;
}
