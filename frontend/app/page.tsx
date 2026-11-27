import Link from "next/link";
import HomeHero from "./components/HomeHero";
import HomeStats from "./components/HomeStats";
import HomeCta from "./components/HomeCta";
import PhoneCollection from "./components/PhoneCollection";
import { Reveal, RevealItem } from "@/components/ui/reveal";

// linha de metrô do cadastro: cada estação é um passo
const estacoes = [
  { placa: "Você", tom: "", titulo: "Marca e modelo", texto: "Sugestões aparecem enquanto você digita." },
  { placa: "Automático", tom: "op--cyan", titulo: "Ficha técnica", texto: "Tela, chip, câmera e bateria são buscados." },
  { placa: "Automático", tom: "op--cyan", titulo: "Foto", texto: "Foto do aparelho, ou as que você enviar." },
  { placa: "Comunidade", tom: "op--lime", titulo: "Avaliações", texto: "Quem usa comenta e dá nota de 1 a 5." },
];

export default function RootPage() {
  return (
    <div className="home-page">
      <HomeHero />

      <PhoneCollection variant="overview" />

      <section className="line-sec" aria-labelledby="home-steps-title">
        <div className="page-shell">
          <div className="s-head">
            <h2 id="home-steps-title" className="s-head__title">
              <span className="s-head__jp s-head__jp--cyan" aria-hidden>
                登録受付
              </span>
              Como funciona
            </h2>
            <div className="s-head__aside">
              <p>
                Um cadastro percorre esta linha: você digita o nome do aparelho e o resto vem sozinho. Depois é a vez de
                quem usa.{" "}
                <Link href="/catalogo" className="text-link">
                  Ver os aparelhos
                </Link>
              </p>
            </div>
          </div>

          <Reveal as="ol" className="metro" stagger={0.1}>
            {estacoes.map(({ placa, tom, titulo, texto }, i) => (
              <RevealItem as="li" key={titulo} className={i === 1 ? "metro__st metro__st--train" : "metro__st"}>
                <span className="metro__dot" aria-hidden />
                <span className="metro__lab">
                  <span className={`op ${tom}`}>{placa}</span>
                  <b>{titulo}</b>
                  <span>{texto}</span>
                </span>
              </RevealItem>
            ))}
          </Reveal>

          <HomeStats />
        </div>
      </section>

      <HomeCta />
    </div>
  );
}
