import type { Tab } from "./storage";

const BLOCK_RE =
  /^(P|DIV|H[1-6]|BLOCKQUOTE|PRE|UL|OL|LI|TR|TABLE|SECTION|ARTICLE|HEADER|FOOTER|FIGURE|HR)$/;

function walk(node: Node, out: string[]) {
  if (node.nodeType === 3) {
    out.push(node.nodeValue ?? "");
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as Element;
  const tag = el.tagName;
  if (tag === "SCRIPT" || tag === "STYLE") return;
  if (tag === "BR") {
    out.push("\n");
    return;
  }
  if (tag === "LI") {
    const parent = el.parentElement;
    const marker =
      parent?.tagName === "OL"
        ? `${Array.from(parent.children).indexOf(el) + 1}. `
        : "- ";
    out.push(`\n${marker}`);
    for (const child of el.childNodes) {
      if (child.nodeType === 1 && (child as Element).tagName === "P") {
        for (const grandchild of child.childNodes) walk(grandchild, out);
      } else {
        walk(child, out);
      }
    }
    return;
  }
  if (tag === "TD" || tag === "TH") {
    for (const child of el.childNodes) walk(child, out);
    out.push("\t");
    return;
  }

  const isBlock = BLOCK_RE.test(tag);
  if (isBlock) out.push("\n");
  for (const child of el.childNodes) walk(child, out);
  if (isBlock) out.push("\n");
}

export function htmlToPlainText(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: string[] = [];
  for (const child of doc.body.childNodes) walk(child, out);
  return out
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function downloadTabAsTxt(tab: Tab): void {
  const text = htmlToPlainText(tab.content);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${tab.title}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
