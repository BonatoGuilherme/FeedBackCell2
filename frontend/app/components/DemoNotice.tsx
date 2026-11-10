import { ShieldAlert } from "lucide-react";

type DemoNoticeProps = {
  className?: string;
};

/** Aviso de que o site é uma demonstração de portfólio: nada de dados reais. */
export default function DemoNotice({ className }: DemoNoticeProps) {
  return (
    <p role="note" className={`demo-notice${className ? ` ${className}` : ""}`}>
      <ShieldAlert className="demo-notice__icon" aria-hidden />
      <span>
        <strong className="demo-notice__title">Projeto de demonstração.</strong> Não use dados reais: nada de CPF,
        nome completo, e-mail pessoal ou uma senha que você usa em outro lugar.
      </span>
    </p>
  );
}
