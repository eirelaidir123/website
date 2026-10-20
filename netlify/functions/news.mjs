// Public News pages, rendered on the server so search engines see the full text.
//   /news          list of published posts
//   /news/:slug    one post
import { posts, handle, readIndex, renderMarkdown, escapeHtml as esc } from "../../lib/core.mjs";
import { PAGE, SITE_URL, INDEXABLE } from "../../lib/template.mjs";

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Dublin" }); }
  catch { return ""; }
};
const abs = (p) => (SITE_URL ? SITE_URL + p : p);

function page({ title, desc, path, main, image, jsonld, status = 200 }) {
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

const card = (p) => `
      <article class="ncard">
        <a href="/news/${esc(p.slug)}" class="ncard-link">
          <div class="ncard-img">${p.cover ? `<img src="/media/${esc(p.cover)}" alt="${esc(p.coverAlt || "")}" loading="lazy" decoding="async">` : `<span class="ncard-ph" aria-hidden="true"></span>`}</div>
          <div class="ncard-body">
            <p class="nmeta"><span class="npill">${esc(p.category)}</span><time datetime="${esc(p.publishedAt || "")}">${esc(fmtDate(p.publishedAt))}</time></p>
            <h2>${esc(p.title)}</h2>
            ${p.excerpt ? `<p class="nex">${esc(p.excerpt)}</p>` : ""}
          </div>
        </a>
      </article>`;

export default handle(async (req, context) => {
  const slug = context.params?.slug;

  if (!slug) {
    const items = (await readIndex()).filter((p) => p.status === "published");
    const main = `<main class="ppage-main" id="top">
  <section class="ppage-hero" aria-labelledby="h-news">
    <div class="wrap">
      <nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>News</span></nav>
      <h1 id="h-news">News</h1>
      <p class="psub">Updates, announcements and posts from Éire Láidir.</p>
    </div>
  </section>
  <div class="wrap news-list">
    ${items.length ? `<div class="ngrid">${items.map(card).join("")}</div>` : `<p class="nempty">No news has been posted yet. Check back soon.</p>`}
  </div>
</main>`;
    return page({ title: "News | Éire Láidir", desc: "Updates, announcements and posts from Éire Láidir.", path: "/news", main });
  }

  const items = await readIndex();
  const hit = items.find((p) => p.slug === slug && p.status === "published");
  const post = hit ? await posts().get(`post/${hit.id}`, { type: "json" }) : null;
  if (!post || post.status !== "published") {
    const main = `<main class="ppage-main" id="top"><section class="ppage-hero"><div class="wrap">
      <span class="ppage-num" aria-hidden="true">404</span><h1>Post not found</h1>
      <p class="psub">This post has moved or is no longer available.</p>
      <div class="pcta"><a class="btn btn-gold" href="/news">See all news</a></div></div></section></main>`;
    return page({ title: "Post not found | Éire Láidir", desc: "This post is no longer available.", path: `/news/${slug}`, main, status: 404 });
  }

  const desc = post.excerpt || String(post.body || "").replace(/[#*>\[\]()!_-]/g, "").replace(/\s+/g, " ").trim().slice(0, 155);
  const more = items.filter((p) => p.status === "published" && p.id !== post.id).slice(0, 3);
  const main = `<main class="ppage-main" id="top">
  <article>
    <header class="ppage-hero">
      <div class="wrap">
        <nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/news">News</a><span aria-hidden="true">/</span><span>${esc(post.category)}</span></nav>
        <p class="nmeta"><span class="npill">${esc(post.category)}</span><time datetime="${esc(post.publishedAt)}">${esc(fmtDate(post.publishedAt))}</time></p>
        <h1>${esc(post.title)}</h1>
        ${post.excerpt ? `<p class="psub">${esc(post.excerpt)}</p>` : ""}
      </div>
    </header>
    <div class="wrap npost">
      ${post.cover ? `<figure class="ncover"><img src="/media/${esc(post.cover)}" alt="${esc(post.coverAlt || "")}" decoding="async" fetchpriority="high"></figure>` : ""}
      <div class="nbody">${renderMarkdown(post.body)}</div>
      <p class="nback"><a href="/news">← All news</a></p>
    </div>
  </article>
  ${more.length ? `<section class="wrap news-more" aria-labelledby="h-more"><h2 id="h-more">More news</h2><div class="ngrid">${more.map(card).join("")}</div></section>` : ""}
</main>`;
  const jsonld = {
    "@context": "https://schema.org", "@type": post.category === "Blog" ? "BlogPosting" : "NewsArticle",
    headline: post.title, description: desc, datePublished: post.publishedAt, dateModified: post.updatedAt,
    image: post.cover ? [abs(`/media/${post.cover}`)] : [abs("/og-image.jpg")],
    author: { "@type": "Organization", name: "Éire Láidir" },
    publisher: { "@type": "Organization", name: "Éire Láidir", logo: { "@type": "ImageObject", url: abs("/logo-420.webp") } },
    mainEntityOfPage: abs(`/news/${post.slug}`),
  };
  return page({ title: `${post.title} | Éire Láidir`, desc, path: `/news/${post.slug}`, main, image: post.cover ? `/media/${post.cover}` : null, jsonld });
});

export const config = { path: ["/news", "/news/", "/news/:slug"], method: ["GET", "HEAD"] };
