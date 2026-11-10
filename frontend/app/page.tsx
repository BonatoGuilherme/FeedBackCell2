import { ImageIcon, MessageSquare, Search } from "lucide-react";
import HomeHero from "./components/HomeHero";
import HomeStats from "./components/HomeStats";
import PhoneCollection from "./components/PhoneCollection";
import { TiltCard } from "@/components/ui/tilt-card";
import { Reveal, RevealItem } from "@/components/ui/reveal";

const passos = [
  {
    icon: Search,
    numeral: "I",
    titulo: "Digite marca e modelo",
    texto: "Comece pelo nome do aparelho. Sugestões aparecem enquanto você digita.",
  },
  {
    icon: ImageIcon,
    numeral: "II",
    titulo: "O cadastro se completa",
    texto: "Especificações, foto em alta resolução e modelo 3D são buscados para você.",
  },
  {
    icon: MessageSquare,
    numeral: "III",
    titulo: "A comunidade avalia",
    texto: "Quem usa o celular comenta pontos fortes, defeitos e se vale o preço.",
  },
];

export default function RootPage() {
  return (
    <>
      <div className="page-shell home-page">
        <HomeHero />
        <HomeStats />

        <section className="home-steps" aria-labelledby="home-steps-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">O método</p>
              <h2 id="home-steps-title">Como funciona</h2>
            </div>
          </div>
          <Reveal as="ol" className="home-steps__list" stagger={0.1}>
            {passos.map(({ icon: Icon, numeral, titulo, texto }) => (
              <RevealItem as="li" key={titulo}>
                <TiltCard className="home-step card">
                  <span className="home-step__numeral" aria-hidden>
                    {numeral}
                  </span>
                  <span className="home-step__icon">
                    <Icon size={18} strokeWidth={1.8} aria-hidden />
                  </span>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </TiltCard>
              </RevealItem>
            ))}
          </Reveal>
        </section>
      </div>

      <PhoneCollection variant="overview" />
    </>
  );
}
