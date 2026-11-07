import type { ReactNode } from 'react';
import Link from 'next/link';
import AppIcon from './AppIcon';

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
    <div className="auth-page-shell">
      <Link href="/login" className="auth-brand" aria-label="FeedBackCELL">
        <span className="app-brand__mark" aria-hidden="true">
          <span />
          <span />
        </span>
        <span className="app-brand__name">
          FeedBack<span>CELL</span>
        </span>
      </Link>

      <div className="auth-layout">
        <section className="auth-showcase">
          <p className="eyebrow">Plataforma de celulares</p>
          <h1>Informações e opiniões para escolher seu próximo celular.</h1>
          <p className="auth-showcase__lead">
            Cadastre aparelhos, consulte modelos e reúna comentários em um só lugar.
          </p>

          <div className="auth-product-preview" aria-hidden="true">
            <div className="auth-product-preview__top">
              <span className="auth-product-preview__window-mark" />
              <span />
              <span />
              <span />
            </div>
            <div className="auth-product-preview__body">
              <div className="auth-product-preview__menu">
                <span />
                <span />
                <span />
              </div>
              <div className="auth-product-preview__content">
                <span className="auth-product-preview__heading" />
                <div className="auth-product-preview__cards">
                  <span><AppIcon name="smartphone" size={23} /></span>
                  <span><AppIcon name="smartphone" size={23} /></span>
                  <span><AppIcon name="smartphone" size={23} /></span>
                </div>
                <span className="auth-product-preview__line" />
                <span className="auth-product-preview__line auth-product-preview__line--short" />
              </div>
            </div>
          </div>

          <div className="auth-showcase__caption">
            <span className="auth-showcase__caption-icon">
              <AppIcon name="check" size={15} />
            </span>
            <span>Catálogo de aparelhos e comentários por modelo</span>
          </div>
        </section>

        <section className="auth-form-column" aria-labelledby="auth-form-title">
          <div className="auth-card">
            <div className="auth-card-header">
              <h2 id="auth-form-title">{title}</h2>
              <p>{subtitle}</p>
            </div>

            <div className="auth-card-body">{children}</div>
          </div>

          <p className="auth-security-note">
            <span aria-hidden="true">●</span>
            {securityText}
          </p>
        </section>
      </div>

      <footer className="auth-footer">
        <span>FeedBackCELL</span>
        <span>Plataforma para celulares e feedback</span>
      </footer>
    </div>
  );
}
