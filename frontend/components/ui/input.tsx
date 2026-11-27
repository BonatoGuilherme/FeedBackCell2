import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-control border-2 border-line-strong bg-ink px-3.5 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-subtle hover:border-cream focus-visible:border-lime focus-visible:shadow-[4px_4px_0_var(--lime)] aria-invalid:border-error aria-invalid:shadow-[4px_4px_0_var(--pink)] disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
