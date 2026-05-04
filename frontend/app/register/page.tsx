'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [validations, setValidations] = useState({
    nome: false,
    email: false,
    senha: false,
  });
  const [senhaStrength, setSenhaStrength] = useState(0);
  const router = useRouter();

  const validateField = (field: string, value: string) => {
    let isValid = false;

    if (field === 'nome') {
      isValid = value.trim().length >= 3;
    } else if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      isValid = emailRegex.test(value);
    } else if (field === 'senha') {
      isValid = value.length >= 6;
      // Calcular força da senha
      let strength = 0;
      if (value.length >= 6) strength++;
      if (value.length >= 8) strength++;
      if (/[A-Z]/.test(value)) strength++;
      if (/[0-9]/.test(value)) strength++;
      if (/[^A-Za-z0-9]/.test(value)) strength++;
      setSenhaStrength(strength);
    }

    setValidations((prev) => ({ ...prev, [field]: isValid }));
    return isValid;
  };

  const getPasswordStrengthColor = () => {
    if (senhaStrength <= 1) return 'bg-red-500';
    if (senhaStrength <= 2) return 'bg-orange-500';
    if (senhaStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (senhaStrength <= 1) return 'Fraca';
    if (senhaStrength <= 2) return 'Regular';
    if (senhaStrength <= 3) return 'Boa';
    return 'Forte';
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    const nomeValid = validateField('nome', nome);
    const emailValid = validateField('email', email);
    const senhaValid = validateField('senha', senha);

    if (!nomeValid || !emailValid || !senhaValid) {
      setErro('Preencha todos os campos corretamente');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao criar conta');
      }

      router.push('/login?success=true');
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background com gradiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-500 to-green-500"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      {/* Card de registro */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header do card */}
          <div className="bg-gradient-to-r from-purple-600 to-green-500 px-8 py-12 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Criar Conta</h1>
            <p className="text-purple-100 text-sm">Junte-se à comunidade FeedBackCELL</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <form className="space-y-5" onSubmit={handleRegister}>
              {/* Erro geral */}
              {erro && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-red-700 text-sm font-medium">{erro}</p>
                </div>
              )}

              {/* Nome input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Completo</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="João Silva"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                      nome && !validations.nome
                        ? 'border-red-500 bg-red-50 focus:bg-white'
                        : nome && validations.nome
                        ? 'border-green-500 bg-green-50 focus:bg-white'
                        : 'border-gray-200 bg-gray-50 focus:border-purple-500 focus:bg-white'
                    }`}
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      validateField('nome', e.target.value);
                    }}
                  />
                  {validations.nome && (
                    <span className="absolute right-3 top-3 text-green-500">✓</span>
                  )}
                </div>
                {nome && !validations.nome && (
                  <p className="text-red-500 text-xs mt-1">Mínimo 3 caracteres</p>
                )}
              </div>

              {/* Email input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">E-mail</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                      email && !validations.email
                        ? 'border-red-500 bg-red-50 focus:bg-white'
                        : email && validations.email
                        ? 'border-green-500 bg-green-50 focus:bg-white'
                        : 'border-gray-200 bg-gray-50 focus:border-purple-500 focus:bg-white'
                    }`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      validateField('email', e.target.value);
                    }}
                  />
                  {validations.email && (
                    <span className="absolute right-3 top-3 text-green-500">✓</span>
                  )}
                </div>
                {email && !validations.email && (
                  <p className="text-red-500 text-xs mt-1">E-mail inválido</p>
                )}
              </div>

              {/* Senha input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                      senha && !validations.senha
                        ? 'border-red-500 bg-red-50 focus:bg-white'
                        : senha && validations.senha
                        ? 'border-green-500 bg-green-50 focus:bg-white'
                        : 'border-gray-200 bg-gray-50 focus:border-purple-500 focus:bg-white'
                    }`}
                    value={senha}
                    onChange={(e) => {
                      setSenha(e.target.value);
                      validateField('senha', e.target.value);
                    }}
                  />
                  {validations.senha && (
                    <span className="absolute right-3 top-3 text-green-500">✓</span>
                  )}
                </div>

                {/* Indicador de força da senha */}
                {senha && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                          style={{ width: `${(senhaStrength / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-600">
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                  </div>
                )}

                {senha && !validations.senha && (
                  <p className="text-red-500 text-xs mt-1">Mínimo 6 caracteres</p>
                )}
              </div>

              {/* Botão de cadastro */}
              <button
                type="submit"
                disabled={loading || !validations.nome || !validations.email || !validations.senha}
                className="w-full bg-gradient-to-r from-purple-600 to-green-500 text-white font-semibold py-3 rounded-lg hover:from-purple-700 hover:to-green-600 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Cadastrando...
                  </>
                ) : (
                  'Criar Conta'
                )}
              </button>
            </form>

            {/* Link para login */}
            <p className="text-center text-gray-600 text-sm mt-6">
              Já tem uma conta?{' '}
              <Link href="/login" className="font-semibold text-purple-600 hover:text-purple-700 transition-colors">
                Faça login
              </Link>
            </p>
          </div>
        </div>

        {/* Mensagem de segurança */}
        <p className="text-center text-white text-xs mt-6 opacity-70">
          🔒 Seus dados são processados com segurança
        </p>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}