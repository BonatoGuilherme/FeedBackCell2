/**
 * Andares do prédio, de cima para baixo. O elevador e as seções usam esta
 * lista: `id` é o id da <section>, `numero` é o que o display mostra.
 * A passarela não tem número e fica fora do elevador.
 */
export type NumeroAndar = "R" | "5" | "4" | "3" | "2" | "1" | "T";

export type Andar = {
  id: string;
  numero: NumeroAndar;
  /** Nome curto, usado no "Ir para <nome>" do elevador. */
  nome: string;
};

export const andares: readonly Andar[] = [
  { id: "topo", numero: "R", nome: "Céu" },
  { id: "destaque", numero: "5", nome: "Em destaque" },
  { id: "catalogo", numero: "4", nome: "Catálogo" },
  { id: "como-funciona", numero: "3", nome: "Como funciona" },
  { id: "marcas", numero: "2", nome: "Parede de marcas" },
  { id: "adicionar", numero: "1", nome: "Adicionar celular" },
  { id: "entrada", numero: "T", nome: "Térreo" },
];

/** Andar pelo id da seção (para os componentes de cada andar). */
export function andar(id: string): Andar {
  const encontrado = andares.find((a) => a.id === id);
  if (!encontrado) throw new Error(`Andar desconhecido: ${id}`);
  return encontrado;
}

/** id do h2 (ou h1) que dá nome à seção. */
export const idTitulo = (id: string) => `${id}-titulo`;
