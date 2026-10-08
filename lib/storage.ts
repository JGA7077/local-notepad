export type Tab = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

export type Store = {
  version: 1;
  activeTabId: string;
  tabs: Tab[];
};

const STORAGE_KEY = "local-notepad:v1";

export function createTab(title = "Sem título"): Tab {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title,
    content: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function createInitialStore(): Store {
  const tab = createTab();
  return { version: 1, activeTabId: tab.id, tabs: [tab] };
}

function isValidTab(value: unknown): value is Tab {
  if (typeof value !== "object" || value === null) return false;
  const tab = value as Partial<Tab>;
  return (
    typeof tab.id === "string" &&
    typeof tab.title === "string" &&
    typeof tab.content === "string" &&
    typeof tab.createdAt === "number" &&
    typeof tab.updatedAt === "number"
  );
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function migrateContent(content: string): string {
  if (!content || /^\s*<[a-z!/][^>]*>/i.test(content)) return content;
  const blocks = content
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`);
  return blocks.join("");
}

export function loadStore(): Store | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<Store>;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.tabs) ||
      parsed.tabs.length === 0 ||
      !parsed.tabs.every(isValidTab)
    ) {
      return null;
    }

    const tabs = parsed.tabs.map((tab) => ({
      ...tab,
      content: migrateContent(tab.content),
    }));
    const activeTabId = tabs.some((tab) => tab.id === parsed.activeTabId)
      ? (parsed.activeTabId as string)
      : tabs[0].id;

    return { version: 1, activeTabId, tabs };
  } catch {
    return null;
  }
}

export function saveStore(store: Store): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}
