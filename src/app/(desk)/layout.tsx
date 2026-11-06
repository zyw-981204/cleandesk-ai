import { Shell } from "@/components/shell";
import { llmProvider } from "@/lib/ai/config";
import { hasSupabaseConfig } from "@/lib/store";
import { connection } from "next/server";

export const dynamic = "force-dynamic";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <Shell provider={llmProvider()} dataMode={hasSupabaseConfig() ? "supabase" : "memory"}>
      {children}
    </Shell>
  );
}
