"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthPageShell from "../components/AuthPageShell";

export default function RegisterPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [validations, setValidations] = useState({
    nome: false,
    email: false,
    senha: false,
  });
  const [senhaStrength] = useState(0);
  const router = useRouter();

  const validateField = (field: string, value: string) => {
    let isValid = false;

    if (field === "nome") {
      isValid = value.trim().length >= 3;
    } else if (field === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      isValid = emailRegex.test(value);
    } else if (field === "senha") {
      isValid = value.length >= 6;
    }
    setValidations((prev) => ({ ...prev, [field]: isValid }));
    return isValid;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    const nomeValid = validateField("nome", nome);
    const emailValid = validateField("email", email);
    const senhaValid = validateField("senha", senha);

    if (!nomeValid || !emailValid || !senhaValid) {
      setErro("Preencha todos os campos corretamente");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, email, senha }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || "Erro ao criar conta");
      }

      router.push("/login?success=true");
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      title="Criar Conta"
      subtitle="Junte-se à comunidade FeedBackCELL"
      securityText="🔒 Seus dados são processados com segurança"
    >
      <form className="space-y-5" onSubmit={handleRegister}>
              {/* Erro geral */}
              {erro && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-red-700 text-sm font-medium">{erro}</p>
                </div>
              )}

              {/* Nome input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="João Silva"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                      nome && !validations.nome
                        ? "border-red-500 bg-red-50 focus:bg-white"
                        : nome && validations.nome
                          ? "border-green-500 bg-green-50 focus:bg-white"
                          : "border-gray-200 bg-gray-50 focus:border-purple-500 focus:bg-white"
                    }`}
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      validateField("nome", e.target.value);
                    }}
                  />
                  {validations.nome && (
                    <span className="absolute right-3 top-3 text-green-500">
                      ✓
                    </span>
                  )}
                </div>
                {nome && !validations.nome && (
                  <p className="text-red-500 text-xs mt-1">
                    Mínimo 3 caracteres
                  </p>
                )}
              </div>

              {/* Email input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                      email && !validations.email
                        ? "border-red-500 bg-red-50 focus:bg-white"
                        : email && validations.email
                          ? "border-green-500 bg-green-50 focus:bg-white"
                          : "border-gray-200 bg-gray-50 focus:border-purple-500 focus:bg-white"
                    }`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      validateField("email", e.target.value);
                    }}
                  />
                  {validations.email && (
                    <span className="absolute right-3 top-3 text-green-500">
                      ✓
                    </span>
                  )}
                </div>
                {email && !validations.email && (
                  <p className="text-red-500 text-xs mt-1">E-mail inválido</p>
                )}
              </div>

              {/* Senha input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                      senha && !validations.senha
                        ? "border-red-500 bg-red-50 focus:bg-white"
                        : senha && validations.senha
                          ? "border-green-500 bg-green-50 focus:bg-white"
                          : "border-gray-200 bg-gray-50 focus:border-purple-500 focus:bg-white"
                    }`}
                    value={senha}
                    onChange={(e) => {
                      setSenha(e.target.value);
                      validateField("senha", e.target.value);
                    }}
                  />
                  {validations.senha && (
                    <span className="absolute right-3 top-3 text-green-500">
                      ✓
                    </span>
                  )}
                </div>
              </div>

              {/* Botão de cadastro */}
              <button
                type="submit"
                disabled={
                  loading ||
                  !validations.nome ||
                  !validations.email ||
                  !validations.senha
                }
                className="w-full bg-gradient-to-"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Cadastrando...
                  </>
                ) : (
                  "Criar Conta"
                )}
              </button>
      </form>

      <p className="text-center text-gray-600 text-sm mt-6">
        Já tem uma conta?{" "}
        <Link
          href="/login"
          className=""
        >
          Faça login
        </Link>
      </p>
    </AuthPageShell>
  );
}
