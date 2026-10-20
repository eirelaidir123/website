// Shared helpers for the Éire Láidir backend (Netlify Functions).
import { getStore } from "@netlify/blobs";

// All site data lives in the EU (Frankfurt). Pass the region on EVERY call:
// a call without it silently reads/writes the default US store.
const REGION = "eu-central-1";
export const store = (name) => getStore({ name, region: REGION, consistency: "strong" });
export const posts = () => store("el-posts");
export const media = () => store("el-media");
export const settings = () => store("el-settings");

export const CATEGORIES = ["News", "Blog", "Update", "Press release"];

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}
export const fail = (message, status = 400) => json({ error: message }, status);

export function newId() {
  const t = Date.now().toString(36);
  const r = crypto.getRandomValues(new Uint8Array(6)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
  return `${t}${r}`;
}

export function slugify(s) {
  return String(s || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";
}

// ---------- Admin check ----------
// The browser sends the Netlify Identity access token. We confirm it with the site's own
// Identity service, then check the person is an admin: either they have the "admin" role
// (set in Netlify > Identity) or their email is listed in the ADMIN_EMAILS environment variable.
// If neither is configured, nobody gets in (fail closed).
export async function requireAdmin(req) {
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth)) throw fail("Please sign in.", 401);
  const origin = new URL(req.url).origin;
  let user;
  try {
    const r = await fetch(`${origin}/.netlify/identity/user`, { headers: { authorization: auth } });
    if (!r.ok) throw new Error(String(r.status));
    user = await r.json();
  } catch {
    throw fail("Your session has expired. Please sign in again.", 401);
  }
  const email = String(user.email || "").toLowerCase();
  const roles = (user.app_metadata && user.app_metadata.roles) || [];
  const allow = String(globalThis.Netlify?.env?.get("ADMIN_EMAILS") || process.env.ADMIN_EMAILS || "")
    .toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  if (!(roles.includes("admin") || (email && allow.includes(email)))) throw fail("This account is not an admin.", 403);
  return { email, id: user.id, name: (user.user_metadata && user.user_metadata.full_name) || email };
}

// Wrap a handler so thrown Responses are returned and anything else is a 500.
export const handle = (fn) => async (req, context) => {
  try { return await fn(req, context); }
  catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return fail("Something went wrong. Please try again.", 500);
  }
};

// ---------- Posts index ----------
// Each post is stored as its own JSON blob. A small "_index" blob holds the list used by
// public pages; it is rebuilt from the posts themselves after every change, so it can't drift.
export const summary = (p) => ({
  id: p.id, slug: p.slug, title: p.title, category: p.category, excerpt: p.excerpt,
  cover: p.cover || "", coverAlt: p.coverAlt || "", status: p.status,
  publishedAt: p.publishedAt || null, updatedAt: p.updatedAt, author: p.authorName || "",
});
export async function rebuildIndex() {
  const s = posts();
  const { blobs } = await s.list({ prefix: "post/" });
  const all = [];
  for (const b of blobs) {
    const p = await s.get(b.key, { type: "json" });
    if (p) all.push(summary(p));
  }
  all.sort((a, b) => String(b.publishedAt || b.updatedAt).localeCompare(String(a.publishedAt || a.updatedAt)));
  await s.setJSON("_index", { items: all, builtAt: new Date().toISOString() });
  return all;
}
export async function readIndex() {
  const idx = await posts().get("_index", { type: "json" });
  return idx ? idx.items : rebuildIndex();
}

// Safe text formatting lives in md.mjs (shared with the admin preview).
export { renderMarkdown, escapeHtml } from "./md.mjs";
