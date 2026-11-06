"use client";

import { ChatPanel } from "@/components/chat-panel";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function ChatDock() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname === "/assistant") return null;
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
      {open ? (
        <div className="h-[34rem] w-[min(100vw-2rem,24rem)]">
          <ChatPanel compact />
        </div>
      ) : null}
      <Button onClick={() => setOpen((value) => !value)} data-testid="chat-dock">
        {open ? "Close assistant" : "Ask BrightHarbor"}
      </Button>
    </div>
  );
}
