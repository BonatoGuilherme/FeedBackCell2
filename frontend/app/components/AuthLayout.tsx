'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navigation from './Navigation';

const publicPaths = ['/login', '/register'];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = typeof window !== 'undefined'
    ? Boolean(window.localStorage.getItem('token'))
    : false;

  useEffect(() => {
    if (!publicPaths.includes(pathname) && !isAuthenticated) {
      router.replace('/login');
    }
  }, [pathname, router, isAuthenticated]);

  const showNavigation = isAuthenticated && !publicPaths.includes(pathname);
  const isPublicPage = publicPaths.includes(pathname);

  return (
    <>
      {showNavigation && <Navigation />}
      <main className={isPublicPage ? 'auth-main' : 'main-content'}>{children}</main>
    </>
  );
}
