'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const router = useRouter();

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('E-mail é obrigatório');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('E-mail inválido');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!validateEmail(email) || !senha) {
      if (!senha) setErro('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || 'Falha ao fazer login');
      }

      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background com gradiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      {/* Card de login */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header do card */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-12 text-center">
            <h1 className="text-4xl font-bold text-white mb-2">FeedBackCELL</h1>
            <p className="text-blue-100 text-sm">Gerencie seus dispositivos com eficiência</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <form className="space-y-6" onSubmit={handleLogin}>
              {/* Erro geral */}
              {erro && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-red-700 text-sm font-medium">{erro}</p>
                </div>
              )}

              {/* Email input */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                    emailError
                      ? 'border-red-500 bg-red-50 focus:bg-white'
                      : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'
                  }`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    validateEmail(e.target.value);
                  }}
                />
                {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
              </div>

              {/* Senha input */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
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
                  'Entrar'
                )}
              </button>
            </form>

            {/* Link para registro */}
            <p className="text-center text-gray-600 text-sm mt-6">
              Não tem uma conta?{' '}
              <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Crie uma agora
              </Link>
            </p>
          </div>
        </div>

        {/* Mensagem de segurança */}
        <p className="text-center text-white text-xs mt-6 opacity-70">
          🔒 Sua conexão é segura e criptografada
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