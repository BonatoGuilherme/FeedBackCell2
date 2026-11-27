/**
 * Dados do catálogo para os telões do prédio: uma chamada só a
 * listarCelulares(1, 50), com tempo limite e uma nova tentativa (o core-api no
 * Render pode levar ~1 min para acordar), e as contas feitas em cima dela.
 */
import { listarCelulares, type Celular, type ListaCelulares } from "@/src/lib/celulares";

export const LIMITE_CELULARES = 50;
export const TEMPO_LIMITE_MS = 20_000;
/** 1 tentativa + 1 nova tentativa automática. */
export const TENTATIVAS = 2;

/** Busca a lista com tempo limite por tentativa; `signal` cancela tudo (saída da página). */
export async function buscarCatalogo(signal: AbortSignal): Promise<ListaCelulares> {
  for (let tentativa = 1; ; tentativa++) {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
    const cancelar = () => controle.abort();
    signal.addEventListener("abort", cancelar);
    try {
      return await listarCelulares(1, LIMITE_CELULARES, controle.signal);
    } catch (erro) {
      if (signal.aborted || tentativa >= TENTATIVAS) throw erro;
    } finally {
      clearTimeout(relogio);
      signal.removeEventListener("abort", cancelar);
    }
  }
}

/** Os `quantos` celulares com maior nota (desempate: mais avaliações); só os avaliados. */
export function emDestaque(celulares: Celular[], quantos = 3): Celular[] {
  return celulares
    .filter((c) => c.notaMedia !== null && c.avaliacoes >= 1)
    .sort((a, b) => (b.notaMedia ?? 0) - (a.notaMedia ?? 0) || b.avaliacoes - a.avaliacoes)
    .slice(0, quantos);
}

export type MarcaContada = { marca: string; quantidade: number };

/** Agrupa por marca (sem diferenciar maiúsculas), da mais numerosa para a menos. */
export function contarMarcas(celulares: Celular[]): MarcaContada[] {
  const grupos = new Map<string, MarcaContada>();
  for (const c of celulares) {
    const nome = c.marca.trim();
    if (!nome) continue;
    const chave = nome.toLocaleLowerCase("pt-BR");
    const grupo = grupos.get(chave);
    if (grupo) grupo.quantidade++;
    else grupos.set(chave, { marca: nome, quantidade: 1 });
  }
  return [...grupos.values()].sort(
    (a, b) => b.quantidade - a.quantidade || a.marca.localeCompare(b.marca, "pt-BR"),
  );
}

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "★ 4,0", ou "—" sem nota. */
export function textoNota(celular: Celular): string {
  return celular.notaMedia !== null && celular.avaliacoes > 0 ? `★ ${decimal.format(celular.notaMedia)}` : "—";
}

export function textoAvaliacoes(quantidade: number): string {
  return quantidade === 1 ? "1 avaliação" : `${quantidade.toLocaleString("pt-BR")} avaliações`;
}

export const textoAparelhos = (n: number) => (n === 1 ? "1 aparelho" : `${n.toLocaleString("pt-BR")} aparelhos`);

export const altFoto = (c: Celular) => `Foto do ${c.marca} ${c.modelo}`;
