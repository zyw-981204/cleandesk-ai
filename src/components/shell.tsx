"use client";

import { logout } from "@/app/login/actions";
import { ChatDock } from "@/components/chat-dock";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/services", label: "Services" },
  { href: "/bookings", label: "Bookings" },
  { href: "/assistant", label: "Assistant" },
  { href: "/activity", label: "Activity" },
];

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({
  children,
  provider,
  dataMode,
}: {
  children: ReactNode;
  provider: "mock" | "qwen";
  dataMode: "memory" | "supabase";
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-spruce-deep text-foam md:min-h-screen md:border-b-0 md:border-r">
        <div className="px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-foam/70">CleanDesk AI</p>
          <p className="mt-1 font-serif text-2xl text-white">BrightHarbor</p>
          <p className="mt-1 text-xs text-foam/75">Harborlight booking desk</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:flex-col md:px-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-2 text-sm whitespace-nowrap md:rounded-2xl",
                active(pathname, item.href) ? "bg-white text-spruce-deep" : "text-foam hover:bg-white/10",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="hidden px-5 pb-6 md:block">
          <button type="submit" className="text-xs text-foam/70 underline-offset-2 hover:underline">
            Sign out of the demo
          </button>
        </form>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 border-b border-line/80 px-5 py-3 text-xs text-muted">
          <p>Fictional company · no live charges</p>
          <p data-testid="runtime-mode">
            {provider === "qwen" ? "Qwen" : "Mock model"} · {dataMode === "supabase" ? "Supabase" : "In-memory data"}
          </p>
        </div>
        <div className="px-4 py-6 pb-28 md:px-8 md:py-8">{children}</div>
      </div>
      <ChatDock />
    </div>
  );
}
