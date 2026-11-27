"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Camera, Cpu, MessageSquareText } from "lucide-react";

import DemoNotice from "./DemoNotice";
import { caminhoSeguro } from "@/src/lib/rotas";

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
  // quem veio de uma ação que exige conta volta para ela depois de entrar ou criar a conta
  const next = caminhoSeguro(useSearchParams().get("next"));
  const swapHref = next ? `${swap.href}?next=${encodeURIComponent(next)}` : swap.href;

  return (
    <div className="auth-shell">
      {/* formulário: primeiro no DOM, para vir antes no celular e no leitor de tela */}
      <section className="auth-shell__form" aria-labelledby="auth-title">
        <div className="auth-shell__body">
          <div className="w-full max-w-[380px]">
            <Link href="/" className="brand-sign" aria-label="FeedBackCELL, início">
              FeedBack<span>CELL</span>
            </Link>

            <header className="mt-10 mb-8">
              <h1 id="auth-title" className="auth-title">
                {title}
              </h1>
              <p className="mt-2 text-body text-muted">{subtitle}</p>
            </header>

            <DemoNotice className="mb-6" />

            {children}

            <p className="mt-8 border-t border-line pt-6 text-center text-label text-muted">
              {swap.question}{" "}
              <Link
                href={swapHref}
                className="text-link font-semibold"
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
          <p className="kicker">Catálogo de celulares</p>
          <h2 className="auth-brand__title">Compare celulares com informação de verdade.</h2>
          <p className="auth-brand__lead">
            Especificações, fotos e avaliações de cada modelo reunidas em um só lugar.
          </p>

          <div className="auth-brand__signs" aria-hidden>
            <span className="vsign vsign--1">携帯の仕様と評価</span>
            <span className="vsign vsign--2">会員受付</span>
            <span className="vsign vsign--3">口コミ</span>
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
