import { redirect } from 'next/navigation';

export default function RootPage() {
  // Aqui você poderia verificar se o usuário já tem um cookie de sessão
  // Por enquanto, redirecionamos sempre para o login como porta de entrada
  redirect('/login');
  
  // Este retorno nunca será renderizado devido ao redirect
  return null;
}