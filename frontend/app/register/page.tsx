"use client";

import { Loader2, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthPageShell from "../components/AuthPageShell";
import { AuthField, FormAlert } from "../components/AuthField";
import useRegister from "./useRegister";

export default function RegisterPage() {
  const { email, setEmail, senha, setSenha, erro, loading, validations, validateField, handleRegister, nome, setNome } =
    useRegister();

  return (
    <AuthPageShell
      mode="register"
      title="Criar sua conta"
      subtitle="Leva menos de um minuto."
      securityText="Seus dados são processados com segurança"
    >
      <form className="space-y-4" onSubmit={handleRegister} noValidate>
        {erro && <FormAlert>{erro}</FormAlert>}

        <AuthField
          id="nome"
          label="Nome completo"
          autoComplete="name"
          required
          placeholder="João Silva"
          icon={<User />}
          value={nome}
          error={nome && !validations.nome ? "Mínimo de 3 caracteres" : undefined}
          onChange={(e) => {
            setNome(e.target.value);
            validateField("nome", e.target.value);
          }}
        />

        <AuthField
          id="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          placeholder="seu@email.com"
          icon={<Mail />}
          value={email}
          error={email && !validations.email ? "E-mail inválido" : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            validateField("email", e.target.value);
          }}
        />

        <AuthField
          id="senha"
          label="Senha"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Mínimo de 6 caracteres"
          icon={<Lock />}
          value={senha}
          error={senha && !validations.senha ? "Mínimo de 6 caracteres" : undefined}
          onChange={(e) => {
            setSenha(e.target.value);
            validateField("senha", e.target.value);
          }}
        />

        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          disabled={loading || !validations.nome || !validations.email || !validations.senha}
        >
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {loading ? "Cadastrando…" : "Criar conta"}
        </Button>
      </form>
    </AuthPageShell>
  );
}
