"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, isRecord } from "@/src/lib/http";
import { saveToken } from "@/src/lib/session";

export function useLogin() {
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

  const handleLogin = async (event: { preventDefault: () => void; }) => {
    event.preventDefault();
    setErro("");

    if (!validateEmail(email) || !senha) {
      if (!senha) setErro("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: { email, senha },
      });
      if (!isRecord(data) || typeof data.token !== "string" || !data.token) {
        throw new Error("A API não devolveu o token de acesso.");
      }

      saveToken(data.token);
      router.push("/catalog");
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    senha,
    setSenha,
    erro,
    loading,
    emailError,
    validateEmail,
    handleLogin,
  };
}