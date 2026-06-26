import type { ReactNode } from 'react';

type AuthPageShellProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
  securityText?: string;
};

export default function AuthPageShell({
  children,
  title,
  subtitle,
  securityText = 'Sua conexão é segura e criptografada',
}: AuthPageShellProps) {
 

  return (
    <>
    <div className="auth-card">
        <div className="auth-card-header">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <div className="auth-card-body">{children}</div>
      </div>

      <p className="auth-security-note">{securityText}</p>
    </>
  );
}
