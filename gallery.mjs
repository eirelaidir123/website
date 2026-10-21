// Gallery albums API (photos from events).
//   GET    /api/gallery            public: published albums (summaries)
//   GET    /api/gallery?all=1      admin: every album including drafts
//   GET    /api/gallery/:id        admin: one album in full
//   POST   /api/gallery            admin: create
//   PUT    /api/gallery/:id        admin: update
//   DELETE /api/gallery/:id        admin: delete the album (the photos stay in the photo library)
import { gallery, json, fail, handle, requireAdmin, newId, slugify, rebuildAlbums, readAlbums, mediaKey, clean } from "../../lib/core.mjs";

const MAX_PHOTOS = 300;

function validate(input) {
  const title = clean(input.title, 140);
  if (!title) throw fail("Add an album title.");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date || "") ? input.date : "";
  const seen = new Set();
  const photos = (Array.isArray(input.photos) ? input.photos : [])
    .map((x) => ({ key: mediaKey(x && x.key), alt: clean(x && x.alt, 200), caption: clean(x && x.caption, 200) }))
    .filter((x) => x.key && !seen.has(x.key) && seen.add(x.key))
    .slice(0, MAX_PHOTOS);
  return {
    title, date, status: input.status === "published" ? "published" : "draft",
    place: clean(input.place, 100), description: clean(input.description, 800),
    cover: mediaKey(input.cover), photos,
  };
}

async function uniqueSlug(base, id) {
  const items = await readAlbums();
  let slug = base, n = 2;
  while (items.some((a) => a.slug === slug && a.id !== id)) slug = `${base}-${n++}`;
  return slug;
}

export default handle(async (req, context) => {
  const url = new URL(req.url);
  const id = context.params?.id;
  const s = gallery();

  if (req.method === "GET" && !id && !url.searchParams.has("all")) {
    const items = (await readAlbums()).filter((a) => a.status === "published" && a.count);
    return json({ items }, 200, { "cache-control": "public, max-age=30" });
  }

  const admin = await requireAdmin(req);

  if (req.method === "GET" && !id) return json({ items: await readAlbums() });

  if (req.method === "GET" && id) {
    const a = await s.get(`album/${id}`, { type: "json" });
    return a ? json(a) : fail("Album not found.", 404);
  }

  if (req.method === "POST" && !id) {
    const data = validate(await req.json().catch(() => ({})));
    const now = new Date().toISOString(), aid = newId();
    const album = {
      id: aid, ...data, slug: await uniqueSlug(slugify(data.title), aid),
      createdAt: now, updatedAt: now, publishedAt: data.status === "published" ? now : null, createdBy: admin.email,
    };
    await s.setJSON(`album/${aid}`, album);
    await rebuildAlbums();
    return json(album, 201);
  }

  if (req.method === "PUT" && id) {
    const old = await s.get(`album/${id}`, { type: "json" });
    if (!old) return fail("Album not found.", 404);
    const data = validate(await req.json().catch(() => ({})));
    const now = new Date().toISOString();
    const album = {
      ...old, ...data, updatedAt: now, updatedBy: admin.email,
      slug: old.publishedAt ? old.slug : await uniqueSlug(slugify(data.title), id),
      publishedAt: data.status === "published" ? (old.publishedAt || now) : old.publishedAt,
    };
    await s.setJSON(`album/${id}`, album);
    await rebuildAlbums();
    return json(album);
  }

  if (req.method === "DELETE" && id) {
    await s.delete(`album/${id}`);
    await rebuildAlbums();
    return json({ ok: true });
  }

  return fail("Not allowed.", 405);
});

export const config = { path: ["/api/gallery", "/api/gallery/:id"] };
