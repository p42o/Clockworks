---
title: "The 5-Minute Email Triage Setup That Buys Back Your Mornings"
date: "2026-02-12"
description: "A no-code AI inbox setup that flags the three emails that actually matter and silences the rest. Twenty minutes to install. Saves most owners 5–7 hours a week."
legacyPath: "/blog/email-triage-tip.html"
tags: [email, gmail, tip]
---

Every business owner I work with has the same morning: open phone, swipe through 60 emails, mark 3 as important, lose the next hour responding to the noise instead of the signal. The fix is embarrassingly simple. You don't need a new tool. You need 20 minutes and a Gmail or Outlook account.

This is the exact setup I run for myself and the one I install for clients on day one.

---

## What this does

Three labels show up in your inbox each morning:

- **🔴 Reply Today**: real customer questions, money-related, time-sensitive
- **🟡 FYI**: useful but doesn't need a reply (confirmations, receipts, updates)
- **⚪ Noise**: newsletters, promos, automated junk you forgot to unsubscribe from

You read 🔴 first, skim 🟡 over coffee, and never look at ⚪. That's it.

> The trick isn't building a smarter inbox. It's letting AI do triage *before* you open the app, so you only see what deserves your attention.

---

## The setup, step by step

### 1. Use Gmail's built-in AI labels (free)

Open Gmail on web → Settings (gear) → See all settings → Filters and Blocked Addresses → Create a new filter. Skip this step if you're on Outlook. The equivalent is "Rules → New rule" with similar logic.

### 2. Build the "Reply Today" rule

Has the words: `"quote" OR "estimate" OR "invoice" OR "when can you" OR "schedule" OR "urgent" OR "today"`

Action: Apply label `🔴 Reply Today` + Star + Never send to spam.

### 3. Build the "Noise" rule

Has the words: `unsubscribe OR "view in browser" OR newsletter OR "marketing email"`

Action: Apply label `⚪ Noise` + Skip the Inbox.

### 4. Default everything else to "FYI"

One more rule: `has:nouserlabels` → apply `🟡 FYI`. Anything that didn't match the first two now lands here.

### 5. (Optional) Layer Claude or ChatGPT on top

If you want smarter classification (emails that don't have obvious keywords but are still important), connect your inbox to Claude or ChatGPT via Zapier or Make. The prompt I use:

*"You are an email triage assistant for a small business owner. Read this email and respond with only one of: REPLY_TODAY, FYI, NOISE. Reply today means it requires the owner's response within 24 hours, involves money, scheduling, or a real customer question."*

That single prompt catches the edge cases the keyword rules miss.

---

## Why this works when fancier tools don't

I've tried every "AI inbox" SaaS on the market. Most of them fail for the same reason: they hide your email behind a new interface, your team won't switch, and you end up paying $30/month to feel guilty about not using it.

The setup above lives inside the inbox you already use. Your team already knows it. Nothing to learn. No vendor to fire when prices go up.

Take the 20 minutes today. If you want me to look over your shoulder while you set it up, that's what the free call is for.
