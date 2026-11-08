"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AppIcon from "./AppIcon";
import { ModeloAutocomplete, PhoneSpecsResult, useSpecsLookup } from "./PhoneSpecsLookup";
import {
  MAX_FOTOS,
  TIPOS_FOTO,
  baixarImagemHd,
  criarCelular,
  dataUriParaArquivo,
  enviarFoto,
  validarFoto,
} from "@/src/lib/celulares";
import { PhotoPicker, type PickedPhoto } from "@/components/ui/photo-picker";
import { getToken } from "@/src/lib/session";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function NewPhoneForm() {
  const router = useRouter();
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [preco, setPreco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [fotos, setFotos] = useState<PickedPhoto[]>([]);
  const [progresso, setProgresso] = useState("");
  const specs = useSpecsLookup();
  const escolhido = specs.selecionado;
  // a foto da busca (HD quando houver) vira a primeira foto do celular e conta no limite
  const imagemApi = escolhido?.imagemHd ?? escolhido?.imagem ?? null;
  const maxFotos = MAX_FOTOS - (imagemApi ? 1 : 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    const token = getToken();
    if (!token) {
      setErro("Sua sessão expirou. Entre novamente para cadastrar um celular.");
      return;
    }

    if (marca.trim().length < 2 || modelo.trim().length < 2) {
      setErro("Marca e modelo devem ter pelo menos 2 caracteres.");
      return;
    }

    const precoNumerico = Number(preco);
    if (!Number.isFinite(precoNumerico) || precoNumerico < 0) {
      setErro("Informe um preço válido, igual ou maior que zero.");
      return;
    }

    setLoading(true);
    try {
      let especificacoes = null;
      if (escolhido) {
        const { imagem: _imagem, imagemHd: _imagemHd, ...resto } = escolhido;
        void _imagem;
        void _imagemHd;
        especificacoes = resto;
      }
      const uid3d = specs.modelo3d?.embedUrl.match(/models\/([0-9a-f]{32})\//)?.[1] ?? null;
      const celular = await criarCelular(
        {
          marca: marca.trim(),
          modelo: modelo.trim(),
          preco: precoNumerico,
          descricao: descricao.trim(),
          especificacoes,
          modelo3d: uid3d,
        },
        token,
      );

      const nomeArquivo = modelo.trim() || "celular";
      if (escolhido?.imagemHd) setProgresso("Baixando a foto em alta resolução…");
      const arquivoApi =
        (escolhido?.imagemHd ? await baixarImagemHd(escolhido.imagemHd, nomeArquivo) : null) ??
        (escolhido?.imagem ? dataUriParaArquivo(escolhido.imagem, nomeArquivo) : null);
      const envios = [...(arquivoApi ? [arquivoApi] : []), ...fotos.map((foto) => foto.file).slice(0, maxFotos)];
      const falhas: string[] = [];
      for (const [i, arquivo] of envios.entries()) {
        setProgresso(`Enviando foto ${i + 1} de ${envios.length}…`);
        try {
          await enviarFoto(celular.idcelular, arquivo, token);
        } catch (error: unknown) {
          falhas.push(
            `${arquivo.name}: ${error instanceof Error ? error.message : "falhou"}`,
          );
        }
      }

      if (falhas.length > 0) {
        setFotos([]);
        setErro(
          `O celular foi salvo, mas ${falhas.length} foto(s) não foram enviadas. ${falhas.join(" · ")}`,
        );
        return;
      }

      router.push("/catalog");
      router.refresh();
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o celular.",
      );
    } finally {
      setLoading(false);
      setProgresso("");
    }
  }

  const precoFormatado =
    preco !== "" && Number.isFinite(Number(preco))
      ? currency.format(Number(preco))
      : "Preço não informado";

  return (
    <div className="page-shell new-phone-page">
      <header className="page-heading">
        <div>
          <Link className="back-link" href="/catalog">
            <AppIcon name="chevron-left" size={18} />
            Voltar ao catálogo
          </Link>
          <p className="eyebrow">Catálogo de celulares</p>
          <h1>Adicionar celular</h1>
          <p className="page-heading__description">
            Informe os dados do aparelho para incluí-lo no catálogo.
          </p>
        </div>
      </header>

      <div className="new-phone-layout">
        <form className="phone-form" onSubmit={handleSubmit}>
          <div className="phone-form__heading">
            <span className="form-step">Dados do aparelho</span>
            <p>Os campos com * são obrigatórios.</p>
          </div>

          {erro && (
            <div className="form-alert" role="alert">
              <span>{erro}</span>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="marca">Marca *</label>
            <input
              id="marca"
              name="marca"
              autoComplete="organization"
              minLength={2}
              maxLength={80}
              placeholder="Ex.: Samsung"
              required
              value={marca}
              onChange={(event) => setMarca(event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="modelo">Modelo *</label>
            <ModeloAutocomplete
              lookup={specs}
              marca={marca}
              modelo={modelo}
              onModeloChange={setModelo}
              onEscolher={(aparelho) => {
                if (aparelho.nome) setModelo(aparelho.nome);
                if (aparelho.fabricante) setMarca(aparelho.fabricante);
              }}
              disabled={loading}
            />
          </div>

          <div className="form-field">
            <label htmlFor="preco">Preço (R$) *</label>
            <div className="input-prefix">
              <span aria-hidden="true">R$</span>
              <input
                id="preco"
                name="preco"
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                required
                value={preco}
                onChange={(event) => setPreco(event.target.value)}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="descricao">Descrição</label>
            <textarea
              id="descricao"
              name="descricao"
              maxLength={1000}
              placeholder="Detalhes importantes sobre o aparelho"
              rows={4}
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
            />
            <span className="field-hint">
              {descricao.length}/1000 caracteres
            </span>
          </div>

          <div className="phone-form__photos">
            <span className="phone-form__photos-label">Fotos do aparelho</span>
            <PhotoPicker
              value={fotos}
              onChange={setFotos}
              max={maxFotos}
              accept={TIPOS_FOTO}
              validate={validarFoto}
              disabled={loading}
            />
          </div>

          <div className="phone-form__actions">
            <Link className="button button--secondary" href="/catalog">
              Cancelar
            </Link>
            <button
              className="button button--primary"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="button-spinner" />
                  {progresso || "Salvando…"}
                </>
              ) : (
                <>
                  <AppIcon name="check" size={18} />
                  Salvar celular
                </>
              )}
            </button>
          </div>
        </form>

        <aside className="phone-preview" aria-label="Prévia do cadastro">
          <p className="eyebrow">Prévia</p>
          <div className="phone-preview__art" aria-hidden="true">
            {imagemApi || fotos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- data: da API ou blob: local
              <img className="phone-preview__photo foto-aparelho" src={imagemApi ?? fotos[0].preview} alt="" />
            ) : (
              <div className="phone-preview__device">
                <span className="phone-preview__speaker" />
                <span className="phone-preview__screen">
                  <AppIcon name="smartphone" size={30} />
                </span>
              </div>
            )}
          </div>
          <div className="phone-preview__details">
            <p>{marca.trim() || "Marca do aparelho"}</p>
            <h2>{modelo.trim() || "Modelo do celular"}</h2>
            <span>{precoFormatado}</span>
          </div>
          {descricao.trim() && (
            <p className="phone-preview__description">{descricao.trim()}</p>
          )}
          <PhoneSpecsResult lookup={specs} />
        </aside>
      </div>
    </div>
  );
}
