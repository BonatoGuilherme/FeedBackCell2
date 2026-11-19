import PhoneDetail from "../../components/PhoneDetail";
import { TransicaoPagina } from "@/components/ui/transicoes";

export default async function CelularPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    // a chave por aparelho vale para quem chega por link (catálogo, "mais da marca");
    // as setas do carrossel trocam só a URL e não montam a página de novo
    <TransicaoPagina key={id}>
      <PhoneDetail />
    </TransicaoPagina>
  );
}
