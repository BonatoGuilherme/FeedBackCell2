"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, Cpu, MessageSquareText } from "lucide-react";

import { PhoneOrbit } from "@/components/ui/phone-orbit";

type AuthPageShellProps = {
  children: ReactNode;
  mode: "login" | "register";
  title: string;
  subtitle: string;
};

const features = [
  { icon: Cpu, title: "Especificações completas", text: "Tela, processador, câmeras e bateria lado a lado." },
  { icon: Camera, title: "Fotos de cada modelo", text: "Veja o aparelho por todos os ângulos antes de decidir." },
  { icon: MessageSquareText, title: "Avaliações reais", text: "Opiniões de quem já usa o celular no dia a dia." },
];

const switchLinks = {
  login: { question: "Ainda não tem conta?", href: "/register", label: "Criar conta" },
  register: { question: "Já tem uma conta?", href: "/login", label: "Entrar" },
} as const;

export default function AuthPageShell({ children, mode, title, subtitle }: AuthPageShellProps) {
  const swap = switchLinks[mode];

  return (
    <div className="auth-shell">
      {/* formulário: primeiro no DOM, para vir antes no celular e no leitor de tela */}
      <section className="auth-shell__form" aria-labelledby="auth-title">
        <div className="auth-shell__body">
          <div className="w-full max-w-[380px]">
            <Link href="/login" className="auth-logo" aria-label="FeedBackCELL, página de entrada">
              <span className="auth-logo__mark">
                <Image src="/brand-mark.svg" alt="" width={32} height={32} unoptimized priority />
              </span>
              <span className="auth-logo__name">
                FeedBack<span className="text-accent">CELL</span>
              </span>
            </Link>

            <header className="mt-10 mb-8">
              <h1 id="auth-title" className="text-h2 font-semibold tracking-[-0.02em] text-foreground sm:text-[26px] sm:leading-[32px]">
                {title}
              </h1>
              <p className="mt-2 text-body text-muted">{subtitle}</p>
            </header>

            {children}

            <p className="mt-8 border-t border-line pt-6 text-center text-label text-muted">
              {swap.question}{" "}
              <Link
                href={swap.href}
                className="rounded-sm font-medium text-accent underline-offset-4 hover:text-accent-hover hover:underline"
              >
                {swap.label}
              </Link>
            </p>
          </div>
        </div>

        <p className="auth-shell__legal text-caption text-subtle">
          FeedBackCELL · catálogo e avaliações de celulares
        </p>
      </section>

      {/* painel da marca: à esquerda no desktop, compacto abaixo do formulário no celular */}
      <aside className="auth-brand" aria-label="Sobre o FeedBackCELL">
        <div className="auth-brand__inner">
          <p className="auth-brand__eyebrow">Catálogo de celulares</p>
          <h2 className="auth-brand__title">Compare celulares com informação de verdade.</h2>
          <p className="auth-brand__lead">
            Especificações, fotos e avaliações de cada modelo reunidas em um só lugar.
          </p>

          <div className="auth-brand__stage">
            <PhoneOrbit className="auth-brand__orbit" modo="3d" />
          </div>

          <ul className="auth-brand__features">
            {features.map(({ icon: Icon, title: featureTitle, text }) => (
              <li key={featureTitle} className="auth-brand__feature">
                <span className="auth-brand__feature-icon" aria-hidden>
                  <Icon />
                </span>
                <span>
                  <span className="auth-brand__feature-title">{featureTitle}</span>
                  <span className="auth-brand__feature-text">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
