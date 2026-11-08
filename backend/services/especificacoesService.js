require("../config/loadEnv");
const { melhorCandidato, rankear } = require("./correspondenciaNome");
const { buscarImagensHd } = require("./imagensHdService");

// Especificações + foto: MobileAPI.dev (exige MOBILEAPI_KEY; plano grátis tem cota mensal baixa).
// Modelo 3D: busca pública do Sketchfab (não exige chave), exibido pelo iframe oficial deles.
const MOBILEAPI_URL = "https://api.mobileapi.dev/devices/search/";
const SKETCHFAB_URL = "https://api.sketchfab.com/v3/search";
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 200;
const MAX_SUGESTOES = 8;

// Cache em memória para não gastar a cota da MobileAPI com buscas repetidas.
const cache = new Map();

function lerCache(chave) {
  const item = cache.get(chave);
  if (!item) return null;
  if (Date.now() > item.expiraEm) {
    cache.delete(chave);
    return null;
  }
  return item.valor;
}

function gravarCache(chave, valor) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(chave, { valor, expiraEm: Date.now() + CACHE_TTL_MS });
}

function limparCache() {
  cache.clear();
}

function texto(valor, max = 300) {
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
  if (Array.isArray(valor)) {
    const partes = valor.map((v) => texto(v, max)).filter(Boolean);
    return partes.length ? partes.join(", ").slice(0, max) : null;
  }
  if (typeof valor !== "string") return null;
  const limpo = valor.replace(/\s+/g, " ").trim();
  return limpo ? limpo.slice(0, max) : null;
}

// A MobileAPI copia lixo do site de origem, ex.: "16 GBBuy memory card".
function limparSpec(valor) {
  return valor?.replace(/\s*Buy memory card\b/gi, "").replace(/\s+,/g, ",").trim() || null;
}

// "168.00" -> "168 g"; mantém valores que já trazem unidade ("8.30mm").
function comUnidade(valor, unidade) {
  if (!valor) return null;
  if (!/^\d+(\.\d+)?$/.test(valor)) return valor;
  return `${Number(valor).toLocaleString("pt-BR")} ${unidade}`;
}

function imagemDataUri(b64) {
  if (typeof b64 !== "string" || b64.length < 16) return null;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b64)) return b64;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64)) return null;
  const limpo = b64.replace(/\s+/g, "");
  let mime = null;
  if (limpo.startsWith("/9j/")) mime = "image/jpeg";
  else if (limpo.startsWith("iVBOR")) mime = "image/png";
  else if (limpo.startsWith("UklGR")) mime = "image/webp";
  return mime ? `data:${mime};base64,${limpo}` : null;
}

async function buscarJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    const erro = new Error(`HTTP ${response.status}`);
    erro.status = response.status;
    throw erro;
  }
  return response.json();
}

async function buscarAparelho(marca, modelo) {
  const chave = process.env.MOBILEAPI_KEY;
  if (!chave) return { aparelho: null, sugestoes: [], aviso: "Especificações indisponíveis: MOBILEAPI_KEY não configurada." };

  // limit=50 custa a mesma consulta da cota e dá mais chance de o aparelho certo vir.
  const params = new URLSearchParams({ name: modelo, limit: "50" });
  if (marca) params.set("manufacturer", marca);
  try {
    const dados = await buscarJson(`${MOBILEAPI_URL}?${params}`, { Authorization: `Token ${chave}` });
    const lista = Array.isArray(dados?.devices) ? dados.devices.filter((d) => d && typeof d === "object") : [];
    const nome = (item) => item.name;
    // A API devolve qualquer aparelho da marca com 99%; escolhemos pelo nome.
    const d = melhorCandidato(modelo, lista, nome, { variantesExtrasPermitidas: false });
    // Sugestões do autocomplete: variantes próximas e última palavra incompleta.
    const sugestoes = rankear(modelo, lista, nome, { variantesExtrasPermitidas: true, prefixo: true }, MAX_SUGESTOES)
      .map(normalizarAparelho);
    const aparelho = d ? normalizarAparelho(d) : null;
    await anexarImagensHd([aparelho, ...sugestoes]);
    if (!aparelho) {
      return {
        aparelho: null,
        sugestoes,
        aviso: sugestoes.length ? null : "Não encontramos especificações para esse modelo.",
      };
    }
    return { aparelho, sugestoes, aviso: null };
  } catch (error) {
    console.error("MobileAPI falhou:", error.message);
    const aviso =
      error.status === 429
        ? "Limite de consultas de especificações atingido. Tente mais tarde."
        : "Não foi possível consultar as especificações agora.";
    return { aparelho: null, sugestoes: [], aviso, falhou: true };
  }
}

/**
 * A miniatura da MobileAPI tem ~160 px; acrescenta a foto em alta resolução
 * (Wikimedia) e o crédito dela em cada aparelho que tiver uma.
 */
async function anexarImagensHd(aparelhos) {
  const lista = aparelhos.filter(Boolean);
  const hd = await buscarImagensHd(lista);
  for (const a of lista) {
    const foto = hd.get(`${a.fabricante ?? ""}|${a.nome}`);
    a.imagemHd = foto?.imagemHd ?? null;
    a.creditoImagem = foto?.creditoImagem ?? null;
    a.creditoImagemUrl = foto?.creditoImagemUrl ?? null;
  }
}

/** Aparelho só com nome e foto HD (sem especificações), ou null se não houver foto. */
async function aparelhoSoComFoto(marca, modelo) {
  const aparelho = normalizarAparelho({ name: modelo, manufacturer_name: marca || null });
  await anexarImagensHd([aparelho]);
  return aparelho.imagemHd ? aparelho : null;
}

function normalizarAparelho(d) {
  return {
    nome: texto(d.name, 120),
    fabricante: texto(d.manufacturer_name, 80),
    imagem: imagemDataUri(d.image_b64),
    lancamento: texto(d.release_date, 60),
    tela: texto(d.screen_resolution),
    hardware: texto(d.hardware),
    armazenamento: limparSpec(texto(d.storage)),
    camera: texto(d.camera),
    bateria: texto(d.battery_capacity),
    peso: comUnidade(texto(d.weight, 60), "g"),
    espessura: comUnidade(texto(d.thickness, 60), "mm"),
    cores: texto(d.colors),
  };
}

function escolherThumbnail(thumbnails) {
  const imagens = Array.isArray(thumbnails?.images) ? thumbnails.images : [];
  const validas = imagens.filter(
    (img) => typeof img?.url === "string" && img.url.startsWith("https://") && Number.isFinite(img.width),
  );
  validas.sort((a, b) => Math.abs(a.width - 640) - Math.abs(b.width - 640));
  return validas[0]?.url ?? null;
}

async function buscarModelo3d(marca, modelo) {
  const params = new URLSearchParams({ type: "models", q: `${marca} ${modelo}`.trim(), count: "24" });
  try {
    const dados = await buscarJson(`${SKETCHFAB_URL}?${params}`);
    const lista = (Array.isArray(dados?.results) ? dados.results : []).filter(
      (m) => m && typeof m.uid === "string" && /^[0-9a-f]{32}$/.test(m.uid),
    );
    // Para o 3D aceitamos variante próxima ("S24 Ultra" para "S24") se não houver a exata.
    const m = melhorCandidato(modelo, lista, (item) => item.name, { variantesExtrasPermitidas: true });
    if (!m) return { modelo3d: null, aviso: null };
    return {
      modelo3d: {
        nome: texto(m.name, 120),
        autor: texto(m.user?.displayName, 80),
        embedUrl: `https://sketchfab.com/models/${m.uid}/embed`,
        viewerUrl: `https://sketchfab.com/3d-models/${m.uid}`,
        thumbnail: escolherThumbnail(m.thumbnails),
      },
      aviso: null,
    };
  } catch (error) {
    console.error("Sketchfab falhou:", error.message);
    return { modelo3d: null, aviso: "Não foi possível buscar o modelo 3D agora.", falhou: true };
  }
}

/**
 * Com `somente3d`, não consulta a MobileAPI (sem gastar cota): usado quando a pessoa
 * escolhe outra sugestão e só precisamos do modelo 3D dela.
 */
async function buscarEspecificacoes({ marca = "", modelo, somente3d = false }) {
  const chave = `${somente3d ? "3d" : "full"}|${marca}|${modelo}`.toLowerCase();
  const emCache = lerCache(chave);
  if (emCache) return emCache;

  const [spec, modelo3d] = await Promise.all([
    somente3d ? { aparelho: null, sugestoes: [], aviso: null } : buscarAparelho(marca, modelo),
    buscarModelo3d(marca, modelo),
  ]);
  // Sem nada da MobileAPI (cota, limite por minuto, sem chave ou modelo desconhecido),
  // ainda tentamos a foto em alta resolução do modelo digitado.
  if (!somente3d && !spec.aparelho && spec.sugestoes.length === 0) {
    spec.aparelho = await aparelhoSoComFoto(marca, modelo);
  }
  const resultado = {
    consulta: `${marca} ${modelo}`.trim(),
    aparelho: spec.aparelho,
    sugestoes: spec.sugestoes,
    modelo3d: modelo3d.modelo3d,
    avisos: [spec.aviso, modelo3d.aviso].filter(Boolean),
  };

  // Só guarda quando as duas fontes responderam, para não fixar uma falha temporária.
  if (!spec.falhou && !modelo3d.falhou) gravarCache(chave, resultado);
  return resultado;
}

module.exports = { buscarEspecificacoes, limparCache, imagemDataUri };
