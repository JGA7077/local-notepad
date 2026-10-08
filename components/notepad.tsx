"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import TabBar from "@/components/tab-bar";
import RichEditor, { type RichEditorHandle } from "@/components/rich-editor";
import OcrModal from "@/components/ocr-modal";
import { escapeHtml } from "@/lib/storage";
import { downloadTabAsTxt } from "@/lib/export";
import {
  addTab,
  closeTab,
  flushSave,
  getServerSnapshot,
  getSnapshot,
  hydrate,
  renameTab,
  selectTab,
  subscribe,
  updateContent,
} from "@/lib/store";

export default function Notepad() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const richRef = useRef<RichEditorHandle>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    window.addEventListener("beforeunload", flushSave);
    return () => window.removeEventListener("beforeunload", flushSave);
  }, []);

  useEffect(() => {
    const onSaveError = () =>
      showToast(
        "Não foi possível salvar: armazenamento do navegador cheio. Remova imagens ou abas grandes.",
      );
    window.addEventListener("notepad:save-error", onSaveError);
    return () => window.removeEventListener("notepad:save-error", onSaveError);
  }, [showToast]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const activeTab = store?.tabs.find((tab) => tab.id === store.activeTabId) ?? null;

  const downloadTab = useCallback(() => {
    const current = getSnapshot();
    if (!current) return;
    const tab = current.tabs.find((t) => t.id === current.activeTabId);
    if (!tab) return;

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(tab.title)}</title>
<style>
body { font-family: system-ui, -apple-system, sans-serif; max-width: 46rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #18181b; }
img { max-width: 100%; height: auto; border-radius: 6px; }
ul, ol { padding-left: 1.5rem; }
h1, h2, h3 { line-height: 1.25; }
blockquote { border-left: 3px solid #a1a1aa; padding-left: 0.75rem; color: #52525b; }
pre { background: #f4f4f5; padding: 0.75rem; border-radius: 6px; overflow-x: auto; }
code { background: #f4f4f5; padding: 0.1em 0.3em; border-radius: 4px; }
</style>
</head>
<body>
${tab.content}
</body>
</html>
`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${tab.title}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "t") {
        e.preventDefault();
        addTab();
      } else if (key === "w") {
        e.preventDefault();
        const current = getSnapshot();
        if (current) closeTab(current.activeTabId);
      } else if (key === "s") {
        e.preventDefault();
        downloadTab();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [downloadTab]);

  const insertOcrText = useCallback(
    (text: string) => {
      setPendingImage(null);
      if (text) richRef.current?.insertText(text);
    },
    [],
  );

  if (!store || !activeTab) {
    return (
      <div className="flex size-full flex-col bg-zinc-800">
        <div className="h-10 shrink-0 border-b border-zinc-700 bg-zinc-900" />
        <div className="h-9 shrink-0 border-b border-zinc-700 bg-zinc-900" />
        <div className="flex-1 bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <TabBar
        tabs={store.tabs}
        activeTabId={store.activeTabId}
        onSelect={selectTab}
        onClose={closeTab}
        onRename={renameTab}
        onCreate={addTab}
        onDownload={downloadTabAsTxt}
      />
      <RichEditor
        key={activeTab.id}
        ref={richRef}
        value={activeTab.content}
        onChange={updateContent}
        onOcrPick={setPendingImage}
        onError={showToast}
      />
      {pendingImage && (
        <OcrModal
          key={`${pendingImage.name}:${pendingImage.size}:${pendingImage.lastModified}`}
          file={pendingImage}
          onInsert={insertOcrText}
          onClose={() => setPendingImage(null)}
        />
      )}
      {toast && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-50 max-w-sm rounded-md border border-red-900/60 bg-red-950/95 px-4 py-2 text-sm text-red-200 shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
