// Account extend card. External Payment Links never enable portal billing or disclosures.
import { html } from "./ui.js";

// Fail closed for empty or invalid links, including non-HTTPS schemes.
export function paymentLinkUrl(config, key) {
  if (config?.offered !== true || !config[key]) return "";
  try {
    const url = new URL(config[key]);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

export function shopPassUpgradeHtml(swap) {
  const config = swap.shopPass;
  const upgrade = paymentLinkUrl(config, "shopPassPaymentLinkUrl");
  const deploy = paymentLinkUrl(config, "deployPaymentLinkUrl");
  return html`<section class="card shop-pass" aria-labelledby="shop-pass-h">
    <h2 id="shop-pass-h">Keep your Shop Pass.</h2>
    <p>Your setup is done. Shop Pass keeps the portal open and your monthly tune-up on the calendar.</p>
    <p>$99/mo Shop Pass (coming soon) after the $499 package.</p>
    <p>Priority support: members' questions are answered before non-member requests, usually within one business day.</p>
    ${upgrade
      ? html`<a class="btn primary" href="${upgrade}" target="_blank" rel="noopener noreferrer">Get Shop Pass</a>`
      : html`<p>Shop Pass is not offered yet.</p>
    <button type="button" class="btn" data-shop-pass-coming-soon>See what’s in Shop Pass</button>`}
    ${deploy ? html`<a class="btn" href="${deploy}" target="_blank" rel="noopener noreferrer">Pay deploy ($499)</a>` : ""}
    ${!upgrade || !deploy ? html`<p>Call <a href="tel:+17632969777">(763) 296-9777</a> or email <a href="mailto:parker@mnclockworks.com">parker@mnclockworks.com</a>.</p>` : ""}
    <footer>(763) 296-9777 · mnclockworks.com</footer>
  </section>`;
}
