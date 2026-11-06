"use server";

import { DEMO_COOKIE, passwordMatches } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/");
  const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
  if (!passwordMatches(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(safeNext)}`);
  }
  const jar = await cookies();
  jar.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  });
  redirect(safeNext);
}

export async function logout() {
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  redirect("/login");
}
