export const EMBEDDING_DIMENSIONS = 1024;
export const DEFAULT_CHAT_MODEL = "qwen-plus";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-v3";
export const DEFAULT_DASHSCOPE_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

export type LlmProvider = "mock" | "qwen";

export function llmProvider(): LlmProvider {
  return process.env.LLM_PROVIDER === "qwen" ? "qwen" : "mock";
}

export function dashscopeConfig() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY is not set. Use LLM_PROVIDER=mock to run without a key.");
  }
  return {
    apiKey,
    baseURL: process.env.DASHSCOPE_BASE_URL || DEFAULT_DASHSCOPE_BASE_URL,
    chatModel: process.env.DASHSCOPE_CHAT_MODEL || DEFAULT_CHAT_MODEL,
    embeddingModel: process.env.DASHSCOPE_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
  };
}
