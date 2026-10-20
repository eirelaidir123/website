# Éire Láidir website

Built by QF Digital. Static website plus a private admin area at `/admin` where approved admins post news, upload photos and set a site notice.

## What's in this folder

| Path | What it is |
| --- | --- |
| `site/` | The public website (home, 11 policy pages, privacy notice) and the admin area (`site/admin/`) |
| `netlify/functions/` | The backend: posts, photos, site notice, and the server-rendered News pages |
| `lib/` | Shared code (storage, admin check, safe text formatting, page template) |
| `netlify.toml` | Netlify settings — publish `site/`, functions in `netlify/functions/` |
| `package.json` | One dependency: `@netlify/blobs` (Netlify installs it automatically) |

All posts and photos are stored in Netlify Blobs in the **EU (Frankfurt)** region.

## One-time setup

1. **GitHub:** create a private repository (e.g. `eire-laidir-website`) and upload everything in this folder to it.
2. **Netlify:** Add new project → Import an existing project → GitHub → pick the repository → Deploy. The settings come from `netlify.toml`; leave the build command empty.
3. **Identity (admin logins):** in the Netlify project, open **Identity** → **Enable Identity**. Then:
   - Registration preferences → **Invite only** (important: stops strangers signing up).
   - Invite users → enter the two admins' email addresses.
4. **Admin list:** Project configuration → Environment variables → add `ADMIN_EMAILS` = the two admin emails, comma-separated (scope: Functions). Then **Deploys → Trigger deploy**. Only these emails can make changes, even if someone else gets an account.
5. Each admin opens the invite email, sets a password (12+ characters) and lands in the admin area. After that they sign in at `/admin` or via **Admin sign in** in the site footer.

## Day to day

- **Posts:** write, preview, save as draft, publish, update, unpublish, delete. Published posts appear on `/news`, on the home page (latest three) and get their own page at `/news/<title>`.
- **Photos:** drag in photos; they are resized to 1800 px and converted to WebP automatically. Add a description to each for screen readers.
- **Site notice:** a one-line banner across the top of every page, with an optional link.
- **Account:** change password, sign out. Forgotten passwords: "Forgot your password?" on the sign-in page.

Changes appear on the site within about a minute.

## Adding or removing an admin

Invite (or delete) the person under Netlify → Identity, and update `ADMIN_EMAILS`, then trigger a deploy.

## Notes

- Invite and reset emails come from `no-reply@netlify.com`. Custom branded emails need a Netlify Pro plan.
- The Join form is in demo mode and the site is hidden from Google until the privacy notice is approved; QF Digital switches both on at launch.
