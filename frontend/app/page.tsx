import Link from "next/link";
import { ArrowRight, Box, Check, ImageIcon, MessageSquare, Plus, Search } from "lucide-react";
import PhoneCollection from "./components/PhoneCollection";

const passos = [
  {
    icon: Search,
    titulo: "Digite marca e modelo",
    texto: "Comece pelo nome do aparelho. Sugestões aparecem enquanto você digita.",
  },
  {
    icon: ImageIcon,
    titulo: "O cadastro se completa",
    texto: "Especificações, foto em alta resolução e modelo 3D são buscados para você.",
  },
  {
    icon: MessageSquare,
    titulo: "A comunidade avalia",
    texto: "Quem usa o celular comenta pontos fortes, defeitos e se vale o preço.",
  },
];

const specsExemplo = [
  ["Tela", "6,2\" OLED, 120 Hz"],
  ["Processador", "Google Tensor G3"],
  ["Câmera", "50 MP + 12 MP"],
  ["Bateria", "4.575 mAh"],
];

/** Prévia ilustrativa do cadastro automático (decorativa, os dados são um exemplo). */
function PreviaCadastro() {
  return (
    <div className="home-preview" aria-hidden="true">
      <div className="home-preview__bar">
        <span className="home-preview__dots">
          <i />
          <i />
          <i />
        </span>
        <span>Novo celular</span>
      </div>

      <div className="home-preview__body">
        <div className="home-preview__query">
          <Search size={16} strokeWidth={1.8} />
          <span>Google Pixel 8</span>
          <span className="home-preview__found">
            <Check size={13} strokeWidth={2.4} />
            Encontrado
          </span>
        </div>

        <div className="home-preview__result">
          <div className="home-preview__device">
            <span className="home-preview__phone">
              <span />
            </span>
          </div>
          <dl className="home-preview__specs">
            {specsExemplo.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="home-preview__tags">
          <span>
            <ImageIcon size={14} strokeWidth={1.8} />
            Foto em alta
          </span>
          <span>
            <Box size={14} strokeWidth={1.8} />
            Modelo 3D
          </span>
          <span>
            <Check size={14} strokeWidth={2} />
            11 campos preenchidos
          </span>
        </div>

        <div className="home-preview__comment">
          <span className="home-preview__avatar">MR</span>
          <div>
            <p className="home-preview__author">
              Marina R. <span>· há 2 dias</span>
            </p>
            <p>A câmera noturna é a melhor que já usei. A bateria aguenta o dia inteiro.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RootPage() {
  return (
    <>
      <div className="page-shell home-page">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero__copy">
            <p className="home-hero__eyebrow">Catálogo colaborativo de celulares</p>
            <h1 id="home-title">O catálogo de celulares que se preenche sozinho.</h1>
            <p className="home-hero__lead">
              Informe marca e modelo e o FeedBackCELL completa as especificações, a foto em alta
              resolução e o modelo 3D. Depois, quem usa o aparelho conta o que achou.
            </p>
            <div className="home-hero__actions">
              <Link className="button button--primary home-hero__cta" href="/catalog">
                Ver o catálogo
                <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
              </Link>
              <Link className="button button--secondary home-hero__cta" href="/items/new">
                <Plus size={17} strokeWidth={1.8} aria-hidden="true" />
                Adicionar celular
              </Link>
            </div>
          </div>
          <PreviaCadastro />
        </section>

        <section className="home-steps" aria-labelledby="home-steps-title">
          <h2 id="home-steps-title" className="sr-only">
            Como funciona
          </h2>
          <ol>
            {passos.map(({ icon: Icon, titulo, texto }, indice) => (
              <li key={titulo}>
                <span className="home-steps__icon">
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div>
                  <p className="home-steps__index">Passo {indice + 1}</p>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <PhoneCollection variant="overview" />
    </>
  );
}
