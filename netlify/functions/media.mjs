// Photo library API (admin only).
//   GET    /api/media          list photos
//   POST   /api/media          upload one photo (body = image bytes; the admin page resizes it first)
//   PATCH  /api/media/:key     update alt text
//   DELETE /api/media/:key     delete a photo
// Public viewing is handled by media-serve.mjs at /media/:key.
import { media, json, fail, handle, requireAdmin, newId } from "../../lib/core.mjs";

const TYPES = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
const MAX_BYTES = 4 * 1024 * 1024;

export default handle(async (req, context) => {
  const admin = await requireAdmin(req);
  const s = media();
  const key = context.params?.key;

  if (req.method === "GET" && !key) {
    const { blobs } = await s.list();
    const items = [];
    for (const b of blobs) {
      const m = await s.getMetadata(b.key);
      if (m) items.push({ key: b.key, url: `/media/${b.key}`, ...m.metadata });
    }
    items.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
    return json({ items });
  }

  if (req.method === "POST" && !key) {
    const type = (req.headers.get("content-type") || "").split(";")[0].trim();
    if (!TYPES[type]) return fail("Upload a JPG, PNG or WebP image.", 415);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return fail("The file was empty.");
    if (buf.byteLength > MAX_BYTES) return fail("That image is too large (4 MB maximum after resizing).", 413);
    const k = `${newId()}.${TYPES[type]}`;
    const dec = (h) => { try { return decodeURIComponent(req.headers.get(h) || ""); } catch { return ""; } };
    const meta = {
      contentType: type, size: buf.byteLength,
      width: parseInt(req.headers.get("x-width") || "0", 10) || null,
      height: parseInt(req.headers.get("x-height") || "0", 10) || null,
      alt: dec("x-alt").slice(0, 200), name: dec("x-filename").slice(0, 120),
      uploadedAt: new Date().toISOString(), uploadedBy: admin.email,
    };
    await s.set(k, buf, { metadata: meta });
    return json({ key: k, url: `/media/${k}`, ...meta }, 201);
  }

  if (req.method === "PATCH" && key) {
    const cur = await s.getWithMetadata(key, { type: "arrayBuffer" });
    if (!cur) return fail("Photo not found.", 404);
    const body = await req.json().catch(() => ({}));
    const meta = { ...cur.metadata, alt: String(body.alt || "").slice(0, 200) };
    await s.set(key, cur.data, { metadata: meta });
    return json({ key, url: `/media/${key}`, ...meta });
  }

  if (req.method === "DELETE" && key) {
    await s.delete(key);
    return json({ ok: true });
  }
  return fail("Not allowed.", 405);
});

export const config = { path: ["/api/media", "/api/media/:key"] };
