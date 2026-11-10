"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthFieldProps = ComponentProps<"input"> & {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string;
  /** Texto de ajuda fixo abaixo do campo (some quando há erro). */
  hint?: string;
};

export function AuthField({ id, label, icon, error, hint, type, ...props }: AuthFieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const errorId = `${id}-erro`;
  const hintId = `${id}-dica`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="auth-field">
      <label htmlFor={id} className="text-label font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <span
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 [&_svg]:size-[17px]",
            error ? "text-error" : "text-subtle",
          )}
          aria-hidden
        >
          {icon}
        </span>
        <Input
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={isPassword ? "pl-10 pr-11" : "pl-10"}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={visible}
            aria-controls={id}
            className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-[8px] text-subtle transition-colors hover:bg-surface-soft hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
          >
            {visible ? <EyeOff className="size-[17px]" aria-hidden /> : <Eye className="size-[17px]" aria-hidden />}
          </button>
        )}
      </div>
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-label text-error">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-label text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-control border border-error-line bg-error-soft px-3.5 py-3 text-label text-error"
    >
      <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
