"use client";

import { useEffect, useRef, useState } from "react";
import type { Tab } from "@/lib/storage";

type Props = {
  tabs: Tab[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onCreate: () => void;
};

export default function TabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onRename,
  onCreate,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingId]);

  const startRename = (tab: Tab) => {
    setEditingId(tab.id);
    setDraft(tab.title);
  };

  const commitRename = () => {
    if (editingId) {
      onRename(editingId, draft.trim() || "Sem título");
      setEditingId(null);
    }
  };

  return (
    <div className="flex min-h-10 shrink-0 items-end gap-px overflow-x-auto border-b border-zinc-700 bg-zinc-900 px-1 pt-1">
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={active}
            tabIndex={0}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(tab.id);
              }
            }}
            onDoubleClick={() => startRename(tab)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                onClose(tab.id);
              }
            }}
            className={`group flex h-9 min-w-32 max-w-52 cursor-default items-center gap-2 rounded-t-md border px-3 text-sm select-none ${
              active
                ? "border-zinc-700 border-b-zinc-800 bg-zinc-800 text-zinc-100"
                : "border-transparent bg-zinc-900 text-zinc-400 hover:bg-zinc-800/60"
            }`}
          >
            {editingId === tab.id ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="w-full min-w-0 rounded-sm bg-zinc-700 px-1 text-zinc-100 outline-none"
              />
            ) : (
              <>
                <span className="truncate">{tab.title}</span>
                <button
                  type="button"
                  aria-label={`Fechar ${tab.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.id);
                  }}
                  className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-sm text-zinc-400 opacity-0 hover:bg-zinc-700 hover:text-zinc-100 group-hover:opacity-100"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </>
            )}
          </div>
        );
      })}

      <button
        type="button"
        aria-label="Nova aba (Ctrl+T)"
        title="Nova aba (Ctrl+T)"
        onClick={onCreate}
        className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 3.5v9M3.5 8h9" />
        </svg>
      </button>
    </div>
  );
}
