"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

type AuthFieldProps = ComponentProps<"input"> & {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string;
};

export function AuthField({ id, label, icon, error, type, ...props }: AuthFieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const errorId = `${id}-erro`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-[#0f1020]">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8ea3] [&_svg]:size-[18px]" aria-hidden>
          {icon}
        </span>
        <Input
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={isPassword ? "pl-11 pr-12" : "pl-11"}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={visible}
            className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-[#5f6378] hover:bg-black/5 hover:text-[#0f1020]"
          >
            {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-[13px] text-[#c2392f]">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-xl border border-[#f3cfcb] bg-[#fff6f5] px-4 py-3 text-sm text-[#a3322a]">
      {children}
    </div>
  );
}
