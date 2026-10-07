"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { OcrProgress } from "@/lib/ocr";

type Props = {
  file: File;
  onInsert: (text: string) => void;
  onClose: () => void;
};

type Phase = "idle" | "running" | "error";

export default function OcrModal({ file, onInsert, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<OcrProgress>({ status: "", progress: 0 });
  const [error, setError] = useState("");
  const cancelled = useRef(false);

  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const run = async () => {
    setPhase("running");
    setError("");
    setProgress({ status: "", progress: 0 });
    try {
      const { extractText, statusLabel } = await import("@/lib/ocr");
      const text = await extractText(file, (p) =>
        setProgress({ ...p, status: statusLabel(p.status) }),
      );
      if (cancelled.current) return;
      onInsert(text.trim());
    } catch (err) {
      if (cancelled.current) return;
      setPhase("error");
      setError(err instanceof Error ? err.message : "Falha ao processar a imagem.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Extrair texto da imagem"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <h2 className="mb-3 text-base font-semibold text-zinc-100">
          Extrair texto da imagem
        </h2>

        <div className="mb-4 flex max-h-56 items-center justify-center overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Pré-visualização da imagem colada"
              className="max-h-56 w-auto object-contain"
            />
          )}
        </div>

        {phase === "running" && (
          <div className="mb-4">
            <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
              <span>{progress.status || "Preparando..."}</span>
              <span>{Math.round(progress.progress * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
              <div
                className="h-full rounded-full bg-teal-500 transition-[width] duration-200"
                style={{ width: `${Math.round(progress.progress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {phase === "error" && (
          <p className="mb-4 rounded-lg border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            {phase === "running" ? "Cancelar" : "Fechar"}
          </button>
          <button
            type="button"
            onClick={run}
            disabled={phase === "running"}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
          >
            {phase === "error" ? "Tentar novamente" : "Extrair texto"}
          </button>
        </div>
      </div>
    </div>
  );
}
