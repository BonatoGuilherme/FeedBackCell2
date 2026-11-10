"use client";

import { Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthPageShell from "../components/AuthPageShell";
import { AuthField, FormAlert } from "../components/AuthField";
import { useLogin } from "./useLogin";

export default function LoginPage() {
  const { email, setEmail, senha, setSenha, erro, loading, emailError, validateEmail, handleLogin } =
    useLogin();

  return (
    <AuthPageShell mode="login" title="Entrar na sua conta" subtitle="Use seu e-mail e senha para acessar o catálogo.">
      <form className="space-y-5" onSubmit={handleLogin} noValidate>
        {erro && <FormAlert>{erro}</FormAlert>}

        <AuthField
          id="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          placeholder="seu@email.com"
          icon={<Mail />}
          value={email}
          error={emailError}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) validateEmail(e.target.value);
          }}
          onBlur={(e) => e.target.value && validateEmail(e.target.value)}
        />

        <AuthField
          id="senha"
          label="Senha"
          type="password"
          autoComplete="current-password"
          required
                    icon={<Lock />}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading} aria-busy={loading || undefined}>
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </AuthPageShell>
  );
}
