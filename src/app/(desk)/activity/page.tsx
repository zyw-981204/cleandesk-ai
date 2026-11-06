import { Badge } from "@/components/ui/badge";
import { getStore } from "@/lib/store";
import { formatWhen } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const store = await getStore();
  const logs = await store.listLogs(50);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-brass">Audit</p>
        <h1 className="font-serif text-4xl text-spruce-deep">Tool activity</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Every quote, availability check, proposal, and confirmed write is stored in chat_logs. In mock mode that table lives in memory until you connect Supabase.
        </p>
      </header>
      {logs.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line bg-card p-6 text-sm text-muted">
          No tool calls yet. Ask the assistant for a quote to write the first row.
        </p>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="rounded-3xl border border-line bg-card px-4 py-3" data-testid="chat-log">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{log.toolName}</p>
                <Badge>{log.status}</Badge>
              </div>
              <p className="text-xs text-muted">
                {formatWhen(log.createdAt)} · session {log.sessionId}
              </p>
              <pre className="mt-2 overflow-x-auto text-xs text-muted">{JSON.stringify(log.args, null, 2)}</pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
