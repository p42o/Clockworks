// feed.js — renders live social embeds (Facebook Page Plugin + X Timeline)

const FB_PAGE_URL = "https://www.facebook.com/people/Clockworks-MN/61580475420690/";
const X_HANDLE    = "ClockworksMN";

export function initFeed() {
  const el = document.getElementById("dashboard-feed-container");
  if (!el) return;

  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">// Live Feed</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

        <!-- Facebook Page Plugin -->
        <div style="background:var(--bg);border:1px solid rgba(74,158,255,.2);border-radius:8px;overflow:hidden">
          <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid rgba(74,158,255,.15);background:rgba(74,158,255,.07)">
            <img src="facebook-logo.png" style="width:14px;height:14px;object-fit:contain">
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--fb);letter-spacing:.06em">FACEBOOK</span>
          </div>
          <div style="display:flex;justify-content:center;padding:8px 0">
            <iframe
              src="https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(FB_PAGE_URL)}&tabs=timeline&width=380&height=500&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false&appId"
              width="380"
              height="500"
              style="border:none;overflow:hidden;display:block"
              scrolling="no"
              frameborder="0"
              allowfullscreen="true"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
            </iframe>
          </div>
        </div>

        <!-- X Timeline -->
        <div style="background:var(--bg);border:1px solid rgba(231,233,234,.12);border-radius:8px;overflow:hidden">
          <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid rgba(231,233,234,.08);background:rgba(231,233,234,.04)">
            <img src="x-logo.png" style="width:14px;height:14px;object-fit:contain;filter:invert(1)">
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--x);letter-spacing:.06em">X</span>
          </div>
          <div style="padding:0;overflow:hidden;height:516px">
            <a class="twitter-timeline"
               data-theme="dark"
               data-chrome="noheader nofooter noborders transparent"
               data-height="516"
               href="https://x.com/${X_HANDLE}">
            </a>
          </div>
        </div>

      </div>
    </div>`;

  // Load X widgets script once
  if (!document.getElementById("x-widgets-script")) {
    const s = document.createElement("script");
    s.id  = "x-widgets-script";
    s.src = "https://platform.twitter.com/widgets.js";
    s.async = true;
    document.body.appendChild(s);
  } else if (window.twttr?.widgets) {
    window.twttr.widgets.load();
  }
}
