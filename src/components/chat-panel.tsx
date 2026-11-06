"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatCents } from "@/lib/money";
import { formatWhen } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const PROMPTS = [
  "What is your cancellation policy?",
  "Quote a deep clean, 2 bed, 2 bath, 1,100 sq ft in 88012, with oven",
  "Which mornings are open next week in Port Meridian?",
  "Book the first open morning for Quinn Hale at 18 Lantern Row",
];

const SESSION_KEY = "cleandesk-session-v1";

function sessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

type Decision = { ok: boolean; error?: string; id?: string };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function textOf(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join("");
}

export function ChatPanel({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ sessionId: sessionId() }),
      }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  async function confirm(kind: "create" | "reschedule", payload: unknown, toolCallId: string) {
    setBusyId(toolCallId);
    const response = await fetch(kind === "create" ? "/api/bookings/commit" : "/api/bookings/reschedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...(record(payload) ?? {}), sessionId: sessionId() }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string; detail?: { id?: string } };
    setDecisions((current) => ({
      ...current,
      [toolCallId]: {
        ok: Boolean(json.ok),
        error: json.error,
        id: json.detail?.id,
      },
    }));
    setBusyId(null);
    router.refresh();
  }

  return (
    <Card className={cn("flex flex-col overflow-hidden", compact ? "h-full" : "min-h-[72vh]")}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="font-serif text-lg text-spruce-deep">BrightHarbor assistant</p>
          <p className="text-xs text-muted">Quotes, open windows, and bookings that wait for your confirm.</p>
        </div>
        <Badge>{busy ? "Thinking" : "Ready"}</Badge>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" data-testid="chat-transcript">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">Try one of the desk prompts, or ask in your own words.</p>
            <div className="flex flex-wrap gap-2">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-full border border-line bg-foam px-3 py-1.5 text-left text-xs text-spruce hover:bg-white"
                  onClick={() => sendMessage({ text: prompt })}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((message) => (
          <MessageBlock
            key={message.id}
            message={message}
            decisions={decisions}
            busyId={busyId}
            onConfirm={confirm}
            onDismiss={(toolCallId) =>
              setDecisions((current) => ({ ...current, [toolCallId]: { ok: false, error: "Left unsaved." } }))
            }
          />
        ))}
        {error ? <p className="text-sm text-danger">The assistant could not finish that reply. Try again.</p> : null}
      </div>
      <form
        className="border-t border-line p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const text = input.trim();
          if (!text || busy) return;
          sendMessage({ text });
          setInput("");
        }}
      >
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="chat-input">
            Message the assistant
          </label>
          <Textarea
            id="chat-input"
            data-testid="chat-input"
            rows={compact ? 2 : 2}
            value={input}
            placeholder="Ask about a price, a policy, or a window..."
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button type="submit" data-testid="chat-send" disabled={busy || input.trim().length === 0}>
            Send
          </Button>
        </div>
      </form>
    </Card>
  );
}

function MessageBlock({
  message,
  decisions,
  busyId,
  onConfirm,
  onDismiss,
}: {
  message: UIMessage;
  decisions: Record<string, Decision>;
  busyId: string | null;
  onConfirm: (kind: "create" | "reschedule", payload: unknown, toolCallId: string) => void;
  onDismiss: (toolCallId: string) => void;
}) {
  const sources = message.parts.filter((part) => part.type === "source-document");
  const mine = message.role === "user";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[42rem] space-y-2", mine ? "items-end" : "w-full")}>
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            const value = textOf({ ...message, parts: [part] });
            if (!value.trim()) return null;
            return (
              <div
                key={`${message.id}-text-${index}`}
                className={cn(
                  "whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-6",
                  mine ? "bg-spruce text-white" : "border border-line bg-white text-ink",
                )}
              >
                {value}
              </div>
            );
          }
          if (part.type === "source-document") return null;
          if (!part.type.startsWith("tool-")) return null;
          const toolName = part.type.slice(5);
          const toolCallId = "toolCallId" in part ? part.toolCallId : `${message.id}-${index}`;
          const output = "output" in part ? part.output : undefined;
          return (
            <ToolCard
              key={toolCallId}
              name={toolName}
              output={output}
              decision={decisions[toolCallId]}
              pending={busyId === toolCallId}
              onConfirm={(kind, payload) => onConfirm(kind, payload, toolCallId)}
              onDismiss={() => onDismiss(toolCallId)}
            />
          );
        })}
        {sources.length > 0 ? (
          <div className="flex flex-wrap gap-1.5" data-testid="citations">
            {sources.map((part, index) => (
              <span
                key={`${message.id}-source-${index}`}
                data-testid="citation"
                className="rounded-full bg-brass-soft px-2 py-1 text-[11px] text-brass"
              >
                {"title" in part ? part.title : "Source"}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToolCard({
  name,
  output,
  decision,
  pending,
  onConfirm,
  onDismiss,
}: {
  name: string;
  output: unknown;
  decision?: Decision;
  pending: boolean;
  onConfirm: (kind: "create" | "reschedule", payload: unknown) => void;
  onDismiss: () => void;
}) {
  const data = record(output);
  if (!data) return <div className="rounded-2xl border border-dashed border-line px-3 py-2 text-xs text-muted">Checking the desk…</div>;
  if (data.ok === false) {
    return <div className="rounded-2xl border border-danger/30 bg-white px-3 py-2 text-sm text-danger">{String(data.error)}</div>;
  }
  if (name === "get_quote") {
    const lines = Array.isArray(data.lines) ? data.lines : [];
    return (
      <div className="rounded-2xl border border-line bg-foam/60 px-4 py-3 text-sm" data-testid="quote-card">
        <p className="font-medium text-spruce-deep">{String(data.serviceName)} quote</p>
        <ul className="mt-2 space-y-1 text-muted">
          {lines.map((line, index) => {
            const row = record(line);
            if (!row) return null;
            return (
              <li key={index} className="flex justify-between gap-4">
                <span>{String(row.label)}</span>
                <span>{formatCents(Number(row.cents))}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-base font-semibold text-ink">{formatCents(Number(data.totalCents))}</p>
      </div>
    );
  }
  if (name === "check_availability") {
    const slots = Array.isArray(data.slots) ? data.slots : [];
    return (
      <div className="rounded-2xl border border-line bg-white px-4 py-3 text-sm" data-testid="availability-card">
        <p className="font-medium text-spruce-deep">Open windows in {String(data.areaName)}</p>
        {slots.length === 0 ? <p className="mt-1 text-muted">None in that range.</p> : null}
        <ul className="mt-2 space-y-1">
          {slots.map((slot) => {
            const row = record(slot);
            if (!row) return null;
            return (
              <li key={String(row.id)} className="flex justify-between gap-3 text-muted">
                <span>{String(row.label)}</span>
                <span>{String(row.cleanerName)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  if (name === "create_booking" || name === "reschedule_booking") {
    const kind = name === "create_booking" ? "create" : "reschedule";
    const payload = kind === "create" ? data.input : { bookingId: data.bookingId, slotId: record(data.toSlot)?.id };
    const when = kind === "create" ? record(data.slot) : record(data.toSlot);
    return (
      <div className="rounded-2xl border border-brass/40 bg-brass-soft/50 px-4 py-3 text-sm" data-testid="confirm-card">
        <p className="font-medium text-spruce-deep">{kind === "create" ? "Confirm this booking" : "Confirm this change"}</p>
        <p className="mt-1 text-ink">
          {kind === "create"
            ? `${String(data.serviceName)} for ${String(record(data.input)?.customerName)} at ${String(record(data.input)?.addressLine)}`
            : `${String(data.bookingId)} · ${String(data.customerName)}`}
        </p>
        <p className="text-muted">
          {when ? formatWhen(String(when.startsAt)) : ""}
          {when ? ` · ${String(when.cleanerName)}` : ""}
          {typeof data.totalCents === "number" ? ` · ${formatCents(data.totalCents)}` : ""}
        </p>
        {decision?.ok ? (
          <p className="mt-2 text-ok" data-testid="confirmed-booking">
            Saved {decision.id}. It is on the bookings list.
          </p>
        ) : null}
        {decision && !decision.ok ? <p className="mt-2 text-muted">{decision.error}</p> : null}
        {!decision ? (
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="brass"
              data-testid={kind === "create" ? "confirm-booking" : "confirm-reschedule"}
              disabled={pending}
              onClick={() => onConfirm(kind, payload)}
            >
              {pending ? "Saving…" : "Confirm"}
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={onDismiss}>
              Not now
            </Button>
          </div>
        ) : null}
      </div>
    );
  }
  return null;
}
