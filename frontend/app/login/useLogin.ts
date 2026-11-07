"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifySessionChange } from "@/src/lib/session";

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
      notifySessionChange();
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