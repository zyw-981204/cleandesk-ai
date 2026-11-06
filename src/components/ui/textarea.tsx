import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-11 w-full resize-none rounded-2xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-spruce placeholder:text-muted focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
