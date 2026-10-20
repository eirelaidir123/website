// Site notice (the thin banner at the very top of every page).
//   GET /api/settings   public
//   PUT /api/settings   admin
import { settings, json, fail, handle, requireAdmin } from "../../lib/core.mjs";

const DEFAULTS = { notice: { on: false, text: "", link: "" } };

export default handle(async (req) => {
  const s = settings();
  if (req.method === "GET") {
    const cur = (await s.get("site", { type: "json" })) || DEFAULTS;
    return json(cur, 200, { "cache-control": "public, max-age=30" });
  }
  if (req.method === "PUT") {
    const admin = await requireAdmin(req);
    const b = await req.json().catch(() => ({}));
    const link = String(b?.notice?.link || "").trim().slice(0, 300);
    const next = {
      notice: {
        on: !!b?.notice?.on,
        text: String(b?.notice?.text || "").trim().slice(0, 160),
        link: /^(https:\/\/|\/)/.test(link) ? link : "",
      },
      updatedAt: new Date().toISOString(), updatedBy: admin.email,
    };
    await s.setJSON("site", next);
    return json(next);
  }
  return fail("Not allowed.", 405);
});

export const config = { path: "/api/settings", method: ["GET", "PUT"] };
