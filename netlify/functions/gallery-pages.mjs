// Public Gallery pages, rendered on the server.
//   /gallery          all published albums
//   /gallery/:slug    one album, with a full-screen photo viewer
import { gallery, handle, readAlbums, escapeHtml as esc } from "../../lib/core.mjs";
import { page, fmtDate, abs } from "../../lib/page.mjs";

const day = (d) => (d ? fmtDate(d + "T12:00:00Z") : "");
const meta = (a) => [day(a.date), a.place].filter(Boolean).map(esc).join(" · ");

const card = (a) => `
      <article class="ncard gcard">
        <a href="/gallery/${esc(a.slug)}" class="ncard-link">
          <div class="ncard-img">${a.cover ? `<img src="/media/${esc(a.cover)}" alt="${esc(a.coverAlt || "")}" loading="lazy" decoding="async">` : `<span class="ncard-ph" aria-hidden="true"></span>`}</div>
          <div class="ncard-body">
            <p class="nmeta"><span class="npill">${a.count} photo${a.count === 1 ? "" : "s"}</span>${meta(a) ? `<span>${meta(a)}</span>` : ""}</p>
            <h2>${esc(a.title)}</h2>
          </div>
        </a>
      </article>`;

const VIEWER_JS = `<script>
(function(){var d=document,dlg=d.getElementById('lb');if(!dlg)return;
var items=[].slice.call(d.querySelectorAll('[data-lb]')),img=d.getElementById('lbImg'),cap=d.getElementById('lbCap'),cnt=d.getElementById('lbCount'),i=0,opener=null;
function show(n){i=(n+items.length)%items.length;var b=items[i];img.src=b.getAttribute('data-src');img.alt=b.getAttribute('data-alt')||'';cap.textContent=b.getAttribute('data-cap')||'';cap.hidden=!cap.textContent;cnt.textContent=(i+1)+' / '+items.length;}
items.forEach(function(b,n){b.addEventListener('click',function(){opener=b;show(n);if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');});});
d.getElementById('lbPrev').onclick=function(){show(i-1)};d.getElementById('lbNext').onclick=function(){show(i+1)};
d.getElementById('lbClose').onclick=function(){dlg.close()};
dlg.addEventListener('close',function(){img.removeAttribute('src');if(opener)opener.focus();});
dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});
d.addEventListener('keydown',function(e){if(!dlg.open)return;if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1);});
var x0=null;dlg.addEventListener('touchstart',function(e){x0=e.touches[0].clientX},{passive:true});
dlg.addEventListener('touchend',function(e){if(x0==null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>45)show(i+(dx<0?1:-1));x0=null;},{passive:true});
})();
</script>`;

export default handle(async (req, context) => {
  const slug = context.params?.slug;
  const albums = (await readAlbums()).filter((a) => a.status === "published" && a.count);

  if (!slug) {
    if (!albums.length) return new Response(null, { status: 302, headers: { location: "/", "cache-control": "no-store" } });
    const main = `<main class="ppage-main" id="top">
  <section class="ppage-hero" aria-labelledby="h-gallery">
    <div class="wrap">
      <nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Gallery</span></nav>
      <h1 id="h-gallery">Gallery</h1>
      <p class="psub">Photos from Éire Láidir events, meetings and campaigns.</p>
    </div>
  </section>
  <div class="wrap news-list">
    ${albums.length ? `<div class="ngrid">${albums.map(card).join("")}</div>` : `<p class="nempty">No photos have been posted yet. Check back soon.</p>`}
  </div>
</main>`;
    return page({ title: "Gallery | Éire Láidir", desc: "Photos from Éire Láidir events, meetings and campaigns.", path: "/gallery", main, image: albums[0] && albums[0].cover ? `/media/${albums[0].cover}` : null });
  }

  const hit = albums.find((a) => a.slug === slug);
  const album = hit ? await gallery().get(`album/${hit.id}`, { type: "json" }) : null;
  if (!album || album.status !== "published") {
    const main = `<main class="ppage-main" id="top"><section class="ppage-hero"><div class="wrap">
      <span class="ppage-num" aria-hidden="true">404</span><h1>Album not found</h1>
      <p class="psub">This album has moved or is no longer available.</p>
      <div class="pcta"><a class="btn btn-gold" href="/gallery">See the gallery</a></div></div></section></main>`;
    return page({ title: "Album not found | Éire Láidir", desc: "This album is no longer available.", path: `/gallery/${slug}`, main, status: 404 });
  }

  const photos = album.photos || [];
  const desc = album.description || `${photos.length} photos${album.place ? " from " + album.place : ""}.`;
  const more = albums.filter((a) => a.id !== album.id).slice(0, 3);
  const main = `<main class="ppage-main" id="top">
  <header class="ppage-hero">
    <div class="wrap">
      <nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/gallery">Gallery</a><span aria-hidden="true">/</span><span>${esc(album.title)}</span></nav>
      <p class="nmeta"><span class="npill">${photos.length} photo${photos.length === 1 ? "" : "s"}</span>${meta(album) ? `<span>${meta(album)}</span>` : ""}</p>
      <h1>${esc(album.title)}</h1>
      ${album.description ? `<p class="psub">${esc(album.description)}</p>` : ""}
    </div>
  </header>
  <div class="wrap gal-wrap">
    <ul class="gal" role="list">
      ${photos.map((x, n) => `<li><button type="button" class="gal-btn" data-lb data-src="/media/${esc(x.key)}" data-alt="${esc(x.alt)}" data-cap="${esc(x.caption)}" aria-label="Open photo ${n + 1} of ${photos.length}${x.alt ? ": " + esc(x.alt) : ""}"><img src="/media/${esc(x.key)}" alt="" loading="${n < 12 ? "eager" : "lazy"}" decoding="async"></button></li>`).join("")}
    </ul>
    <p class="nback"><a href="/gallery">← All albums</a></p>
  </div>
  ${more.length ? `<section class="wrap news-more" aria-labelledby="h-more"><h2 id="h-more">More albums</h2><div class="ngrid">${more.map(card).join("")}</div></section>` : ""}
  <dialog class="lb" id="lb" aria-label="Photo viewer">
    <div class="lb-top"><span id="lbCount"></span><button type="button" class="lb-x" id="lbClose" aria-label="Close">×</button></div>
    <figure class="lb-fig"><img id="lbImg" alt=""><figcaption id="lbCap" hidden></figcaption></figure>
    <button type="button" class="lb-nav lb-prev" id="lbPrev" aria-label="Previous photo">‹</button>
    <button type="button" class="lb-nav lb-next" id="lbNext" aria-label="Next photo">›</button>
  </dialog>
  ${VIEWER_JS}
</main>`;
  const jsonld = {
    "@context": "https://schema.org", "@type": "ImageGallery", name: album.title, description: desc,
    datePublished: album.publishedAt, dateModified: album.updatedAt,
    image: photos.slice(0, 20).map((x) => abs(`/media/${x.key}`)),
    publisher: { "@type": "Organization", name: "Éire Láidir" },
  };
  return page({ title: `${album.title} | Gallery | Éire Láidir`, desc, path: `/gallery/${album.slug}`, main, image: hit.cover ? `/media/${hit.cover}` : null, jsonld });
});

export const config = { path: ["/gallery", "/gallery/", "/gallery/:slug"], method: ["GET", "HEAD"] };
