"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthPageShell from "../components/AuthPageShell";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const router = useRouter();

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError("E-mail é obrigatório");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError("E-mail inválido");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (!validateEmail(email) || !senha) {
      if (!senha) setErro("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, senha }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || "Falha ao fazer login");
      }

      localStorage.setItem("token", data.token);
      router.push("/catalog");
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      title="FeedBackCELL"
      subtitle="Gerencie seus dispositivos com eficiência"
      securityText="🔒 Sua conexão é segura e criptografada"
    >
      <form className="space-y-6" onSubmit={handleLogin}>
              {/* Erro geral */}
              {erro && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-red-700 text-sm font-medium">{erro}</p>
                </div>
              )}

              {/* Email input */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                    emailError
                      ? "border-red-500 bg-red-50 focus:bg-white"
                      : "border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white"
                  }`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    validateEmail(e.target.value);
                  }}
                />
                {emailError && (
                  <p className="text-red-500 text-xs mt-1">{emailError}</p>
                )}
              </div>

              {/* Senha input */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white focus:outline-none transition-all duration-200"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>

              {/* Botão de login */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Conectando...
                  </>
                ) : (
                  "Entrar"
                )}
              </button>
      </form>

      <p className="text-center text-gray-600 text-sm mt-6">
        Não tem uma conta?{" "}
        <Link
          href="/register"
          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Crie uma agora
        </Link>
      </p>
    </AuthPageShell>
  );
}
