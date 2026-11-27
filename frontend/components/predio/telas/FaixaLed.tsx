/**
 * Faixa de LED corrida sob o telão (o "rabisco" do esboço). O texto aparece
 * uma vez para o leitor de tela; a cópia que emenda o loop é decorativa.
 * Com prefers-reduced-motion a faixa para e o texto quebra em linhas.
 */

export function FaixaLed({ texto }: { texto: string }) {
  return (
    <div className="faixa-led">
      <p className="faixa-led__trilho">
        <span className="faixa-led__texto">{texto}</span>
        <span className="faixa-led__texto faixa-led__copia" aria-hidden="true">
          {texto}
        </span>
      </p>
    </div>
  );
}
