# Counsel ruling — Iris portal support chat logging
**When:** 2026-10-24 ~1:42 PM CT (America/Chicago)
**Ask (Theo/Parker):** Iris live chat on client portal dashboard; prefer full transcripts (option to read later); summaries OK if transcripts too sensitive; need agreement/disclosure. Phase 1 = support (not sales); internal smoke via pswanson@mail.grokbot.com test client first; no customer outreach from this thread.
**Ops limits:** Drafts only. Do not publish, email clients, or turn on customer-visible logging until Privacy bump + in-product copy ship on Parker's Apex tap.

**Primary:** Minn. Stat. 626A.02 (one-party consent for electronic communications when a party records); Privacy Notice v2.0a; Starter Terms v4.0a; FTC Act §5 (clear AI + recording disclosure); ROSCA N/A (support, not negative-option sale).

---

## VERDICT (Parker board)

| # | Ask | Ruling |
|---|---|---|
| 1 | Log transcripts vs summaries vs both? | **Transcripts APPROVE** with notice below. **Both OK** (transcript + short summary). **Summaries-only: not preferred** as the sole record (loss of fidelity / hallucination risk). |
| 2 | Notice / consent? | **In-product disclosure before first send** + **Privacy Notice bump** (material) + short **Starter Terms** line. Separate opt-in checkbox not required under MN for a party to the chat; disclosure is still required for fairness / interstate clients / AI transparency. |
| 3 | Customer-visible logging before docs ship? | **HOLD** for real clients. Internal smoke on test client OK with logging on, if Parker accepts test-only risk. |

**Recommendation to Parker:** Store **full transcripts** (your preference). Add optional auto-summary for skim. Do not rely on summary alone.

---

## FACT

- Privacy v2.0a already covers "portal messages," AI processing, no model training, and call transcripts **only after we tell you at the start of the call**.
- It does **not** yet say the portal has an **AI support chat (Iris)** whose full transcript is stored and sent to an AI provider.
- Adding stored AI support chat is a **new category / material use** under Privacy § Changes → new version + portal acknowledge at next sign-in (same pattern as GA4 bump). Never NON_MATERIAL_SUCCESSORS; recount real acceptances.
- MN is one-party consent for electronic communications when Clockworks is a party (626A.02). Best practice still: tell the client up front.
- Chat may carry third-party customer/staff data the client pastes in; existing "Information we do not want" / client-responsibility rules apply.

## ANALYSIS

- Full transcripts match support quality, dispute proof, and Parker's "option to read later." Summaries help triage but must not replace the transcript.
- Risk is less wiretap and more **unfair surprise** (FTC §5 / Minn. 325D.44): client thinks they are chatting privately with Parker, while Iris (AI) + provider + stored log are in the loop.
- Provider path (xAI / Grok Bot stack or whoever Apex wires) must stay inside Privacy "AI model and assistant providers," training-off where offered, US processing as stated.
- Phase 1 support-only: no sales pitches, no Shop Pass upsell in Iris chat until Shop Pass is sellable.

## GUIDANCE

1. Apex: build chat + logging behind feature flag; test client first.
2. Before any **real** client sees the widget: ship Privacy bump + Terms line + in-product banner (drafts below).
3. Retention: treat Iris chat transcripts like **other portal messages** (delete within 90 days after Close), unless a message is an approval/notice/change request (Contract Record). Optional: shorter support-chat retention (e.g. 12 months while engagement active) if Parker wants less risk — default = align with portal messages.
4. Redact/delete if client pastes secrets (same as Privacy "If you send us something on this list").
5. Access: Parker / authorized Clockworks ops only; other portal users in the client's business may see if chat is stored as a business portal record — say so in the banner.
6. No customer email blast from this thread.

---

## DRAFT COPY (Apex may drop in — not published until Parker tap)

### A) In-product — first open / above composer (required)

**Iris support chat**

This chat is with Iris, MN Clockworks' AI support assistant (not a live person). We store the full transcript so Parker can review it later if needed. The chat may be processed by our AI service providers under our Privacy Notice. Do not send passwords, codes, card numbers, or other people's sensitive information. Other people with access to your business's portal account may see this chat.

By sending a message, you agree to this.

[Start chat]

(Optional small persistent footer under composer, every session:)
Iris (AI) · chat stored · [Privacy Notice]

### B) Privacy Notice — new subsection (material bump → **v2.0b** suggested)

Add under **Information collected when you use the portal** (or new **Portal support chat**):

**Portal support chat (Iris).** The client portal may offer a support chat with Iris, our AI assistant. When you use it, we store the full chat transcript (and may create a short summary for our team). We use that content to answer your question, improve support for your account, and keep a record. Iris is not a human; Parker or our team may read the transcript later. Chat content is processed by our AI service providers under the AI services section above. Retention follows **Other portal records and messages**, unless a message is an approval, notice, or change request (Contract Record). Do not send secrets listed under Information we do not want.

Changelog blurb:
Version 2.0b, [DATE]: added Portal support chat (Iris) transcript storage and disclosure.

### C) Starter Terms — short add (same ship; version letter if Terms hash changes — coordinate with Apex acceptance rules)

Add under communications / portal section (plain English):

**Portal support chat.** The portal may include a support chat with Iris, an AI assistant. Chats are stored so we can review them and help you. Iris is not a substitute for written approvals. Anything that changes price, scope, or legal terms must still be confirmed in writing under these Terms or a signed SOW.

### D) Iris system / FAQ line (support phase 1)

If asked whether chats are recorded: "Yes. This chat is stored so Parker can review it. I'm Iris, an AI assistant, not a person."

---

## Gotchas (MN / US) — short

| Issue | Takeaway |
|---|---|
| MN 626A | One-party OK; still disclose. |
| Out-of-state all-party recording laws | Disclosure + "by sending you agree" covers text chat better than silent logging. |
| AI disclosure | Say Iris is AI up front (banner + first reply habit). |
| Client's customers' data in paste | Client's duty; we delete secrets; don't invite PII dumps. |
| Training | Keep "we do not use your information to train AI models" + provider training-off settings. |
| Sales use later | Separate Counsel pass before Iris sells Shop Pass or quotes prices beyond published kit. |

## Apex / Theo checklist

- [ ] Feature flag; test client only until docs live
- [ ] Banner A + footer
- [ ] Privacy v2.0b text + hash + acceptance recount
- [ ] Starter Terms line + version/hash if required
- [ ] Confirm AI provider + training-off + storage location match Privacy
- [ ] Parker tap in Apex; Theo ping when card up
- [ ] Counsel spot-check live banner + Privacy after ship

