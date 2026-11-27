import type { Celular } from "@/src/lib/celulares";
import { altFoto } from "@/src/lib/predio/catalogo";
import { cn } from "@/lib/utils";

/** Primeira foto do aparelho; sem foto, o aviso "sem foto". */
export function FotoCelular({ celular, className }: { celular: Celular; className?: string }) {
  const foto = celular.imagens[0];
  if (!foto) {
    return <span className={cn("foto-celular foto-celular--vazia", className)}>sem foto</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- imagem servida pela API
    <img className={cn("foto-celular", className)} src={foto.url} alt={altFoto(celular)} loading="lazy" decoding="async" />
  );
}
