# Éire Láidir website

Built by QF Digital. Static website plus a private admin area at `/admin` where approved admins post news, control the home page, publish photo albums, set a site notice and switch on donations.

## What's in this folder

| Path | What it is |
| --- | --- |
| `site/` | The public website (home, 11 policy pages, privacy notice) and the admin area (`site/admin/`) |
| `netlify/functions/` | The backend: posts, photos, gallery albums, site settings, and the server-rendered News and Gallery pages |
| `lib/` | Shared code (storage, admin check, safe text formatting, page template) |
| `netlify.toml` | Netlify settings — publish `site/`, functions in `netlify/functions/` |
| `package.json` | One dependency: `@netlify/blobs` (Netlify installs it automatically) |

All posts, photos, albums and settings are stored in Netlify Blobs in the **EU (Frankfurt)** region.

## One-time setup

1. **GitHub:** create a private repository (e.g. `eire-laidir-website`) and upload everything in this folder to it.
2. **Netlify:** Add new project → Import an existing project → GitHub → pick the repository → Deploy. The settings come from `netlify.toml`; leave the build command empty.
3. **Identity (admin logins):** in the Netlify project, open **Identity** → **Enable Identity**. Then:
   - Registration preferences → **Invite only** (important: stops strangers signing up).
   - Invite users → enter the two admins' email addresses.
4. **Admin list:** Project configuration → Environment variables → add `ADMIN_EMAILS` = the two admin emails, comma-separated (scope: Functions). Then **Deploys → Trigger deploy**. Only these emails can make changes, even if someone else gets an account.
5. Each admin opens the invite email, sets a password (12+ characters) and lands in the admin area. After that they sign in at `/admin` or via **Admin sign in** in the site footer.

## Day to day

- **Posts:** write, preview, save as draft, publish, update, unpublish, delete. Published posts appear on `/news` and get their own page at `/news/<title>`.
  - **Where it appears** (in each post): show it in Latest news on the home page or not, pin it to the top, feature it as the big spotlight under the main banner, and place it on any of the policy pages ("Latest on this policy").
- **Home page:** the featured spotlight (a post, or your own photo, heading, text and button), an optional banner photo behind the main heading, how many news posts to show (3 or 6), and a strip of photos from a Gallery album. The logo, main heading and policy wording never change.
- **Gallery:** one album per event. Add photos (upload or pick from the library), reorder them, add descriptions and captions, choose a cover, publish. Albums appear at `/gallery`, each with a full-screen photo viewer.
- **Photos (photo library):** every uploaded photo, resized to 1800 px WebP automatically. Add a description to each for screen readers. Deleting a photo here removes it everywhere it is used.
- **Site notice:** a one-line banner across the top of every page, with an optional link.
- **Donations:** paste the party's Stripe Payment Link, switch it on, save. Donate buttons (header, phone bar, home page, Join section, policy pages, news posts, footer) show by default and lead to a section that says "Online donations open soon" until a link is added. Untick the box to hide them all.
- **Account:** change password, sign out. Forgotten passwords: "Forgot your password?" on the sign-in page.

Changes appear on the site within about a minute.

## Donations (Stripe)

The website never handles card details. The Donate button sends people to the party's own Stripe Payment Link; the admin area only accepts links starting `https://donate.stripe.com/` or `https://buy.stripe.com/`.

1. In Stripe, check payouts go to the party's political donations account (a bank in the State).
2. Payment Links → New → **Customers choose what to pay**, EUR, minimum €5, maximum €2,500.
3. Turn on **Collect customers' addresses** (billing, required).
4. Add a required dropdown field "Eligibility": "Irish citizen" / "Not a citizen, but I live on the island of Ireland".
5. Copy the link → website admin → **Donations** → paste → make sure "Show Donate buttons and the Donations section" is ticked → Save → Test the link.
6. Optional: a second link with a fixed monthly price for monthly giving.

On the site, donors must tick a box confirming they are eligible and within the €2,500 limit before the button works. The treasurer still has to add up each donor's total, refund prohibited donations within 14 days, keep records for 6 years and disclose donors over €1,500 to SIPO by 31 March. The handover sheet has the full steps.

## Adding or removing an admin

Invite (or delete) the person under Netlify → Identity, and update `ADMIN_EMAILS`, then trigger a deploy.

## Notes

- Invite and reset emails come from `no-reply@netlify.com`. Custom branded emails need a Netlify Pro plan.
- The Join form is in demo mode and the site is hidden from Google until the privacy notice is approved; QF Digital switches both on at launch.
