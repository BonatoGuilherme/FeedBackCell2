"use client";

import Link from "next/link";
import AuthPageShell from "../components/AuthPageShell";
import { useLogin } from "./useLogin";

export default function LoginPage() {
  const {
    email,
    setEmail,
    senha,
    setSenha,
    erro,
    loading,
    emailError,
    validateEmail,
    handleLogin,
  } = useLogin();

  return (
    <AuthPageShell
      title="FeedBackCELL"
      subtitle="Gerencie seus dispositivos com eficiência"
      securityText="🔒 Sua conexão é segura e criptografada"
    >
      <form onSubmit={handleLogin}>
        {erro && (
          <div>
            <p>{erro}</p>
          </div>
        )}

        <div>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              validateEmail(e.target.value);
            }}
          />
          {emailError && <p>{emailError}</p>}
        </div>

        <div>
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            required
            placeholder="••••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Conectando..." : "Entrar"}
        </button>
      </form>

      <p>
        Não tem uma conta?{" "}
        <Link href="/register">Crie uma agora</Link>
      </p>
    </AuthPageShell>
  );
}
