// Escolhe, entre resultados "parecidos" de uma API, o aparelho cujo nome
// corresponde de fato ao modelo pedido.

// Palavras que mudam o aparelho: "S24" e "S24 Ultra" são celulares diferentes.
const VARIANTES = new Set([
  "pro", "max", "ultra", "plus", "mini", "lite", "fe", "edge",
  "fold", "flip", "note", "neo", "prime", "power", "play",
]);

// Palavras que não mudam o aparelho (nem penalizam o candidato).
const IRRELEVANTES = new Set([
  "dual", "sim", "5g", "4g", "lte", "global", "version", "edition",
  "smartphone", "phone", "mobile", "model", "3d", "free", "low", "poly",
  "lowpoly", "realistic",
]);

function tokens(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Nota de um candidato, ou null se ele não serve. Ele precisa conter todos os
 * tokens com número ("s24", "15") e todas as variantes pedidas ("pro"); sem
 * nenhum desses na consulta, precisa conter todos os tokens.
 * Com `variantesExtrasPermitidas` falso, rejeita variantes não pedidas.
 * Com `prefixo`, a última palavra pode estar incompleta ("Galaxy S2" casa com "S24"),
 * para o autocomplete.
 */
function pontuar(consulta, candidato, { variantesExtrasPermitidas = false, prefixo = false } = {}) {
  const q = tokens(consulta);
  const c = new Set(tokens(candidato));
  if (q.length === 0 || c.size === 0) return null;

  // com prefixo, troca a última palavra pela palavra do candidato que começa com ela
  if (prefixo) {
    const ultima = q[q.length - 1];
    if (!c.has(ultima)) {
      const completa = [...c].find((t) => t.startsWith(ultima));
      if (!completa) return null;
      q[q.length - 1] = completa;
    }
  }

  const fortes = q.filter((t) => /\d/.test(t) || VARIANTES.has(t));
  const exigidos = fortes.length > 0 ? fortes : q;
  if (!exigidos.every((t) => c.has(t))) return null;

  const pedidos = new Set(q);
  let extras = 0;
  let variantesExtras = 0;
  for (const t of c) {
    if (pedidos.has(t) || IRRELEVANTES.has(t)) continue;
    if (VARIANTES.has(t)) variantesExtras += 1;
    else extras += 1;
  }
  if (variantesExtras > 0 && !variantesExtrasPermitidas) return null;

  const casados = q.filter((t) => c.has(t)).length;
  return casados - extras * 0.5 - variantesExtras * 3;
}

function melhorCandidato(consulta, lista, nomeDe, opcoes) {
  let melhor = null;
  let melhorNota = -Infinity;
  for (const item of lista) {
    const nota = pontuar(consulta, nomeDe(item), opcoes);
    if (nota !== null && nota > melhorNota) {
      melhor = item;
      melhorNota = nota;
    }
  }
  return melhor;
}

/** Os `limite` melhores candidatos, do mais parecido para o menos. */
function rankear(consulta, lista, nomeDe, opcoes, limite) {
  return lista
    .map((item) => ({ item, nota: pontuar(consulta, nomeDe(item), opcoes) }))
    .filter(({ nota }) => nota !== null)
    .sort((a, b) => b.nota - a.nota)
    .slice(0, limite)
    .map(({ item }) => item);
}

module.exports = { pontuar, melhorCandidato, rankear, tokens };
