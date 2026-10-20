// Public image delivery: /media/<key>. Keys are unique per upload, so images can be cached for a year.
import { media, handle } from "../../lib/core.mjs";

export default handle(async (req, context) => {
  const key = context.params?.key || "";
  if (!/^[a-z0-9]+\.(webp|jpg|png)$/.test(key)) return new Response("Not found", { status: 404 });
  const res = await media().getWithMetadata(key, { type: "arrayBuffer" });
  if (!res) return new Response("Not found", { status: 404 });
  return new Response(res.data, {
    headers: {
      "content-type": res.metadata?.contentType || "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
});

export const config = { path: "/media/:key", method: ["GET", "HEAD"] };
