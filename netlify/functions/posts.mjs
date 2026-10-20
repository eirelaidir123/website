// Posts API.
//   GET    /api/posts            public: published posts (summaries). ?limit=3
//   GET    /api/posts?all=1      admin: every post including drafts
//   GET    /api/posts/:id        admin: one post in full
//   POST   /api/posts            admin: create
//   PUT    /api/posts/:id        admin: update
//   DELETE /api/posts/:id        admin: delete
import { posts, json, fail, handle, requireAdmin, newId, slugify, rebuildIndex, readIndex, CATEGORIES } from "../../lib/core.mjs";

const clean = (s, max) => String(s ?? "").replace(/\u0000/g, "").trim().slice(0, max);

function validate(input) {
  const title = clean(input.title, 140);
  if (!title) throw fail("Add a title.");
  const category = CATEGORIES.includes(input.category) ? input.category : "News";
  const status = input.status === "published" ? "published" : "draft";
  return {
    title, category, status,
    excerpt: clean(input.excerpt, 300),
    body: clean(input.body, 50000),
    cover: /^[a-z0-9]+\.(webp|jpg|png)$/.test(input.cover || "") ? input.cover : "",
    coverAlt: clean(input.coverAlt, 200),
  };
}

async function uniqueSlug(base, id) {
  const items = await readIndex();
  let slug = base, n = 2;
  while (items.some((p) => p.slug === slug && p.id !== id)) slug = `${base}-${n++}`;
  return slug;
}

export default handle(async (req, context) => {
  const url = new URL(req.url);
  const id = context.params?.id;
  const s = posts();

  if (req.method === "GET" && !id && !url.searchParams.has("all")) {
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1), 100);
    const items = (await readIndex()).filter((p) => p.status === "published").slice(0, limit);
    return json({ items }, 200, { "cache-control": "public, max-age=30" });
  }

  const admin = await requireAdmin(req);

  if (req.method === "GET" && !id) return json({ items: await readIndex() });

  if (req.method === "GET" && id) {
    const p = await s.get(`post/${id}`, { type: "json" });
    return p ? json(p) : fail("Post not found.", 404);
  }

  if (req.method === "POST" && !id) {
    const data = validate(await req.json().catch(() => ({})));
    const now = new Date().toISOString();
    const pid = newId();
    const post = {
      id: pid, ...data, slug: await uniqueSlug(slugify(data.title), pid),
      createdAt: now, updatedAt: now, publishedAt: data.status === "published" ? now : null,
      authorName: admin.name, authorEmail: admin.email,
    };
    await s.setJSON(`post/${pid}`, post);
    await rebuildIndex();
    return json(post, 201);
  }

  if (req.method === "PUT" && id) {
    const old = await s.get(`post/${id}`, { type: "json" });
    if (!old) return fail("Post not found.", 404);
    const data = validate(await req.json().catch(() => ({})));
    const now = new Date().toISOString();
    const post = {
      ...old, ...data, updatedAt: now,
      // the web address stays the same once a post has been published, so shared links keep working
      slug: old.publishedAt ? old.slug : await uniqueSlug(slugify(data.title), id),
      publishedAt: data.status === "published" ? (old.publishedAt || now) : old.publishedAt,
      updatedBy: admin.email,
    };
    await s.setJSON(`post/${id}`, post);
    await rebuildIndex();
    return json(post);
  }

  if (req.method === "DELETE" && id) {
    await s.delete(`post/${id}`);
    await rebuildIndex();
    return json({ ok: true });
  }

  return fail("Not allowed.", 405);
});

export const config = { path: ["/api/posts", "/api/posts/:id"] };
