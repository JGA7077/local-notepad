import {
  createInitialStore,
  createTab,
  loadStore,
  saveStore,
  type Store,
} from "./storage";

type Listener = () => void;

const listeners = new Set<Listener>();

let snapshot: Store | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Store | null {
  return snapshot;
}

export function getServerSnapshot(): Store | null {
  return null;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function commit(next: Store) {
  snapshot = next;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (snapshot) saveStore(snapshot);
  }, 400);
  emit();
}

export function hydrate() {
  if (snapshot) return;
  snapshot = loadStore() ?? createInitialStore();
  emit();
}

export function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (snapshot) saveStore(snapshot);
}

export function updateStore(updater: (store: Store) => Store) {
  if (!snapshot) return;
  commit(updater(snapshot));
}

export function addTab() {
  updateStore((prev) => {
    const tab = createTab();
    return { ...prev, tabs: [...prev.tabs, tab], activeTabId: tab.id };
  });
}

export function closeTab(id: string) {
  updateStore((prev) => {
    const index = prev.tabs.findIndex((tab) => tab.id === id);
    if (index === -1) return prev;

    const tabs = prev.tabs.filter((tab) => tab.id !== id);
    if (tabs.length === 0) {
      const tab = createTab();
      return { ...prev, tabs: [tab], activeTabId: tab.id };
    }

    let activeTabId = prev.activeTabId;
    if (activeTabId === id) {
      activeTabId = tabs[Math.min(index, tabs.length - 1)].id;
    }
    return { ...prev, tabs, activeTabId };
  });
}

export function selectTab(id: string) {
  updateStore((prev) => ({ ...prev, activeTabId: id }));
}

export function renameTab(id: string, title: string) {
  updateStore((prev) => ({
    ...prev,
    tabs: prev.tabs.map((tab) =>
      tab.id === id ? { ...tab, title, updatedAt: Date.now() } : tab,
    ),
  }));
}

export function updateContent(content: string) {
  updateStore((prev) => ({
    ...prev,
    tabs: prev.tabs.map((tab) =>
      tab.id === prev.activeTabId ? { ...tab, content, updatedAt: Date.now() } : tab,
    ),
  }));
}

export function insertContentAt(
  id: string,
  start: number,
  end: number,
  text: string,
) {
  updateStore((prev) => ({
    ...prev,
    tabs: prev.tabs.map((tab) => {
      if (tab.id !== id) return tab;
      const before = tab.content.slice(0, start);
      const after = tab.content.slice(end);
      const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
      const suffix = after.length > 0 && !after.startsWith("\n") ? "\n" : "";
      return {
        ...tab,
        content: `${before}${prefix}${text}${suffix}${after}`,
        updatedAt: Date.now(),
      };
    }),
  }));
}
