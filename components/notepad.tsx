"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import TabBar from "@/components/tab-bar";
import Editor from "@/components/editor";
import OcrModal from "@/components/ocr-modal";
import {
  addTab,
  closeTab,
  flushSave,
  getServerSnapshot,
  getSnapshot,
  hydrate,
  insertContentAt,
  renameTab,
  selectTab,
  subscribe,
  updateContent,
} from "@/lib/store";

export default function Notepad() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const caretRef = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    window.addEventListener("beforeunload", flushSave);
    return () => window.removeEventListener("beforeunload", flushSave);
  }, []);

  const activeTab = store?.tabs.find((tab) => tab.id === store.activeTabId) ?? null;

  const downloadTab = useCallback(() => {
    const current = getSnapshot();
    if (!current) return;
    const tab = current.tabs.find((t) => t.id === current.activeTabId);
    if (!tab) return;

    const blob = new Blob([tab.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${tab.title}.txt`;
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

  const handleImage = useCallback((file: File) => {
    const textarea = textareaRef.current;
    caretRef.current = textarea
      ? { start: textarea.selectionStart, end: textarea.selectionEnd }
      : null;
    setPendingImage(file);
  }, []);

  const insertOcrText = useCallback((text: string) => {
    const current = getSnapshot();
    setPendingImage(null);
    if (!current || !text) return;

    const caret = caretRef.current;
    const content = current.tabs.find((t) => t.id === current.activeTabId)?.content ?? "";
    const start = caret ? Math.min(caret.start, content.length) : content.length;
    const end = caret ? Math.min(caret.end, content.length) : start;
    insertContentAt(current.activeTabId, start, end, text);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  if (!store || !activeTab) {
    return (
      <div className="flex size-full flex-col bg-zinc-800">
        <div className="h-10 shrink-0 border-b border-zinc-700 bg-zinc-900" />
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
      />
      <Editor
        value={activeTab.content}
        onChange={updateContent}
        onImage={handleImage}
        textareaRef={textareaRef}
      />
      {pendingImage && (
        <OcrModal
          key={`${pendingImage.name}:${pendingImage.size}:${pendingImage.lastModified}`}
          file={pendingImage}
          onInsert={insertOcrText}
          onClose={() => setPendingImage(null)}
        />
      )}
    </div>
  );
}
