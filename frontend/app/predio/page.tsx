import type { Metadata } from "next";
import localFont from "next/font/local";
import { Predio } from "@/components/predio/Predio";
import "../styles/predio-tokens.css";
import "../styles/predio-andares.css";
import "../styles/predio-topo.css";
import "../styles/predio-telas.css";
import "../styles/predio-conteudo.css";
import "../styles/predio-elevador.css";

// fonte de LED dos displays, só nesta rota. Arquivo em app/fonts (subconjunto
// latin do Google Fonts): o build não depende de baixar nada da internet
const dotGothic = localFont({
  src: "../fonts/DotGothic16.woff2",
  weight: "400",
  display: "swap",
  variable: "--font-dotgothic",
});

export const metadata: Metadata = {
  title: "FeedBackCELL · o prédio",
  description: "Fichas, fotos e notas de celulares, num prédio à noite: desça pelos andares.",
};

export default function PaginaPredio() {
  return <Predio className={dotGothic.variable} />;
}
