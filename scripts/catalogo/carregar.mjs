#!/usr/bin/env node
/**
 * Carrega o catálogo de celulares (scripts/catalogo/catalogo.json) na API do FeedBackCELL.
 *
 * Requer Node 20+ (fetch nativo), sem dependências. Variáveis de ambiente (nada de senha no código):
 *   API_URL        ex.: https://feedbackcell2-1.onrender.com
 *   ADMIN_EMAIL    conta dona dos celulares (a mesma que cadastrou os ids 1, 2 e 3)
 *   ADMIN_SENHA
 *   EXEMPLO_EMAIL  conta "Avaliação de exemplo" (criada se não existir)
 *   EXEMPLO_SENHA
 *
 * Como rodar (PowerShell: $env:API_URL="..."; no bash: export API_URL=...):
 *   node scripts/catalogo/carregar.mjs                    # dry-run: só mostra o que faria, não escreve nada
 *   node scripts/catalogo/carregar.mjs --aplicar          # cadastra celulares, fotos e avaliações
 *   node scripts/catalogo/carregar.mjs --aplicar --apagar-antigos   # também remove os ids 1, 2 e 3
 *   node scripts/catalogo/carregar.mjs --aplicar --sem-ilustracoes  # não envia os desenhos vetoriais (iPhones)
 *
 * Pode rodar de novo sem duplicar: celular com mesma marca+modelo é pulado, foto só é enviada se o celular
 * ainda não tem nenhuma, e avaliação só é publicada se o mesmo texto ainda não existe no celular.
 * Para no primeiro erro. O limite da API é 100 requisições/minuto por IP; o script espaça as chamadas.
 * O dry-run só faz leituras públicas (GET /celulares) e não precisa de login.
 */
import { readFile } from "node:fs/promises";

const PAUSA_MS = 1500; // entre chamadas à API
const PAUSA_COMMONS_MS = 4000; // entre downloads do Wikimedia Commons
const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const UA = "FeedBackCELL-catalogo/1.0 (carga do catalogo do projeto; contato via repositorio no GitHub)";

const args = new Set(process.argv.slice(2));
const APLICAR = args.has("--aplicar");
const APAGAR = args.has("--apagar-antigos");
const SEM_ILUSTRACOES = args.has("--sem-ilustracoes");

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(m);
function falhar(msg) {
  console.error(`\nERRO: ${msg}`);
  process.exit(1);
}
function env(nome, obrigatoria) {
  const v = process.env[nome];
  if (!v && obrigatoria) falhar(`defina a variável de ambiente ${nome}.`);
  return v || "";
}

const API = env("API_URL", true).replace(/\/+$/, "");

/** Chamada à API; devolve {status, corpo}. Erros de rede e 429/5xx viram mensagem clara. */
async function api(metodo, caminho, { token, json, bruto, tipo } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (bruto) {
    headers["Content-Type"] = tipo;
    body = bruto;
  }
  await dormir(PAUSA_MS);
  let res;
  try {
    res = await fetch(API + caminho, { method: metodo, headers, body });
  } catch (e) {
    falhar(`sem resposta de ${API} (${metodo} ${caminho}): ${e.message}. O Render grátis pode estar acordando; tente de novo.`);
  }
  if (res.status === 429) falhar(`limite de requisições da API atingido (429) em ${metodo} ${caminho}. Espere 1 minuto e rode de novo.`);
  const texto = await res.text();
  let corpo = null;
  try {
    corpo = texto ? JSON.parse(texto) : null;
  } catch {
    corpo = { bruto: texto.slice(0, 200) };
  }
  return { status: res.status, corpo };
}

function esperar(res, okStatus, o_que) {
  if (!okStatus.includes(res.status)) {
    falhar(`${o_que} falhou (HTTP ${res.status}): ${JSON.stringify(res.corpo)}`);
  }
  return res.corpo;
}

async function login(email, senha, quem) {
  const r = esperar(await api("POST", "/auth/login", { json: { email, senha } }), [200], `login de ${quem}`);
  return r.token;
}

/** Todos os celulares existentes (leitura pública, paginada). */
async function listarCelulares() {
  const todos = [];
  for (let page = 1; ; page++) {
    const r = esperar(await api("GET", `/celulares?page=${page}&limit=50`), [200], "listar celulares");
    todos.push(...r.celulares);
    if (r.celulares.length < 50 || todos.length >= (r.paginacao?.total ?? Infinity)) break;
  }
  return todos;
}

const chave = (marca, modelo) => `${marca}|${modelo}`.toLowerCase().replace(/\s+/g, " ").trim();

/** Baixa a foto do Commons (miniatura PNG/JPEG de até 1200 px, nunca o original, que passa de 5 MB). */
async function baixarFoto(f) {
  const nome = encodeURIComponent(f.arquivo);
  for (const largura of [1200, 800, 500]) {
    await dormir(PAUSA_COMMONS_MS);
    const url = `https://commons.wikimedia.org/wiki/Special:Redirect/file/${nome}?width=${largura}`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (res.status === 429) falhar("o Wikimedia Commons pediu para esperar (429). Rode de novo em alguns minutos.");
    if (!res.ok) falhar(`não consegui baixar ${f.arquivo} do Commons (HTTP ${res.status}).`);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      falhar(`${f.arquivo}: tipo inesperado "${mime}" (a API aceita JPEG, PNG ou WebP).`);
    }
    if (buf.length <= MAX_FOTO_BYTES) return { buf, mime };
  }
  falhar(`${f.arquivo} continua acima de 5 MB mesmo reduzida.`);
}

async function main() {
  const catalogo = JSON.parse(await readFile(new URL("./catalogo.json", import.meta.url), "utf8"));
  log(`Modo: ${APLICAR ? "APLICAR (escreve em " + API + ")" : "DRY-RUN (não escreve nada)"}  |  API: ${API}`);

  const existentes = await listarCelulares();
  const porChave = new Map(existentes.map((c) => [chave(c.marca, c.modelo), c]));
  log(`A API tem ${existentes.length} celular(es) hoje.\n`);

  let tokenAdmin = null;
  let tokenExemplo = null;
  if (APLICAR) {
    tokenAdmin = await login(env("ADMIN_EMAIL", true), env("ADMIN_SENHA", true), "admin");
    log("Login do admin OK.");
  }

  // 1) celulares + fotos
  const ids = new Map(); // chave -> idcelular
  for (const c of catalogo.celulares) {
    const k = chave(c.marca, c.modelo);
    const rotulo = `${c.marca} ${c.modelo}`;
    const foto = c.foto && !(SEM_ILUSTRACOES && c.foto.tipo === "ilustracao") ? c.foto : null;
    let existente = porChave.get(k);
    if (existente) {
      log(`= ${rotulo}: já existe (id ${existente.idcelular}), pulando cadastro.`);
      ids.set(k, existente.idcelular);
    } else if (!APLICAR) {
      log(`+ ${rotulo}: seria cadastrado${foto ? ` com foto (${foto.tipo}: ${foto.arquivo}, ${foto.autor}, ${foto.licenca})` : " sem foto"}.`);
      continue;
    } else {
      const corpo = { marca: c.marca, modelo: c.modelo, descricao: c.descricao || "", especificacoes: c.especificacoes };
      const r = esperar(await api("POST", "/celulares", { token: tokenAdmin, json: corpo }), [201], `cadastro de ${rotulo}`);
      existente = { idcelular: r.celular.idcelular, imagens: [] };
      ids.set(k, existente.idcelular);
      log(`+ ${rotulo}: cadastrado (id ${existente.idcelular}).`);
    }
    if (!foto) continue;
    if ((existente.imagens || []).length > 0) {
      log(`    foto: o celular já tem ${existente.imagens.length}, não envio outra.`);
      continue;
    }
    if (!APLICAR) {
      log(`    foto (dry-run): enviaria ${foto.arquivo}.`);
      continue;
    }
    const { buf, mime } = await baixarFoto(foto);
    esperar(
      await api("POST", `/celulares/${existente.idcelular}/imagens`, { token: tokenAdmin, bruto: buf, tipo: mime }),
      [201],
      `envio da foto de ${rotulo}`,
    );
    log(`    foto enviada (${(buf.length / 1024).toFixed(0)} KB, ${mime}).`);
  }

  // 2) avaliações de exemplo
  log("");
  const nomeConta = catalogo.contaExemplo.nome;
  if (APLICAR) {
    const email = env("EXEMPLO_EMAIL", true);
    const senha = env("EXEMPLO_SENHA", true);
    const reg = await api("POST", "/auth/register", { json: { nome: nomeConta, email, senha } });
    if (reg.status === 201) log(`Conta "${nomeConta}" criada.`);
    else if (reg.status !== 409) esperar(reg, [201], `criação da conta "${nomeConta}"`);
    tokenExemplo = await login(email, senha, `"${nomeConta}"`);
  }
  for (const a of catalogo.avaliacoes) {
    const rotulo = `${a.marca} ${a.modelo}`;
    const id = ids.get(chave(a.marca, a.modelo));
    if (!APLICAR || !id) {
      log(`+ avaliação ${a.nota}/5 em ${rotulo}: ${APLICAR ? "celular não encontrado, pulando" : "seria publicada"} (${a.texto.length} caracteres).`);
      continue;
    }
    const lista = esperar(await api("GET", `/comentarios/${id}?limit=50`), [200], `ler avaliações de ${rotulo}`);
    if (lista.comentarios.some((x) => x.texto === a.texto)) {
      log(`= avaliação em ${rotulo}: já publicada, pulando.`);
      continue;
    }
    esperar(
      await api("POST", `/comentarios/${id}`, { token: tokenExemplo, json: { texto: a.texto, nota: a.nota } }),
      [201],
      `avaliação de ${rotulo}`,
    );
    log(`+ avaliação ${a.nota}/5 publicada em ${rotulo}.`);
  }

  // 3) apagar os antigos (só com --apagar-antigos)
  log("");
  if (!APAGAR) {
    log(`Celulares antigos (ids ${catalogo.apagarAntigos.map((x) => x.id).join(", ")}) mantidos. Use --apagar-antigos com --aplicar para removê-los.`);
  } else {
    for (const velho of catalogo.apagarAntigos) {
      const atual = existentes.find((c) => c.idcelular === velho.id);
      if (!atual) {
        log(`= id ${velho.id}: não existe mais.`);
      } else if (atual.marca.toLowerCase() !== velho.marca.toLowerCase()) {
        falhar(`id ${velho.id} agora é "${atual.marca} ${atual.modelo}", não o celular de teste esperado; não apago.`);
      } else if (!APLICAR) {
        log(`- id ${velho.id} (${atual.marca} ${atual.modelo}): seria removido.`);
      } else {
        esperar(await api("DELETE", `/celulares/${velho.id}`, { token: tokenAdmin }), [200], `exclusão do id ${velho.id}`);
        log(`- id ${velho.id} (${atual.marca} ${atual.modelo}) removido.`);
      }
    }
  }
  log(APLICAR ? "\nPronto." : "\nDry-run concluído: nada foi escrito. Rode com --aplicar para valer.");
}

main().catch((e) => falhar(e.stack || String(e)));
