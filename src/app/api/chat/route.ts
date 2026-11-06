import { planMockTurn, type LooseMessage } from "@/lib/agent/mock-plan";
import { assistantInstructions } from "@/lib/agent/prompt";
import { buildAgentTools } from "@/lib/agent/tools";
import { dashscopeConfig, llmProvider } from "@/lib/ai/config";
import { embedQuery } from "@/lib/ai/embed";
import { getStore } from "@/lib/store";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

export const runtime = "nodejs";
export const maxDuration = 60;

async function streamPlainText(
  write: (part: { type: "text-start"; id: string } | { type: "text-delta"; id: string; delta: string } | { type: "text-end"; id: string }) => void,
  text: string,
) {
  const id = "assistant-text";
  write({ type: "text-start", id });
  const pieces = text.split(/(\s+)/);
  for (const piece of pieces) {
    write({ type: "text-delta", id, delta: piece });
    if (piece.trim().length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  write({ type: "text-end", id });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { messages?: UIMessage[]; sessionId?: string };
  const messages = body.messages ?? [];
  const sessionId = body.sessionId?.slice(0, 80) || "demo";
  const store = await getStore();
  const provider = llmProvider();

  if (provider === "mock") {
    const plan = await planMockTurn(messages as LooseMessage[], store, new Date());
    for (const call of plan.tools) {
      await store.logChat({
        sessionId,
        toolName: call.name,
        args: call.input,
        result: call.output,
        status: call.status,
      });
    }
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: "start" });
        writer.write({ type: "start-step" });
        await streamPlainText((part) => writer.write(part), plan.text);
        plan.tools.forEach((call, index) => {
          const toolCallId = `mock-${index}-${call.name}`;
          writer.write({
            type: "tool-input-available",
            toolCallId,
            toolName: call.name,
            input: call.input,
          });
          writer.write({
            type: "tool-output-available",
            toolCallId,
            output: call.output,
          });
        });
        for (const source of plan.sources) {
          writer.write({
            type: "source-document",
            sourceId: source.id,
            mediaType: "text/plain",
            title: source.title,
          });
        }
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  try {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    const query = lastUser?.parts
      ?.filter((part) => part.type === "text")
      .map((part) => ("text" in part ? part.text : ""))
      .join(" ")
      .trim() || "BrightHarbor cleaning services";
    const embedding = await embedQuery(query);
    const hits = await store.searchKnowledge(query, embedding);
    const config = dashscopeConfig();
    const dashscope = createOpenAICompatible({
      name: "dashscope",
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    const result = streamText({
      model: dashscope.chatModel(config.chatModel),
      instructions: assistantInstructions(hits.map((hit) => hit.chunk)),
      messages: await convertToModelMessages(messages),
      tools: buildAgentTools(store, sessionId),
      stopWhen: isStepCount(5),
    });
    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({ type: "start" });
        for (const hit of hits) {
          writer.write({
            type: "source-document",
            sourceId: hit.chunk.id,
            mediaType: "text/plain",
            title: hit.chunk.title,
          });
        }
        writer.merge(toUIMessageStream({ stream: result.stream, sendStart: false }));
      },
    });
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The qwen provider could not start.";
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: "start" });
        writer.write({ type: "start-step" });
        await streamPlainText((part) => writer.write(part), message);
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }
}
