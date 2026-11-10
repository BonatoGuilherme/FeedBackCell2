"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AlertCircle, Box, CheckCircle2, Cpu, Info } from "lucide-react";
import AppIcon from "./AppIcon";
import {
  buscarEspecificacoes,
  type AparelhoEspecificacoes,
  type Modelo3d,
} from "@/src/lib/celulares";
import { getToken } from "@/src/lib/session";

const ROTULOS: [keyof AparelhoEspecificacoes, string][] = [
  ["lancamento", "Lançamento"],
  ["tela", "Tela"],
  ["hardware", "Hardware"],
  ["armazenamento", "Armazenamento"],
  ["camera", "Câmera"],
  ["bateria", "Bateria"],
  ["peso", "Peso"],
  ["espessura", "Espessura"],
  ["cores", "Cores"],
];

export type SpecsLookup = {
  sugestoes: AparelhoEspecificacoes[];
  selecionado: AparelhoEspecificacoes | null;
  modelo3d: Modelo3d | null;
  avisos: string[];
  erro: string;
  loading: boolean;
  /** A lista de sugestões está aberta. */
  aberto: boolean;
  setAberto: (aberto: boolean) => void;
  buscar: (marca: string, modelo: string) => Promise<void>;
  /** Busca automática enquanto digita: filtra a última lista se der, senão consulta a API. */
  refinarOuBuscar: (marca: string, modelo: string) => Promise<void>;
  selecionar: (aparelho: AparelhoEspecificacoes, marca: string) => void;
  limpar: () => void;
};

const lerToken = getToken;

const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\+/g, " plus ").replace(/\s+/g, " ").trim();

/** Cada palavra digitada é começo de alguma palavra do nome ("galaxy s2" casa com "Galaxy S24 Ultra"). */
function casaPrefixo(digitado: string, nome: string | null) {
  const palavras = normalizar(nome ?? "").split(/[^a-z0-9]+/);
  return normalizar(digitado)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .every((p) => palavras.some((w) => w.startsWith(p)));
}

// A busca roda sozinha quando a pessoa para de digitar (e também com Enter/lupa).
// A API de especificações tem cota mensal baixa no plano gratuito, então quando o
// texto só refina a busca anterior filtramos a lista que já temos, sem nova consulta.
export function useSpecsLookup(): SpecsLookup {
  const [sugestoes, setSugestoes] = useState<AparelhoEspecificacoes[]>([]);
  const [selecionado, setSelecionado] = useState<AparelhoEspecificacoes | null>(null);
  const [modelo3d, setModelo3d] = useState<Modelo3d | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [aberto, setAberto] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const modelo3dDe = useRef(""); // nome do aparelho a que o modelo 3D atual pertence
  // última consulta à API (para refinar localmente) e último texto já tratado
  const ultimaConsulta = useRef<{ marca: string; modelo: string; lista: AparelhoEspecificacoes[] } | null>(null);
  const ultimoTexto = useRef("");

  useEffect(() => () => controller.current?.abort(), []);

  const novaRequisicao = () => {
    controller.current?.abort();
    controller.current = new AbortController();
    return controller.current;
  };

  const buscar = useCallback(async (marca: string, modelo: string) => {
    setErro("");
    const token = lerToken();
    if (!token) {
      setErro("Entre novamente para buscar especificações.");
      return;
    }
    const atual = novaRequisicao();
    ultimoTexto.current = `${normalizar(marca)}|${normalizar(modelo)}`;
    setLoading(true);
    try {
      const r = await buscarEspecificacoes(marca, modelo, token, { signal: atual.signal });
      // sem resultado exato, o aparelho escolhido fica a cargo da pessoa
      const lista = r.aparelho && !r.sugestoes.some((s) => s.nome === r.aparelho?.nome)
        ? [r.aparelho, ...r.sugestoes]
        : r.sugestoes;
      ultimaConsulta.current = { marca: normalizar(marca), modelo: normalizar(modelo), lista };
      setSugestoes(lista);
      setSelecionado(r.aparelho);
      setModelo3d(r.modelo3d);
      modelo3dDe.current = r.aparelho?.nome ?? "";
      setAvisos(r.avisos);
      setAberto(lista.length > 1 || (lista.length === 1 && !r.aparelho));
    } catch (error: unknown) {
      if (atual.signal.aborted) return;
      setErro(error instanceof Error ? error.message : "Falha ao buscar especificações.");
    } finally {
      if (controller.current === atual) setLoading(false);
    }
  }, []);

  // busca só o modelo 3D do aparelho escolhido (não gasta a cota da MobileAPI)
  const carregar3d = useCallback((aparelho: AparelhoEspecificacoes, marca: string) => {
    if (!aparelho.nome || aparelho.nome === modelo3dDe.current) return;
    const token = lerToken();
    if (!token) return;
    const atual = novaRequisicao();
    modelo3dDe.current = aparelho.nome;
    setModelo3d(null);
    buscarEspecificacoes(aparelho.fabricante ?? marca, aparelho.nome, token, { signal: atual.signal, somente3d: true })
      .then((r) => setModelo3d(r.modelo3d))
      .catch(() => undefined);
  }, []);

  const selecionar = useCallback((aparelho: AparelhoEspecificacoes, marca: string) => {
    setSelecionado(aparelho);
    setAberto(false);
    // o campo vai receber o nome escolhido: isso não deve disparar nova busca
    ultimoTexto.current = `${normalizar(aparelho.fabricante ?? marca)}|${normalizar(aparelho.nome ?? "")}`;
    carregar3d(aparelho, marca);
  }, [carregar3d]);

  const refinarOuBuscar = useCallback(async (marca: string, modelo: string) => {
    const texto = `${normalizar(marca)}|${normalizar(modelo)}`;
    if (texto === ultimoTexto.current) return;
    const anterior = ultimaConsulta.current;
    if (
      anterior &&
      anterior.lista.length > 0 &&
      anterior.marca === normalizar(marca) &&
      normalizar(modelo).startsWith(anterior.modelo)
    ) {
      const filtrada = anterior.lista.filter((s) => casaPrefixo(modelo, s.nome));
      if (filtrada.length > 0) {
        ultimoTexto.current = texto;
        setSugestoes(filtrada);
        const exato = filtrada.find((s) => normalizar(s.nome ?? "") === normalizar(modelo));
        if (exato) {
          setSelecionado(exato);
          carregar3d(exato, marca);
        }
        setAberto(filtrada.length > 1 || !exato);
        return;
      }
    }
    await buscar(marca, modelo);
  }, [buscar, carregar3d]);

  const limpar = useCallback(() => {
    controller.current?.abort();
    setSelecionado(null);
    setModelo3d(null);
    setAberto(false);
    modelo3dDe.current = "";
  }, []);

  return { sugestoes, selecionado, modelo3d, avisos, erro, loading, aberto, setAberto, buscar, refinarOuBuscar, selecionar, limpar };
}

/**
 * Campo Modelo com autocomplete: busca sozinho 0,7 s depois que a pessoa para de
 * digitar (Enter ou a lupa buscam na hora); setas navegam, Enter escolhe, Esc fecha.
 */
export function ModeloAutocomplete({
  lookup,
  marca,
  modelo,
  onModeloChange,
  onEscolher,
  disabled,
  invalido,
}: {
  lookup: SpecsLookup;
  marca: string;
  modelo: string;
  onModeloChange: (valor: string) => void;
  onEscolher: (aparelho: AparelhoEspecificacoes) => void;
  disabled?: boolean;
  /** Marca o campo como inválido (o erro fica em #modelo-erro). */
  invalido?: boolean;
}) {
  const listaId = useId();
  const dicaId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const { sugestoes, aberto, loading, setAberto } = lookup;
  const pronto = marca.trim().length >= 2 && modelo.trim().length >= 1;
  const { refinarOuBuscar, selecionado } = lookup;

  // busca automática: espera a pessoa parar de digitar
  useEffect(() => {
    if (disabled || selecionado || marca.trim().length < 2 || modelo.trim().length < 2) return;
    const espera = window.setTimeout(() => void refinarOuBuscar(marca, modelo), 700);
    return () => window.clearTimeout(espera);
  }, [marca, modelo, disabled, selecionado, refinarOuBuscar]);

  // item destacado; volta para nenhum quando chega uma lista nova
  const [destaque, setDestaque] = useState({ lista: sugestoes, i: -1 });
  const ativo = destaque.lista === sugestoes ? destaque.i : -1;
  const setAtivo = (proximo: (i: number) => number) =>
    setDestaque({ lista: sugestoes, i: proximo(ativo) });

  // fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [aberto, setAberto]);

  function escolher(aparelho: AparelhoEspecificacoes) {
    lookup.selecionar(aparelho, marca);
    onEscolher(aparelho);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && sugestoes.length) {
      e.preventDefault();
      lookup.setAberto(true);
      setAtivo((i) => (i + 1) % sugestoes.length);
    } else if (e.key === "ArrowUp" && sugestoes.length) {
      e.preventDefault();
      lookup.setAberto(true);
      setAtivo((i) => (i <= 0 ? sugestoes.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault(); // não envia o formulário
      if (aberto && ativo >= 0 && sugestoes[ativo]) escolher(sugestoes[ativo]);
      else if (pronto && !loading) void lookup.buscar(marca, modelo);
    } else if (e.key === "Escape" && aberto) {
      e.preventDefault();
      lookup.setAberto(false);
    }
  }

  const aviso = lookup.erro || lookup.avisos[0];
  let dica: ReactNode;
  let tom = "";
  if (lookup.erro) {
    tom = "is-error";
    dica = <><AlertCircle size={14} aria-hidden="true" />{lookup.erro}</>;
  } else if (aviso) {
    tom = "is-warning";
    dica = <><Info size={14} aria-hidden="true" />{aviso}</>;
  } else if (loading) {
    dica = "Buscando o modelo…";
  } else if (selecionado) {
    tom = "is-success";
    dica = <><CheckCircle2 size={14} aria-hidden="true" />Aparelho encontrado. Confira a foto e as especificações abaixo.</>;
  } else if (pronto) {
    dica = "A busca é automática; escolha o seu aparelho na lista.";
  } else {
    dica = "Preencha marca e modelo: a foto e as especificações aparecem sozinhas.";
  }

  return (
    <div className="modelo-autocomplete" ref={wrapper}>
      <div className="relative">
        <input
          id="modelo"
          name="modelo"
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={aberto && ativo >= 0 ? `${listaId}-${ativo}` : undefined}
          aria-invalid={invalido || undefined}
          aria-describedby={invalido ? `modelo-erro ${dicaId}` : dicaId}
          autoComplete="off"
          minLength={2}
          maxLength={120}
          placeholder="Ex.: Galaxy S24"
          required
          value={modelo}
          onChange={(event) => {
            onModeloChange(event.target.value);
            if (lookup.selecionado) lookup.limpar();
          }}
          onFocus={() => sugestoes.length > 1 && !lookup.selecionado && lookup.setAberto(true)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="absolute right-1 top-1 grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition-colors duration-150 hover:enabled:bg-accent-soft hover:enabled:text-accent disabled:cursor-not-allowed disabled:text-subtle"
          onClick={() => void lookup.buscar(marca, modelo)}
          disabled={disabled || loading || !pronto}
          aria-label="Buscar especificações e imagem"
          title="Buscar especificações e imagem"
        >
          {loading ? <span className="modelo-autocomplete__spinner" aria-hidden="true" /> : <AppIcon name="search" size={16} />}
        </button>
      </div>

      {aberto && sugestoes.length > 0 && (
        <div className="absolute inset-x-0 top-[50px] z-20 overflow-hidden rounded-card border border-line bg-surface shadow-elevation-lg">
          <p className="m-0 border-b border-line px-3 py-2 text-caption font-medium text-muted" aria-hidden="true">
            {sugestoes.length === 1 ? "1 aparelho encontrado" : `${sugestoes.length} aparelhos encontrados`}
          </p>
          <ul id={listaId} role="listbox" className="m-0 max-h-[300px] list-none overflow-y-auto p-1" aria-label="Aparelhos encontrados">
            {sugestoes.map((s, i) => (
              <li
                key={`${s.fabricante}-${s.nome}`}
                id={`${listaId}-${i}`}
                role="option"
                aria-selected={i === ativo}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-subtle aria-selected:bg-accent-soft aria-selected:text-accent"
                onPointerDown={(e) => e.preventDefault()} // mantém o foco no campo
                onClick={() => escolher(s)}
                onMouseEnter={() => setAtivo(() => i)}
              >
                <span className="grid h-11 w-9 flex-none place-items-center overflow-hidden rounded-md bg-surface-soft text-subtle">
                  {s.imagemHd || s.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura data: (leve e instantânea)
                    <img src={s.imagem ?? s.imagemHd ?? undefined} alt="" className="size-full object-contain p-0.5 mix-blend-multiply" />
                  ) : (
                    <AppIcon name="smartphone" size={16} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-medium text-foreground">{s.nome}</strong>
                  <small className="block text-caption text-muted">{[s.fabricante, s.lancamento?.replace(/^Released\s*/i, "")].filter(Boolean).join(" · ")}</small>
                </span>
                <AppIcon name="chevron-right" size={16} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <span id={dicaId} className={`modelo-autocomplete__hint ${tom}`} aria-live="polite">
        {dica}
      </span>
    </div>
  );
}

/** Especificações, foto HD e modelo 3D do aparelho escolhido. */
export function PhoneSpecsResult({ lookup }: { lookup: SpecsLookup }) {
  const [mostrar3d, setMostrar3d] = useState<string | null>(null);
  const { selecionado: aparelho, modelo3d, loading } = lookup;

  if (!aparelho && !modelo3d) {
    return (
      <div id="phone-specs-result" className="flex items-start gap-3 rounded-card border border-dashed border-line-strong p-4" aria-live="polite">
        <span className="grid size-9 flex-none place-items-center rounded-control bg-surface-soft text-muted" aria-hidden="true">
          {loading ? <span className="modelo-autocomplete__spinner" /> : <Cpu size={18} />}
        </span>
        <div>
          <p className="m-0 text-sm font-semibold text-foreground">
            {loading ? "Buscando especificações…" : "Nenhum aparelho escolhido"}
          </p>
          <p className="mt-0.5 mb-0 text-label text-muted">
            Escolha o modelo na lista do campo Modelo para trazer tela, câmera, bateria e a foto do aparelho.
          </p>
        </div>
      </div>
    );
  }

  const specs = aparelho ? ROTULOS.filter(([campo]) => aparelho[campo]) : [];
  const foto = aparelho?.imagemHd ?? aparelho?.imagem ?? null;

  return (
    <section id="phone-specs-result" className="phone-specs" aria-live="polite" aria-label="Especificações encontradas">
      {aparelho && (
        <div className="phone-specs__summary">
          <div className="phone-specs__photo">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto da Wikimedia ou data: da API
              <img className="foto-aparelho" src={foto} alt={`Foto do ${aparelho.nome ?? "aparelho"}`} />
            ) : (
              <AppIcon name="smartphone" size={22} />
            )}
          </div>
          <div className="phone-specs__identity">
            <p className="phone-specs__brand">{aparelho.fabricante ?? "Aparelho"}</p>
            <p className="phone-specs__name">{aparelho.nome}</p>
            <div className="phone-specs__badges">
              <span className="phone-specs__badge is-success">
                <CheckCircle2 size={12} aria-hidden="true" />
                {specs.length} especificações
              </span>
              {aparelho.imagemHd && <span className="phone-specs__badge">Foto em alta resolução</span>}
            </div>
            {aparelho.imagemHd && aparelho.creditoImagem && (
              <p className="phone-specs__credit">
                Foto:{" "}
                {aparelho.creditoImagemUrl ? (
                  <a href={aparelho.creditoImagemUrl} target="_blank" rel="noopener noreferrer">{aparelho.creditoImagem}</a>
                ) : (
                  aparelho.creditoImagem
                )}
              </p>
            )}
          </div>
        </div>
      )}

      {specs.length > 0 && (
        <dl className="phone-specs__list">
          {specs.map(([campo, rotulo]) => (
            <div key={campo}>
              <dt>{rotulo}</dt>
              <dd>{campo === "lancamento" ? aparelho?.[campo]?.replace(/^Released\s*/i, "") : aparelho?.[campo]}</dd>
            </div>
          ))}
        </dl>
      )}

      {modelo3d && (
        <div className="phone-specs__viewer">
          {mostrar3d === modelo3d.embedUrl ? (
            <iframe
              title={`Modelo 3D: ${modelo3d.nome ?? ""}`}
              src={`${modelo3d.embedUrl}?autostart=1&ui_infos=0&ui_watermark_link=0`}
              allow="autoplay; fullscreen; xr-spatial-tracking"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <button type="button" className="phone-specs__poster" onClick={() => setMostrar3d(modelo3d.embedUrl)}>
              {modelo3d.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element -- thumbnail externo do Sketchfab
                <img src={modelo3d.thumbnail} alt="" />
              )}
              <span><Box size={14} aria-hidden="true" />Ver em 3D</span>
            </button>
          )}
          <Credit href={modelo3d.viewerUrl}>
            {modelo3d.nome ?? "Modelo 3D"}
            {modelo3d.autor ? ` · ${modelo3d.autor}` : ""} · Sketchfab
          </Credit>
        </div>
      )}
    </section>
  );
}

function Credit({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="phone-specs__credit" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
