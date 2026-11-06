import { getStore } from "@/lib/store";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const store = await getStore();
  const input = await request.json();
  const sessionId = typeof input?.sessionId === "string" ? input.sessionId.slice(0, 80) : "demo";
  const result = await store.commitReschedule(input, new Date());
  await store.logChat({
    sessionId,
    toolName: "reschedule_booking",
    args: input,
    result,
    status: result.ok ? "committed" : "error",
  });
  if (result.ok && "detail" in result) {
    revalidatePath("/");
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${result.detail.id}`);
  }
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
