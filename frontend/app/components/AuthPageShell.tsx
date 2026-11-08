"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

// three.js só no navegador e carregado sob demanda
const PhoneReal = dynamic(() => import("@/components/ui/phone-real"), {
  ssr: false,
  loading: () => <div className="h-[460px] w-[340px]" aria-hidden />,
});

type AuthPageShellProps = {
  children: ReactNode;
  mode: "login" | "register";
  title: string;
  subtitle: string;
  securityText?: string;
};

export default function AuthPageShell({
  children,
  mode,
  title,
  subtitle,
  securityText = "Sua conexão é segura e criptografada",
}: AuthPageShellProps) {
  return (
    <div className="grid min-h-dvh bg-[#0b0b10] lg:grid-cols-2">
      {/* formulário */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px] rounded-[28px] bg-white p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] sm:p-9">
          <Link href="/login" className="mb-8 flex items-center gap-3" aria-label="FeedBackCELL">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#eef0ff]">
              <Image src="/icons8-celular-100.png" alt="" width={28} height={28} unoptimized priority />
            </span>
            <span className="text-[22px] font-bold tracking-tight text-[#0f1020]">
              FeedBack<span className="text-[#4c5cf5]">CELL</span>
            </span>
          </Link>

          <div
            role="tablist"
            aria-label="Acesso"
            className="mb-7 grid grid-cols-2 rounded-xl bg-[#f1f2f7] p-1 text-sm font-semibold"
          >
            {(
              [
                ["login", "/login", "Entrar"],
                ["register", "/register", "Criar conta"],
              ] as const
            ).map(([key, href, text]) => (
              <Link
                key={key}
                href={href}
                role="tab"
                aria-selected={mode === key}
                className={cn(
                  "rounded-lg py-2.5 text-center transition-colors",
                  mode === key
                    ? "bg-white text-[#0f1020] shadow-sm"
                    : "text-[#5f6378] hover:text-[#0f1020]",
                )}
              >
                {text}
              </Link>
            ))}
          </div>

          <header className="mb-6">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#0f1020]">{title}</h1>
            <p className="mt-1.5 text-[15px] text-[#5f6378]">{subtitle}</p>
          </header>

          {children}

          <p className="mt-7 flex items-center justify-center gap-2 text-[13px] text-[#5f6378]">
            <ShieldCheck className="size-4 text-[#4c5cf5]" aria-hidden />
            {securityText}
          </p>
        </div>
      </section>

      {/* vitrine com celular 3D */}
      <section
        aria-label="Apresentação"
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center"
      >
        <div className="relative z-10 px-10 text-center">
          <h2 className="text-[clamp(28px,2.6vw,40px)] font-semibold leading-tight tracking-tight text-white">
            Seja bem-vindo ao
            <br />
            <span className="bg-[linear-gradient(90deg,#9aa6ff,#c4b5fd)] bg-clip-text text-transparent">
              FeedBackCELL
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-white/65">
            Compare celulares, veja fotos reais e leia opiniões antes de escolher o próximo.
          </p>
        </div>
        <PhoneReal className="relative z-10 mt-4 h-[460px] w-[340px]" />
        <p className="relative z-10 mt-2 text-xs text-white/45">Arraste o celular para girar</p>
      </section>
    </div>
  );
}
