// Site settings set by admins:
//   notice  – thin banner at the top of every page
//   donate  – the Donations section (links to the party's own Stripe Payment Links)
//   home    – home page layout: banner photo, featured spotlight, latest news, gallery strip
//   GET /api/settings   public (the featured post and latest album are filled in, ready to show)
//   PUT /api/settings   admin (send only the parts being changed)
import { settings, json, fail, handle, requireAdmin, readIndex, readAlbums, mediaKey, safeLink, clean } from "../../lib/core.mjs";

const DEFAULTS = {
  notice: { on: false, text: "", link: "" },
  donate: { on: true, intro: "", link: "", monthly: "" },
  home: {
    hero: { on: false, photo: "", alt: "" },
    spot: { on: false, mode: "post", postId: "", photo: "", alt: "", eyebrow: "", title: "", text: "", btnLabel: "", btnLink: "" },
    news: { count: 3 },
    gallery: { on: false, albumId: "" },
  },
};
const merge = (cur) => {
  const h = cur.home || {};
  return {
    notice: { ...DEFAULTS.notice, ...(cur.notice || {}) },
    donate: { ...DEFAULTS.donate, ...(cur.donate || {}) },
    home: {
      hero: { ...DEFAULTS.home.hero, ...(h.hero || {}) },
      spot: { ...DEFAULTS.home.spot, ...(h.spot || {}) },
      news: { ...DEFAULTS.home.news, ...(h.news || {}) },
      gallery: { ...DEFAULTS.home.gallery, ...(h.gallery || {}) },
    },
  };
};
// Only Stripe-hosted payment pages are accepted, so a typo or a pasted look-alike can't send donors elsewhere.
const stripeLink = (u) => {
  try { const x = new URL(String(u || "").trim()); return x.protocol === "https:" && ["donate.stripe.com", "buy.stripe.com"].includes(x.hostname) ? x.href : ""; }
  catch { return ""; }
};

function cleanHome(b, cur) {
  const out = { ...cur };
  if (b.hero) out.hero = { on: !!b.hero.on, photo: mediaKey(b.hero.photo), alt: clean(b.hero.alt, 200) };
  if (b.spot) {
    const s = b.spot;
    out.spot = {
      on: !!s.on, mode: s.mode === "custom" ? "custom" : "post", postId: clean(s.postId, 40).replace(/[^a-z0-9]/g, ""),
      photo: mediaKey(s.photo), alt: clean(s.alt, 200), eyebrow: clean(s.eyebrow, 40), title: clean(s.title, 120),
      text: clean(s.text, 400), btnLabel: clean(s.btnLabel, 40), btnLink: safeLink(s.btnLink),
    };
  }
  if (b.news) out.news = { count: [3, 6].includes(+b.news.count) ? +b.news.count : 3 };
  if (b.gallery) out.gallery = { on: !!b.gallery.on, albumId: clean(b.gallery.albumId, 40).replace(/[^a-z0-9]/g, "") };
  return out;
}

// What the home page needs, resolved on the server so the page makes one request.
async function resolveHome(home) {
  const out = { hero: home.hero, news: home.news, spot: null, gallery: null };
  const sp = home.spot;
  if (sp.on) {
    if (sp.mode === "post" && sp.postId) {
      const p = (await readIndex()).find((x) => x.id === sp.postId && x.status === "published");
      if (p) out.spot = { eyebrow: sp.eyebrow || p.category, title: p.title, text: p.excerpt, photo: p.cover, alt: p.coverAlt, btnLabel: sp.btnLabel || "Read more", btnLink: `/news/${p.slug}` };
    } else if (sp.mode === "custom" && sp.title) {
      out.spot = { eyebrow: sp.eyebrow, title: sp.title, text: sp.text, photo: sp.photo, alt: sp.alt, btnLabel: sp.btnLink ? sp.btnLabel || "Find out more" : "", btnLink: sp.btnLink };
    }
  }
  if (home.gallery.on) {
    const albums = (await readAlbums()).filter((a) => a.status === "published" && a.count);
    const a = (home.gallery.albumId && albums.find((x) => x.id === home.gallery.albumId)) || albums[0];
    if (a) out.gallery = { title: a.title, slug: a.slug, date: a.date, place: a.place, count: a.count, photos: a.preview.slice(0, 6) };
  }
  if (!out.hero.on || !out.hero.photo) out.hero = { on: false };
  return out;
}

export default handle(async (req) => {
  const s = settings();
  const url = new URL(req.url);
  if (req.method === "GET") {
    const cur = merge((await s.get("site", { type: "json" })) || {});
    // admins get the raw settings to edit; visitors get the resolved, ready-to-show version
    if (url.searchParams.get("raw") === "1") { await requireAdmin(req); return json(cur); }
    // "has" lets pages keep the News and Gallery links hidden until something is actually published
    const has = {
      news: (await readIndex()).some((p) => p.status === "published"),
      gallery: (await readAlbums()).some((a) => a.status === "published" && a.count),
    };
    return json({ notice: cur.notice, donate: cur.donate, home: await resolveHome(cur.home), has }, 200, { "cache-control": "public, max-age=30" });
  }
  if (req.method === "PUT") {
    const admin = await requireAdmin(req);
    const b = await req.json().catch(() => ({}));
    const next = merge((await s.get("site", { type: "json" })) || {});
    if (b.notice) {
      const link = String(b.notice.link || "").trim().slice(0, 300);
      next.notice = { on: !!b.notice.on, text: String(b.notice.text || "").trim().slice(0, 160), link: /^(https:\/\/|\/)/.test(link) ? link : "" };
    }
    if (b.donate) {
      const link = stripeLink(b.donate.link), monthly = stripeLink(b.donate.monthly);
      if (String(b.donate.link || "").trim() && !link) return fail("The donation link must be a Stripe Payment Link starting https://donate.stripe.com/ or https://buy.stripe.com/");
      if (String(b.donate.monthly || "").trim() && !monthly) return fail("The monthly link must be a Stripe Payment Link starting https://donate.stripe.com/ or https://buy.stripe.com/");
      next.donate = { on: !!b.donate.on, intro: String(b.donate.intro || "").trim().slice(0, 400), link, monthly };
    }
    if (b.home) {
      const bl = b.home.spot && String(b.home.spot.btnLink || "").trim();
      if (bl && !safeLink(bl)) return fail("The button link must start with https:// or / (for a page on this website).");
      if (b.home.spot && b.home.spot.on && b.home.spot.mode === "custom" && !clean(b.home.spot.title, 120)) return fail("Add a heading for the featured section.");
      next.home = cleanHome(b.home, next.home);
    }
    next.updatedAt = new Date().toISOString(); next.updatedBy = admin.email;
    await s.setJSON("site", next);
    return json(next);
  }
  return fail("Not allowed.", 405);
});

export const config = { path: "/api/settings", method: ["GET", "PUT"] };
