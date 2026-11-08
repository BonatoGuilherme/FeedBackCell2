// Fotos em alta resolução dos aparelhos, via Wikipedia/Wikimedia Commons (grátis, sem chave).
// A miniatura da MobileAPI tem ~160 px; aqui buscamos uma foto de ~960 px do modelo,
// com o crédito e a licença que o Commons exige.
//   1º: imagem principal do artigo da Wikipedia do aparelho (geralmente foto de estúdio);
//   2º: busca de arquivos no Commons, validando o nome do arquivo pelo modelo.
const { pontuar } = require("./correspondenciaNome");

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "FeedBackCELL/1.0 (catalogo de celulares)";
const TIMEOUT_MS = 6000;
const LARGURA = "960"; // a API devolve a miniatura válida mais próxima
const LARGURA_MINIMA = 600;

const HOST_IMAGEM = /^https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\/commons\//;
const HOST_CREDITO = /^https:\/\/commons\.wikimedia\.org\/wiki\//;

async function consultar(api, params) {
  const url = `${api}?${new URLSearchParams({ action: "query", format: "json", formatversion: "2", ...params })}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Wikimedia HTTP ${response.status}`);
  return response.json();
}

function semQuery(url) {
  return typeof url === "string" ? url.split("?")[0] : null;
}

function textoSemHtml(html, max) {
  const limpo = String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z#0-9]+;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return limpo ? limpo.slice(0, max) : null;
}

/** Texto e link de crédito a partir do imageinfo (extmetadata) de um arquivo. */
function credito(info) {
  const autor = textoSemHtml(info?.extmetadata?.Artist?.value, 80);
  const licenca = textoSemHtml(info?.extmetadata?.LicenseShortName?.value, 40);
  return {
    creditoImagem: ["Foto:", autor, licenca ? `· ${licenca}` : null, "· Wikimedia Commons"].filter(Boolean).join(" "),
    creditoImagemUrl: HOST_CREDITO.test(info?.descriptionurl ?? "") ? info.descriptionurl : null,
  };
}

/** Títulos de artigo a tentar para um aparelho, do mais específico para o mais genérico. */
function titulosPara({ fabricante, nome }) {
  if (!nome) return [];
  const comMarca = fabricante && !nome.toLowerCase().startsWith(fabricante.toLowerCase())
    ? `${fabricante} ${nome}`
    : null;
  return [...new Set([comMarca, nome].filter(Boolean))];
}

const chaveDe = (a) => `${a.fabricante ?? ""}|${a.nome}`;

/** 1º: imagem principal do artigo da Wikipedia (todos os aparelhos numa chamada só). */
async function porArtigo(pedidos) {
  const escolhas = new Map(); // chave -> nome do arquivo
  const titulos = [...new Set(pedidos.flatMap((p) => titulosPara(p)))].slice(0, 50);
  if (titulos.length === 0) return escolhas;

  const dados = await consultar(WIKIPEDIA_API, {
    titles: titulos.join("|"),
    redirects: "1",
    prop: "pageimages",
    piprop: "name",
  });
  const q = dados?.query ?? {};
  const destino = new Map([...(q.normalized ?? []), ...(q.redirects ?? [])].map(({ from, to }) => [from, to]));
  const final = (t) => {
    let atual = t;
    for (let i = 0; i < 3 && destino.has(atual); i++) atual = destino.get(atual);
    return atual;
  };
  const paginas = new Map((q.pages ?? []).map((p) => [p.title, p]));

  for (const pedido of pedidos) {
    for (const titulo of titulosPara(pedido)) {
      const pagina = paginas.get(final(titulo));
      // o artigo precisa ser do modelo certo ("Galaxy S24 Ultra" não aceita o artigo do S24)
      if (!pagina?.pageimage || pontuar(pedido.nome, pagina.title) === null) continue;
      escolhas.set(chaveDe(pedido), pagina.pageimage);
      break;
    }
  }
  return escolhas;
}

/** Miniatura em ~960 px e crédito de vários arquivos do Commons numa chamada só. */
async function detalhesArquivos(arquivos) {
  const detalhes = new Map();
  if (arquivos.length === 0) return detalhes;
  const dados = await consultar(WIKIPEDIA_API, {
    titles: arquivos.map((a) => `File:${a}`).join("|"),
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: LARGURA,
    iiextmetadatafilter: "Artist|LicenseShortName",
  });
  const q = dados?.query ?? {};
  const original = new Map((q.normalized ?? []).map(({ from, to }) => [to, from]));
  for (const pagina of q.pages ?? []) {
    const info = pagina.imageinfo?.[0];
    const arquivo = (original.get(pagina.title) ?? pagina.title).replace(/^File:/, "").replace(/ /g, "_");
    const imagemHd = semQuery(info?.thumburl);
    if (!imagemHd || !HOST_IMAGEM.test(imagemHd)) continue;
    detalhes.set(arquivo, { imagemHd, ...credito(info) });
  }
  return detalhes;
}

/** 2º: busca de arquivos no Commons; o nome do arquivo precisa ser do modelo certo. */
async function porBuscaNoCommons(pedido) {
  const dados = await consultar(COMMONS_API, {
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "12",
    gsrsearch: `${titulosPara(pedido)[0]} filetype:bitmap`,
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: LARGURA,
    iiextmetadatafilter: "Artist|LicenseShortName",
  });
  let melhor = null;
  let melhorNota = -Infinity;
  for (const pagina of dados?.query?.pages ?? []) {
    const info = pagina.imageinfo?.[0];
    const imagemHd = semQuery(info?.thumburl);
    if (!imagemHd || !HOST_IMAGEM.test(imagemHd) || (info.width ?? 0) < LARGURA_MINIMA) continue;
    const nomeArquivo = pagina.title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "");
    const nota = pontuar(pedido.nome, nomeArquivo);
    if (nota === null) continue;
    // preferimos retrato (o celular em pé) e fotos da frente do aparelho
    const bonus = (info.height > info.width ? 1 : 0) + (/\bfront\b|frente/i.test(nomeArquivo) ? 1 : 0);
    if (nota + bonus > melhorNota) {
      melhor = { imagemHd, ...credito(info) };
      melhorNota = nota + bonus;
    }
  }
  return melhor;
}

/**
 * Recebe aparelhos `{ fabricante, nome }` e devolve um Map "fabricante|nome" ->
 * `{ imagemHd, creditoImagem, creditoImagemUrl }` só para os que tiverem foto do
 * modelo certo. Nunca lança: sem Wikimedia, o catálogo usa a miniatura da MobileAPI.
 */
async function buscarImagensHd(aparelhos) {
  const resultado = new Map();
  const pedidos = aparelhos.filter((a) => a?.nome);
  if (pedidos.length === 0) return resultado;

  try {
    const artigos = await porArtigo(pedidos);
    const detalhes = await detalhesArquivos([...new Set(artigos.values())]);
    for (const [chave, arquivo] of artigos) {
      if (detalhes.has(arquivo)) resultado.set(chave, detalhes.get(arquivo));
    }
  } catch (error) {
    console.error("Wikipedia (imagens HD) falhou:", error.message);
  }

  const faltando = pedidos.filter((p) => !resultado.has(chaveDe(p)));
  const encontrados = await Promise.all(
    faltando.map((p) =>
      porBuscaNoCommons(p).catch((error) => {
        console.error("Commons (imagens HD) falhou:", error.message);
        return null;
      }),
    ),
  );
  faltando.forEach((p, i) => encontrados[i] && resultado.set(chaveDe(p), encontrados[i]));
  return resultado;
}

module.exports = { buscarImagensHd, titulosPara, HOST_IMAGEM };
