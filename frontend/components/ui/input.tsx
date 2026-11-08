import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-[#e1e3ec] bg-white px-4 text-[15px] text-[#0f1020] outline-none transition-[border-color,box-shadow] placeholder:text-[#9a9db0] focus-visible:border-[#4c5cf5] focus-visible:ring-[3px] focus-visible:ring-[#4c5cf5]/20 aria-invalid:border-[#d4453b] aria-invalid:ring-[#d4453b]/15 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
