// Shared page rendering for the server-built pages (/news, /gallery).
import { escapeHtml as esc } from "./md.mjs";
import { PAGE, SITE_URL, INDEXABLE } from "./template.mjs";

export const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Dublin" }); }
  catch { return ""; }
};
export const abs = (p) => (SITE_URL ? SITE_URL + p : p);

export function page({ title, desc, path, main, image, jsonld, status = 200 }) {
  const img = image ? abs(image) : abs("/og-image.jpg");
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="robots" content="${INDEXABLE ? "index, follow, max-image-preview:large" : "noindex, nofollow"}">`,
    SITE_URL ? `<link rel="canonical" href="${esc(abs(path))}">` : "",
    `<meta property="og:type" content="${jsonld ? "article" : "website"}">`,
    `<meta property="og:site_name" content="Éire Láidir">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta property="og:locale" content="en_IE">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : "",
  ].filter(Boolean).join("\n");
  return new Response(PAGE.replace("{{HEAD}}", head).replace("{{MAIN}}", main), {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=30" },
  });
}

