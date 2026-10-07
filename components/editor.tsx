"use client";

import { useRef, useState, type RefObject } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onImage: (file: File) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

function firstImage(files: FileList | null): File | null {
  if (!files) return null;
  for (const file of Array.from(files)) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

export default function Editor({ value, onChange, onImage, textareaRef }: Props) {
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  return (
    <div className="relative flex-1 overflow-hidden">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => {
          const image = firstImage(e.clipboardData.files);
          if (image) {
            e.preventDefault();
            onImage(image);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const target = e.currentTarget;
            const { selectionStart, selectionEnd } = target;
            const next = `${value.slice(0, selectionStart)}\t${value.slice(selectionEnd)}`;
            onChange(next);
            requestAnimationFrame(() => {
              target.selectionStart = selectionEnd + 1;
              target.selectionEnd = selectionEnd + 1;
            });
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          const image = firstImage(e.dataTransfer.files);
          if (image) onImage(image);
        }}
        spellCheck={false}
        className="absolute inset-0 size-full resize-none bg-zinc-800 p-4 font-mono text-sm leading-6 text-zinc-100 caret-zinc-100 outline-none placeholder:text-zinc-500"
        placeholder="Comece a digitar... ou arraste/cole uma imagem para extrair o texto (OCR)"
      />

      {dragging && (
        <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-teal-400 bg-teal-400/10 text-sm font-medium text-teal-300">
          Solte a imagem para extrair o texto
        </div>
      )}
    </div>
  );
}
