"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { fileToDataUrl, imageFiles } from "@/lib/image";
import {
  MAX_RECENT_COLORS,
  loadRecentColors,
  saveRecentColors,
  toHexColor,
} from "@/lib/recent-colors";

export type RichEditorHandle = {
  insertText: (text: string) => void;
};

type Props = {
  value: string;
  onChange: (html: string) => void;
  onOcrPick: (file: File) => void;
  onError: (message: string) => void;
};

const extensions = [
  StarterKit,
  TextStyle,
  Color,
  Image.configure({ allowBase64: true }),
  Placeholder.configure({
    placeholder:
      "Digite seu documento... use títulos (H1/H2/H3), listas com sublists, negrito e itálico. Arraste ou cole imagens; o botão OCR extrai o texto de uma imagem.",
  }),
];

function hasImageFiles(files: FileList | null | undefined): boolean {
  return imageFiles(files).length > 0;
}

function ToolbarButton({
  title,
  active,
  onClick,
  className = "",
  children,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs select-none ${
        active
          ? "bg-zinc-700 text-zinc-50"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function Toolbar({
  editor,
  recentColors,
  onPickColor,
  onApplyColor,
  onPickImage,
  onPickOcr,
}: {
  editor: Editor;
  recentColors: string[];
  onPickColor: (color: string) => void;
  onApplyColor: (color: string) => void;
  onPickImage: () => void;
  onPickOcr: () => void;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      paragraph: e.isActive("paragraph") && !e.isActive("heading"),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      color: toHexColor(e.getAttributes("textStyle").color as string | undefined),
    }),
  });

  const chain = () => {
    editor.view.focus();
    return editor.chain();
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-zinc-700 bg-zinc-900 px-2 py-1">
      <ToolbarButton
        title="Parágrafo"
        active={state.paragraph}
        onClick={() => chain().setParagraph().run()}
      >
        P
      </ToolbarButton>
      <ToolbarButton
        title="Título 1 (H1)"
        active={state.h1}
        onClick={() => chain().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        title="Título 2 (H2)"
        active={state.h2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        title="Título 3 (H3)"
        active={state.h3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-zinc-700" aria-hidden="true" />

      <label
        title="Cor do texto"
        className="relative flex size-7 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-zinc-800"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none size-5 rounded-sm border border-zinc-500"
          style={{ backgroundColor: state.color ?? "#e4e4e7" }}
        />
        <input
          type="color"
          aria-label="Cor do texto"
          value={state.color ?? "#e4e4e7"}
          onChange={(e) => onPickColor(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>

      {recentColors.map((color) => {
        const active = state.color === color;
        return (
          <button
            key={color}
            type="button"
            title={`Aplicar cor ${color}${active ? " (clique para remover)" : ""}`}
            aria-label={`Aplicar cor ${color}`}
            aria-pressed={active}
            onClick={() => onApplyColor(color)}
            style={{ backgroundColor: color }}
            className={`h-5 w-5 shrink-0 rounded-sm border ${
              active ? "border-zinc-100 ring-1 ring-zinc-100" : "border-zinc-600"
            }`}
          />
        );
      })}

      <span className="mx-1 h-5 w-px bg-zinc-700" aria-hidden="true" />

      <ToolbarButton
        title="Negrito (Ctrl+B)"
        active={state.bold}
        className="font-bold"
        onClick={() => chain().toggleBold().run()}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        title="Itálico (Ctrl+I)"
        active={state.italic}
        className="font-serif italic"
        onClick={() => chain().toggleItalic().run()}
      >
        I
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-zinc-700" aria-hidden="true" />

      <ToolbarButton
        title="Lista com marcadores"
        active={state.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      >
        <svg
          viewBox="0 0 16 16"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M6 4h8M6 8h8M6 12h8" />
          <circle cx="3" cy="4" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="3" cy="8" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="3" cy="12" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        title="Lista numerada"
        active={state.orderedList}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <span className="text-[11px] leading-none font-semibold">1.</span>
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-zinc-700" aria-hidden="true" />

      <ToolbarButton
        title="Inserir imagem (também pode arrastar ou colar)"
        active={false}
        onClick={onPickImage}
      >
        <svg
          viewBox="0 0 16 16"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="2" y="3" width="12" height="10" rx="1.5" />
          <circle cx="6" cy="6.5" r="1.2" />
          <path d="M3.5 12l3.2-3.4a1 1 0 0 1 1.4 0l2.4 2.5M10 10.5l1.2-1.2a1 1 0 0 1 1.4 0l1 1" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        title="Extrair texto de uma imagem (OCR)"
        active={false}
        onClick={onPickOcr}
        className="font-semibold"
      >
        OCR
      </ToolbarButton>
    </div>
  );
}

const RichEditor = forwardRef<RichEditorHandle, Props>(function RichEditor(
  { value, onChange, onOcrPick, onError },
  ref,
) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);
  const [recentColors, setRecentColors] = useState<string[]>(loadRecentColors);
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (colorTimer.current) clearTimeout(colorTimer.current);
    },
    [],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value,
    editorProps: {
      handleDrop: (_view, event) => {
        if (!hasImageFiles(event.dataTransfer?.files)) return false;
        event.preventDefault();
        return true;
      },
      handlePaste: (_view, event) => {
        if (!hasImageFiles(event.clipboardData?.files)) return false;
        event.preventDefault();
        return true;
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  const recordColor = (color: string) => {
    const next = [color, ...recentColors.filter((c) => c !== color)].slice(
      0,
      MAX_RECENT_COLORS,
    );
    setRecentColors(next);
    saveRecentColors(next);
  };

  const applyColor = (color: string) => {
    if (!editor || editor.isDestroyed) return;
    const normalized = color.toLowerCase();
    const current = toHexColor(
      editor.getAttributes("textStyle").color as string | undefined,
    );
    editor.view.focus();
    if (current === normalized) {
      editor.chain().unsetColor().run();
    } else {
      editor.chain().setColor(normalized).run();
    }
    recordColor(normalized);
  };

  const pickColor = (color: string) => {
    if (!editor || editor.isDestroyed) return;
    const normalized = color.toLowerCase();
    editor.chain().setColor(normalized).run();
    if (colorTimer.current) clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(() => recordColor(normalized), 700);
  };

  const insertFiles = async (
    files: File[],
    coords: { left: number; top: number } | null,
  ) => {
    if (!editor || editor.isDestroyed) return;
    const pos =
      coords != null
        ? (editor.view.posAtCoords({ left: coords.left, top: coords.top })
            ?.pos ?? null)
        : null;
    let placedFirst = false;
    for (const file of files) {
      try {
        const src = await fileToDataUrl(file);
        if (editor.isDestroyed) return;
        const node = { type: "image", attrs: { src } };
        const chain = editor.chain().focus();
        if (pos != null && !placedFirst) {
          chain.insertContentAt(pos, node);
          placedFirst = true;
        } else {
          chain.insertContent(node);
        }
        chain.run();
      } catch {
        onError(`Não foi possível ler a imagem "${file.name}".`);
      }
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      insertText: (text: string) => {
        if (!editor || editor.isDestroyed || !text) return;
        const nodes: object[] = [];
        text.split("\n").forEach((line, index) => {
          if (index > 0) nodes.push({ type: "hardBreak" });
          if (line) nodes.push({ type: "text", text: line });
        });
        editor.chain().focus().insertContent(nodes).run();
      },
    }),
    [editor],
  );

  if (!editor) {
    return <div className="flex flex-1 bg-zinc-800" />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Toolbar
        editor={editor}
        recentColors={recentColors}
        onPickColor={pickColor}
        onApplyColor={applyColor}
        onPickImage={() => imageInputRef.current?.click()}
        onPickOcr={() => ocrInputRef.current?.click()}
      />
      <div
        className="relative min-h-0 flex-1"
        onDrop={(event) => {
          const files = imageFiles(event.dataTransfer?.files);
          if (files.length === 0) return;
          event.preventDefault();
          void insertFiles(files, {
            left: event.clientX,
            top: event.clientY,
          });
        }}
        onPaste={(event) => {
          const files = imageFiles(event.clipboardData?.files);
          if (files.length === 0) return;
          event.preventDefault();
          void insertFiles(files, null);
        }}
      >
        <EditorContent editor={editor} className="h-full overflow-auto" />
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = imageFiles(event.target.files);
          event.target.value = "";
          if (files.length > 0) void insertFiles(files, null);
        }}
      />
      <input
        ref={ocrInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onOcrPick(file);
        }}
      />
    </div>
  );
});

export default RichEditor;
