import type { Metadata } from "next";
import { DotGothic16 } from "next/font/google";
import { Predio } from "@/components/predio/Predio";
import "../styles/predio-tokens.css";
import "../styles/predio-andares.css";
import "../styles/predio-telas.css";
import "../styles/predio-conteudo.css";
import "../styles/predio-elevador.css";

// fonte de LED dos displays, só nesta rota (o next/font hospeda o arquivo no próprio site)
const dotGothic = DotGothic16({
  weight: "400",
  subsets: ["latin"],
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
