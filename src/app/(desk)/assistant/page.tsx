import { ChatPanel } from "@/components/chat-panel";

export const dynamic = "force-dynamic";

export default function AssistantPage() {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-brass">Assistant</p>
        <h1 className="font-serif text-4xl text-spruce-deep">Ask BrightHarbor</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Policy answers cite the knowledge notes. Quotes and windows run the same tools as the live model. Create and reschedule stop on a confirmation card.
        </p>
      </header>
      <ChatPanel />
    </div>
  );
}
