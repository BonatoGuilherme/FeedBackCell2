"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthPageShell from "../components/AuthPageShell";
import useRegister from "./useRegister";

export default function RegisterPage() {
 
  const {
    email,
    setEmail,
    senha,
    setSenha,
    erro,
    loading,
    validations,
    handleRegister,
    nome,
    setNome,
  } = useRegister();
    function validateField(arg0: string, value: string) {
      throw new Error("Function not implemented.");
    }

  return (
    <AuthPageShell
      title="Criar Conta"
      subtitle="Junte-se à comunidade FeedBackCELL"
      securityText="Seus dados são processados com segurança"
    >
      <form className="space-y-4" onSubmit={handleRegister}>
              {/* Erro geral */}
              {erro && (
                <div>
                  <p>{erro}</p>
                </div>
              )}

              {/* Nome input */}
              <div>
                <label>
                  Nome Completo
                </label>
                <div>
                  <input
                    type="text"
                    required
                    placeholder="João Silva"
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      validateField("nome", e.target.value);
                    }}
                  />
                  {validations.nome && (
                    <span>✓</span>
                  )}
                </div>
                {nome && !validations.nome && (
                  <p>
                    Mínimo 3 caracteres
                  </p>
                )}
              </div>

              {/* Email input */}
              <div>
                <label>
                  E-mail
                </label>
                <div>
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      validateField("email", e.target.value);
                    }}
                  />
                  {validations.email && (
                    <span>✓</span>
                  )}
                </div>
                {email && !validations.email && (
                  <p>E-mail inválido</p>
                )}
              </div>

              {/* Senha input */}
              <div>
                <label>
                  Senha
                </label>
                <div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => {
                      setSenha(e.target.value);
                      validateField("senha", e.target.value);
                    }}
                  />
                  {validations.senha && (
                    <span>✓</span>
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
              >
                {loading ? (
                  <>
                    Cadastrando...
                  </>
                ) : (
                  "Criar Conta"
                )}
              </button>
      </form>

      <p>
        Já tem uma conta?{" "}
        <Link href="/login">
          Faça login
        </Link>
      </p>
    </AuthPageShell>
  );
}

