const STORAGE_KEY = "local-notepad:colors";
const MAX_COLORS = 5;
const HEX_RE = /^#[0-9a-f]{6}$/i;

export const MAX_RECENT_COLORS = MAX_COLORS;

export function toHexColor(color: string | null | undefined): string | null {
  if (!color) return null;
  const value = color.trim().toLowerCase();
  if (HEX_RE.test(value)) return value;
  const rgb = value.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (!rgb) return null;
  const hex = rgb
    .slice(1, 4)
    .map((part) => Math.min(255, Number(part)).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

export function loadRecentColors(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((color): color is string => typeof color === "string" && HEX_RE.test(color))
      .map((color) => color.toLowerCase())
      .slice(0, MAX_COLORS);
  } catch {
    return [];
  }
}

export function saveRecentColors(colors: string[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(colors.slice(0, MAX_COLORS)),
    );
  } catch {
    // ignora falha de cota: as cores recentes são apenas uma conveniência
  }
}
