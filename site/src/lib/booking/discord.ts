import type { AuditProvider } from "./provider";
import { getWebhookOverride } from "./firestore";

/**
 * Delivery channel: Discord webhook — the same channel the legacy contact
 * modal delivered to, so leads land where Parker already looks. The webhook
 * URL can be rotated at runtime via Firestore `siteContent/formSettings`.
 */

const FALLBACK_WEBHOOK =
  "https://discord.com/api/webhooks/1489040629332840500/8EolpZvDZTiCZJmmrSI-SZJTjsktMxbFop4_B4DHyCuMuhClg_vU277Kx-ub7VylgYql";

export const discordProvider: AuditProvider = {
  name: "discord-webhook",
  async submit(req) {
    const webhook = (await getWebhookOverride()) || FALLBACK_WEBHOOK;
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "🕰️ New audit request — mnclockworks.com",
            color: 0xd4582a,
            fields: [
              { name: "Name", value: req.name || "—", inline: true },
              { name: "Business", value: req.business || "—", inline: true },
              { name: "Trade", value: req.trade || "—", inline: true },
              { name: "Biggest time-sink", value: req.painPoint || "—" },
              ...(req.detail ? [{ name: "In their words", value: req.detail.slice(0, 1000) }] : []),
              { name: "Email", value: req.email || "—", inline: true },
              { name: "Phone", value: req.phone || "—", inline: true },
              { name: "Preferred time", value: req.preferred || "—", inline: true },
            ],
            footer: { text: `Booked from ${req.page}` },
            timestamp: req.submittedAt,
          },
        ],
      }),
    });
    return res.ok;
  },
};
