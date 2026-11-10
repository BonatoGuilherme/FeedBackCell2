"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, Check, Circle } from "lucide-react";
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
  // depois da primeira tentativa de envio, os campos inválidos ficam marcados
  const [tentou, setTentou] = useState(false);
  const focouInvalido = useRef(false);
  const specs = useSpecsLookup();
  const escolhido = specs.selecionado;
  // a foto da busca (HD quando houver) vira a primeira foto do celular e conta no limite
  const imagemApi = escolhido?.imagemHd ?? escolhido?.imagem ?? null;
  const maxFotos = MAX_FOTOS - (imagemApi ? 1 : 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTentou(true);
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

  const precoValido = preco !== "" && Number.isFinite(Number(preco)) && Number(preco) >= 0;
  const precoFormatado = precoValido ? currency.format(Number(preco)) : "Preço não informado";

  // mesmas regras do envio, mostradas junto de cada campo
  const erroMarca = tentou && marca.trim().length < 2 ? "Informe a marca (mínimo de 2 caracteres)." : "";
  const erroModelo = tentou && modelo.trim().length < 2 ? "Informe o modelo (mínimo de 2 caracteres)." : "";
  const erroPreco = tentou && !precoValido ? "Informe um preço igual ou maior que zero." : "";

  const totalFotos = fotos.length + (imagemApi ? 1 : 0);
  const checklist: [string, boolean][] = [
    ["Marca e modelo", marca.trim().length >= 2 && modelo.trim().length >= 2],
    ["Preço", precoValido],
    ["Especificações", Boolean(escolhido)],
    [totalFotos > 0 ? `${totalFotos} foto${totalFotos > 1 ? "s" : ""}` : "Fotos", totalFotos > 0],
  ];

  return (
    <div className="page-shell new-phone-page">
      <header className="page-heading">
        <div>
          <Link className="back-link" href="/catalog">
            <AppIcon name="chevron-left" size={16} />
            Voltar ao catálogo
          </Link>
          <h1>Adicionar celular</h1>
          <p className="page-heading__description">
            Digite a marca e o modelo: buscamos a foto e as especificações do aparelho para você revisar antes de salvar.
          </p>
        </div>
      </header>

      <div className="new-phone-layout">
        <form
          className="phone-form card"
          onSubmit={handleSubmit}
          onInvalidCapture={(event) => {
            // os erros aparecem embaixo de cada campo; sem o balão do navegador
            // ("Please fill in this field"), só leva o foco ao primeiro inválido
            event.preventDefault();
            if (!focouInvalido.current) {
              focouInvalido.current = true;
              (event.target as HTMLElement).focus();
              requestAnimationFrame(() => (focouInvalido.current = false));
            }
            setTentou(true);
          }}
          aria-busy={loading}
        >
          {erro && (
            <div className="form-alert phone-form__alert" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{erro}</span>
            </div>
          )}

          <FormSection
            id="secao-aparelho"
            title="Aparelho"
            description="A busca começa sozinha quando você digita o modelo."
          >
            <div className="phone-form__row">
              <div className="form-field">
                <label htmlFor="marca">
                  Marca <span className="phone-form__required" aria-hidden="true">*</span>
                </label>
                <input
                  id="marca"
                  name="marca"
                  autoComplete="organization"
                  minLength={2}
                  maxLength={80}
                  placeholder="Ex.: Samsung"
                  required
                  aria-invalid={erroMarca ? true : undefined}
                  aria-describedby={erroMarca ? "marca-erro" : undefined}
                  value={marca}
                  onChange={(event) => setMarca(event.target.value)}
                />
                {erroMarca && <FieldError id="marca-erro">{erroMarca}</FieldError>}
              </div>

              <div className="form-field">
                <label htmlFor="modelo">
                  Modelo <span className="phone-form__required" aria-hidden="true">*</span>
                </label>
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
                  invalido={Boolean(erroModelo)}
                />
                {erroModelo && <FieldError id="modelo-erro">{erroModelo}</FieldError>}
              </div>
            </div>
          </FormSection>

          <FormSection
            id="secao-preco"
            title="Preço e descrição"
            description="O preço aparece no catálogo; a descrição é opcional."
          >
            <div className="form-field phone-form__price">
              <label htmlFor="preco">
                Preço <span className="phone-form__required" aria-hidden="true">*</span>
              </label>
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
                  aria-invalid={erroPreco ? true : undefined}
                  aria-describedby={erroPreco ? "preco-erro" : undefined}
                  value={preco}
                  onChange={(event) => setPreco(event.target.value)}
                />
              </div>
              {erroPreco && <FieldError id="preco-erro">{erroPreco}</FieldError>}
            </div>

            <div className="form-field">
              <div className="phone-form__label-row">
                <label htmlFor="descricao">
                  Descrição <span className="phone-form__optional">opcional</span>
                </label>
                <span className="phone-form__counter" aria-live="polite">
                  {descricao.length}/1000
                </span>
              </div>
              <textarea
                id="descricao"
                name="descricao"
                maxLength={1000}
                placeholder="Estado de conservação, acessórios, detalhes importantes…"
                rows={4}
                aria-describedby="descricao-dica"
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
              />
              <span id="descricao-dica" className="phone-form__hint">
                Escreva o que um comprador precisa saber sobre o aparelho.
              </span>
            </div>
          </FormSection>

          <FormSection
            id="secao-fotos"
            title="Fotos"
            description={
              imagemApi
                ? `A foto encontrada na busca já entra como capa. Você pode adicionar mais ${maxFotos}. As fotos ficam públicas: evite imagens com pessoas, documentos ou localização.`
                : `Até ${MAX_FOTOS} fotos. A primeira vira a capa do anúncio. As fotos ficam públicas: evite imagens com pessoas, documentos ou localização.`
            }
          >
            <PhotoPicker
              value={fotos}
              onChange={setFotos}
              max={maxFotos}
              accept={TIPOS_FOTO}
              validate={validarFoto}
              disabled={loading}
              marcarCapa={!imagemApi}
            />
          </FormSection>

          <FormSection
            id="secao-especificacoes"
            title="Especificações encontradas"
            description="Preenchidas pela busca e salvas junto com o celular."
          >
            <PhoneSpecsResult lookup={specs} />
          </FormSection>

          <div className="phone-form__actions">
            <p className="phone-form__status" role="status" aria-live="polite">
              {loading ? (
                <>
                  <span className="phone-form__status-spinner" aria-hidden="true" />
                  {progresso || "Salvando o celular…"}
                </>
              ) : (
                <span className="phone-form__status-idle">
                  Campos com <span className="phone-form__required">*</span> são obrigatórios.
                </span>
              )}
            </p>
            <div className="phone-form__buttons">
              <Link
                className="button button--secondary"
                href="/catalog"
                aria-disabled={loading || undefined}
                tabIndex={loading ? -1 : undefined}
              >
                Cancelar
              </Link>
              <button className="button button--primary" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="button-spinner" aria-hidden="true" />
                    Salvando…
                  </>
                ) : (
                  <>
                    <AppIcon name="check" size={16} />
                    Salvar celular
                  </>
                )}
              </button>
            </div>
          </div>
          {loading && <div className="phone-form__progress" aria-hidden="true" />}
        </form>

        <aside className="phone-preview card" aria-label="Prévia do cadastro">
          <div className="phone-preview__header">
            <p className="phone-preview__title">Prévia</p>
            <span className="phone-preview__caption">Como aparece no catálogo</span>
          </div>
          <div className="phone-preview__art" aria-hidden="true">
            {imagemApi || fotos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- data: da API ou blob: local
              <img className="phone-preview__photo foto-aparelho" src={imagemApi ?? fotos[0].preview} alt="" />
            ) : (
              <div className="phone-preview__device">
                <span className="phone-preview__speaker" />
                <span className="phone-preview__screen">
                  <AppIcon name="smartphone" size={26} />
                </span>
              </div>
            )}
          </div>
          <div className="phone-preview__details">
            <p className="phone-preview__brand">{marca.trim() || "Marca"}</p>
            <p className="phone-preview__model">{modelo.trim() || "Modelo do celular"}</p>
            <p className={precoValido ? "phone-preview__price" : "phone-preview__price is-empty"}>
              {precoFormatado}
            </p>
            {descricao.trim() && (
              <p className="phone-preview__description">{descricao.trim()}</p>
            )}
          </div>
          <ul className="phone-preview__checklist" aria-label="Progresso do cadastro">
            {checklist.map(([rotulo, ok]) => (
              <li key={rotulo} className={ok ? "is-done" : undefined}>
                {ok ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
                <span>{rotulo}</span>
                <span className="sr-only">{ok ? "concluído" : "pendente"}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function FormSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="phone-form__section" aria-labelledby={id}>
      <header className="phone-form__section-header">
        <h2 id={id}>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="phone-form__section-body">{children}</div>
    </section>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} className="phone-form__error">
      <AlertCircle size={14} aria-hidden="true" />
      {children}
    </span>
  );
}
