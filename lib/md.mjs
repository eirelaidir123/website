// Shared by the server (news pages) and the admin preview, so both format posts identically.
// ---------- Safe text formatting (Markdown subset) ----------
// Everything is HTML-escaped first, so admins can't accidentally (or deliberately) inject scripts.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeUrl = (u) => (/^(https?:\/\/|\/media\/|\/news\/|\/policies\/|\/#|mailto:|#)/i.test(u) ? u : "#");
function inline(s) {
  let t = esc(s);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => {
    const u = safeUrl(url.replace(/&amp;/g, "&"));
    const ext = /^https?:/i.test(u);
    return `<a href="${esc(u)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${txt}</a>`;
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return t;
}
export function renderMarkdown(src) {
  const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
  const out = []; let para = []; let list = null;
  const flushP = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`<${list.t}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.t}>`); list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    let m;
    if (!l.trim()) { flushP(); flushL(); continue; }
    if ((m = l.match(/^###\s+(.+)/))) { flushP(); flushL(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
    if ((m = l.match(/^##\s+(.+)/))) { flushP(); flushL(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }
    if ((m = l.match(/^>\s?(.*)/))) { flushP(); flushL(); out.push(`<blockquote><p>${inline(m[1])}</p></blockquote>`); continue; }
    if ((m = l.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/))) {
      flushP(); flushL();
      out.push(`<figure><img src="${esc(safeUrl(m[2]))}" alt="${esc(m[1])}" loading="lazy" decoding="async">${m[1] ? `<figcaption>${esc(m[1])}</figcaption>` : ""}</figure>`);
      continue;
    }
    if ((m = l.match(/^\s*[-*]\s+(.+)/))) { flushP(); if (!list || list.t !== "ul") { flushL(); list = { t: "ul", items: [] }; } list.items.push(m[1]); continue; }
    if ((m = l.match(/^\s*\d+[.)]\s+(.+)/))) { flushP(); if (!list || list.t !== "ol") { flushL(); list = { t: "ol", items: [] }; } list.items.push(m[1]); continue; }
    flushL(); para.push(l.trim());
  }
  flushP(); flushL();
  return out.join("\n");
}
export const escapeHtml = esc;
