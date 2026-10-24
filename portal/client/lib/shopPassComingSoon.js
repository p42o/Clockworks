// Shop Pass Coming soon modal — interim UX while offered remains false.
// No Stripe links. Copy locked to presence/membership-assets-2026-10-24/COPY.md.
import { html, mount } from "./ui.js";

const PHONE_DISPLAY = "(763) 296-9777";
const PHONE_TEL = "+17632969777";
const EMAIL_FALLBACK = "parker@mnclockworks.com";

function contactEmail(swap) {
  return swap?.contact?.privacyEmail || EMAIL_FALLBACK;
}

/** Modal inner markup only (for tests and openShopPassComingSoon). */
export function shopPassComingSoonHtml(swap) {
  const email = contactEmail(swap);
  // Feature lines are static template text (Counsel-exact), not interpolations.
  return html`<div class="shop-pass-modal__card" role="document">
    <button type="button" class="shop-pass-modal__close" data-sp-close aria-label="Close">×</button>
    <p class="shop-pass-modal__eyebrow">Shop Pass · Coming soon</p>
    <h2 id="shop-pass-coming-soon-h" class="shop-pass-modal__hero">Keep your AI team current with Shop Pass.</h2>
    <p class="shop-pass-modal__price">$99 a month after the $499 deploy.</p>
    <ol class="shop-pass-modal__features">
      <li class="shop-pass-modal__feature">
        <span class="shop-pass-modal__num" aria-hidden="true">1</span>
        <span class="shop-pass-modal__feat-text">Portal access after the grace window</span>
      </li>
      <li class="shop-pass-modal__feature">
        <span class="shop-pass-modal__num" aria-hidden="true">2</span>
        <span class="shop-pass-modal__feat-text">Agent Newsletter (short updates you can hand your agents)</span>
      </li>
      <li class="shop-pass-modal__feature">
        <span class="shop-pass-modal__num" aria-hidden="true">3</span>
        <span class="shop-pass-modal__feat-text">Monthly remote tune-up</span>
      </li>
      <li class="shop-pass-modal__feature">
        <span class="shop-pass-modal__num" aria-hidden="true">4</span>
        <span class="shop-pass-modal__feat-text">Quarterly check-in</span>
      </li>
      <li class="shop-pass-modal__feature">
        <span class="shop-pass-modal__num" aria-hidden="true">5</span>
        <span class="shop-pass-modal__feat-text">Priority support: members' questions are answered before non-member requests, usually within one business day.</span>
      </li>
    </ol>
    <p class="shop-pass-modal__quiet">One-time 7-day extension available separately</p>
    <div class="shop-pass-modal__actions">
      <button type="button" class="btn primary block" disabled>Coming soon</button>
      <div class="shop-pass-modal__secondary">
        <a class="btn" href="tel:${PHONE_TEL}">Call ${PHONE_DISPLAY}</a>
        <a class="btn" href="mailto:${email}">Email</a>
      </div>
    </div>
    <footer class="shop-pass-modal__footer">${PHONE_DISPLAY} · ${email} · mnclockworks.com</footer>
  </div>`;
}

/**
 * Mount a centered Coming soon dialog. Closes on Escape, backdrop click, or close button.
 * Focus trap + restore focus to opener. Never includes Stripe checkout links.
 */
export function openShopPassComingSoon(swap, { opener } = {}) {
  const prev = opener || document.activeElement;
  const wrap = document.createElement("div");
  wrap.className = "shop-pass-modal";
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-modal", "true");
  wrap.setAttribute("aria-labelledby", "shop-pass-coming-soon-h");
  wrap.style.cssText = "position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:16px;";

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.className = "shop-pass-modal__backdrop";
  backdrop.setAttribute("aria-label", "Close");
  backdrop.tabIndex = -1;

  const panel = document.createElement("div");
  panel.className = "shop-pass-modal__panel";
  mount(panel, shopPassComingSoonHtml(swap));

  wrap.appendChild(backdrop);
  wrap.appendChild(panel);
  document.body.appendChild(wrap);

  const previousMain = document.querySelector("#app");
  if (previousMain) previousMain.inert = true;

  const focusables = () =>
    [...panel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')];

  const close = () => {
    wrap.remove();
    if (previousMain) previousMain.inert = false;
    prev?.focus?.();
  };

  backdrop.addEventListener("click", close);
  panel.querySelector("[data-sp-close]")?.addEventListener("click", close);

  wrap.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      close();
      return;
    }
    if (ev.key !== "Tab") return;
    const controls = focusables();
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first.focus();
    }
  });

  const first = focusables()[0] || panel.querySelector("[data-sp-close]");
  first?.focus?.();
  return close;
}
