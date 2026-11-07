import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function useRegister() {
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

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
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

  return {
    email,
    setEmail,
    senha,
    setSenha,
    erro,
    loading,
    validations,
    validateField,
    handleRegister,
    nome,
    setNome,
  };
}
