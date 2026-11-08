"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
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
};

export function PhotoPicker({ value, onChange, max, accept, validate, disabled }: PhotoPickerProps) {
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

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors",
          dragOver ? "border-[#4c5cf5] bg-[#4c5cf5]/[0.06]" : "border-[#d5d8e4] bg-[#fafbfd] hover:border-[#a9b0d6]",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <span className="grid size-11 place-items-center rounded-xl bg-[#4c5cf5]/10 text-[#4c5cf5]">
          <ImagePlus className="size-5" aria-hidden />
        </span>
        <span className="text-sm font-semibold text-[#0f1020]">
          Arraste fotos aqui ou <span className="text-[#4c5cf5] underline underline-offset-2">escolha no computador</span>
        </span>
        <span className="text-xs text-[#5f6378]">
          JPEG, PNG ou WebP · até 5 MB cada · {value.length}/{max} fotos
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

      {aviso && (
        <p role="alert" className="text-[13px] text-[#c2392f]">
          {aviso}
        </p>
      )}

      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4" aria-label="Fotos selecionadas">
          {value.map((foto, i) => (
            <li key={foto.id} className="group relative aspect-square overflow-hidden rounded-xl bg-[#eef0f6] ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
              <img src={foto.preview} alt={`Foto ${i + 1}: ${foto.file.name}`} className="size-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Capa
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(foto.id)}
                disabled={disabled}
                aria-label={`Remover foto ${i + 1}`}
                className="absolute right-1.5 top-1.5 grid size-7 cursor-pointer place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
