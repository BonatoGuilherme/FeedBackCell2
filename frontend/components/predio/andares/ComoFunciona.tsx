/** 3 — Como funciona: os três passos de um cadastro. */

import { Andar, Telao } from "../telas/Telao";

const passos = [
  {
    titulo: "Informe marca e modelo",
    texto: "Digite o nome do aparelho. Sugestões aparecem enquanto você escreve.",
  },
  {
    titulo: "Ficha técnica e foto chegam sozinhas",
    texto: "Tela, chip, câmera e bateria são buscados automaticamente, junto com uma foto.",
  },
  {
    titulo: "Quem usa dá a nota de 1 a 5",
    texto: "Quem tem o aparelho comenta e dá a nota. A média aparece no catálogo.",
  },
];

export function ComoFunciona() {
  return (
    <Andar id="como-funciona">
      <Telao id="como-funciona" titulo="Como funciona">
        <ol className="passos">
          {passos.map(({ titulo, texto }, i) => (
            <li key={titulo} className="passo">
              <span className="passo__numero" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="passo__titulo">{titulo}</h3>
              <p className="passo__texto">{texto}</p>
            </li>
          ))}
        </ol>
      </Telao>
    </Andar>
  );
}
