import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-line bg-white px-3 text-sm text-ink outline-none ring-spruce placeholder:text-muted focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
