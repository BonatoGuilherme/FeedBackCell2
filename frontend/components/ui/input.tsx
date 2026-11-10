import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-control border border-line bg-surface px-3.5 text-[15px] text-foreground shadow-elevation-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-subtle hover:border-line-strong focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/25 aria-invalid:border-error aria-invalid:ring-error/15 disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
