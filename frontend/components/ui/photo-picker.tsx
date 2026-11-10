"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { AlertCircle, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PickedPhoto = { id: string; file: File; preview: string };

type PhotoPickerProps = {
  value: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  max: number;
  accept: string[];
  /** Valida cada arquivo; devolve mensagem de erro ou null. */
  validate: (file: File) => string | null;
  disabled?: boolean;
  /** Mostra o selo "Capa" na primeira foto (desligue quando a capa vem de outro lugar). */
  marcarCapa?: boolean;
};

export function PhotoPicker({ value, onChange, max, accept, validate, disabled, marcarCapa = true }: PhotoPickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [aviso, setAviso] = useState("");

  // libera as URLs de prévia quando o componente sai da tela
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  useEffect(() => () => latest.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  function add(files: FileList | File[]) {
    const erros: string[] = [];
    const novas: PickedPhoto[] = [];
    for (const file of Array.from(files)) {
      if (value.length + novas.length >= max) {
        erros.push(`Limite de ${max} fotos atingido.`);
        break;
      }
      const erro = validate(file);
      if (erro) {
        erros.push(erro);
        continue;
      }
      novas.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) });
    }
    setAviso(erros.join(" "));
    if (novas.length) onChange([...value, ...novas]);
  }

  function remove(id: string) {
    const foto = value.find((p) => p.id === id);
    if (foto) URL.revokeObjectURL(foto.preview);
    onChange(value.filter((p) => p.id !== id));
  }

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) add(e.dataTransfer.files);
  };

  const cheio = value.length >= max;

  return (
    <div className="grid gap-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-card border border-dashed border-line-strong bg-surface-soft/60 px-6 py-8 text-center transition-colors duration-150 hover:border-accent/60 hover:bg-accent-soft/50",
          dragOver && "border-accent bg-accent-soft ring-4 ring-accent/15",
          disabled && "pointer-events-none opacity-55",
          cheio && "opacity-70",
        )}
      >
        <span className="mb-1.5 grid size-10 place-items-center rounded-control border border-line bg-surface text-accent shadow-elevation-sm">
          <ImagePlus className="size-5" aria-hidden />
        </span>
        <span className="text-label font-medium text-foreground">
          {dragOver ? "Solte para adicionar" : (
            <>Arraste as fotos aqui ou <span className="text-accent underline-offset-2 group-hover:underline">escolha no computador</span></>
          )}
        </span>
        <span className="text-caption text-muted">
          JPEG, PNG ou WebP · até 5 MB cada
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept.join(",")}
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <div className="flex items-center gap-3">
        <span className="flex-none text-caption tabular-nums text-muted" aria-live="polite">
          {value.length} de {max} {max === 1 ? "foto" : "fotos"}
        </span>
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-soft" aria-hidden="true">
          <span className="block h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${max > 0 ? Math.min(100, (value.length / max) * 100) : 100}%` }} />
        </span>
      </div>

      {aviso && (
        <p role="alert" className="flex items-start gap-1.5 text-caption font-medium text-error">
          <AlertCircle className="mt-px size-3.5 flex-none" aria-hidden />
          {aviso}
        </p>
      )}

      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5" aria-label="Fotos selecionadas">
          {value.map((foto, i) => (
            <li key={foto.id} className="group relative aspect-square overflow-hidden rounded-control border border-line bg-surface-soft">
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
              <img src={foto.preview} alt={`Foto ${i + 1}: ${foto.file.name}`} className="size-full object-cover" />
              {i === 0 && marcarCapa && <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ink/75 px-1.5 py-0.5 text-[11px] font-medium text-white">Capa</span>}
              <button
                type="button"
                onClick={() => remove(foto.id)}
                disabled={disabled}
                aria-label={`Remover foto ${i + 1}`}
                className="absolute right-1.5 top-1.5 grid size-7 cursor-pointer place-items-center rounded-full border border-line bg-surface text-foreground shadow-elevation-sm transition-colors hover:bg-error-soft hover:text-error"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
