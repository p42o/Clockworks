---
title: "From Missed Call to Booked Job in 90 Seconds"
date: "2026-03-18"
description: "The exact lead-response workflow we ship to home-service businesses. End-to-end — the trigger, the AI, the SMS, the handoff. ~$95/month, ~$2,500/week recovered."
legacyPath: "/blog/lead-response-workflow.html"
tags: [automation, leads, workflow]
---

The single biggest revenue leak I find in small home-service businesses isn't lead generation. It's lead *response*. The leads are coming in. They're just hitting voicemail, sitting in a contact form for six hours, or getting a "We'll call you back" reply that arrives three days later.

Industry-wide, the data on this is brutal:

- **5×** — Higher conversion if you respond in under 5 min
- **63%** — Of consumers book the first business that responds
- **~40%** — Average missed-call rate for trades during peak season

Here's the workflow I install on day one for any plumbing, HVAC, electrical, landscaping, or cleaning business that wants to plug the leak. It takes one focused afternoon to build, and it pays for itself with the first booked job it saves.

---

## What you'll need

- A business phone number you can route (Google Voice, OpenPhone, Dialpad, RingCentral — anything that supports webhooks or call forwarding)
- A scheduling tool with availability you can read programmatically (Jobber, Housecall Pro, Calendly, Acuity, Google Calendar)
- An automation hub: Zapier, Make, or n8n (self-hosted if you want to save the subscription)
- An LLM key — Claude or OpenAI, ~$5/month for a small business
- A texting service: Twilio is the cheapest; OpenPhone has built-in SMS API on paid plans

Total monthly cost when it's running: **~$60–$120**. Total time to build the first version: **about 90 minutes**.

---

## The flow, in plain English

1. **Caller dials your business line** — The call rings your team for 25 seconds. If nobody picks up, the call routes to the AI handler instead of voicemail.
2. **The AI agent answers in your voice** — Greets them by your business name, asks three questions: what's the issue, what's the address (zip is fine), and is it an emergency.
3. **The agent checks your real calendar** — Reads available slots from your scheduler and offers two times that fit. Books the slot if the caller says yes.
4. **SMS confirmation hits the customer's phone within 90 seconds** — "Hi Sarah — confirmed for Thursday 10 AM at your address on Elm. Reply YES to confirm or call us back to change."
5. **Slack or text alert to the owner** — You get a one-line summary: "New job booked — Sarah, broken garbage disposal, Thursday 10 AM. Emergency: no."
6. **Emergency escalation** — If the caller said it's an emergency (water everywhere, no heat, no power), the AI texts you immediately and tells the caller you'll call back in 5 minutes.

> Notice what isn't here: a chatbot, an AI receptionist replacing your team, or any "fully autonomous" claim. The AI handles the missed call. Your team handles the relationship.

---

## The system prompt that makes it work

This is 90% of the build. Get the prompt right and the rest is wiring. Adapt it to your business — the structure matters more than the words.

*"You are answering the phone for [Business Name], a [trade] company in [city]. Your only job is to: (1) find out what the caller needs, (2) confirm their address or zip, (3) determine if it's an emergency, and (4) offer two appointment times from this list: [calendar_slots]. Speak like a calm, friendly receptionist with 10 years on the job. Never quote prices. Never promise anything specific. If the caller is upset, acknowledge it once and keep moving. If they want to speak to a human, say someone will call back within 30 minutes and end the call."*

That's the whole brain. The rest is just the connective tissue between your phone, your calendar, and your phone again.

---

## Mistakes I see businesses make

1. **Letting the AI handle every call.** Don't. Front-line goes to your team. AI is the safety net.
2. **Trying to make it sell.** An AI on a 30-second call is a great triage tool and a terrible salesperson. Book the appointment, end the call.
3. **No emergency path.** If a customer's basement is flooding and the AI tries to schedule them for next Tuesday, you've lost them and the review.
4. **No human review for the first 50 calls.** Listen to the recordings. Tweak the prompt. Then trust it.
5. **Building it themselves with no fallback.** When the integration breaks at 9 PM on a Saturday, who fixes it? Have a plan.

---

## What this looks like in dollars

Conservative math from a recent client (small plumbing shop, ~$1.2M revenue):

- Average ticket: $420
- Missed calls per week before: ~22
- Calls captured by the AI workflow: ~14 (the rest hang up or were spam)
- Booked appointments from those: ~6
- Weekly recovered revenue: **~$2,500**
- Monthly cost of the workflow: **~$95**

That's the kind of math that makes "AI for small business" stop sounding like a buzzword.

Build it yourself if you've got the afternoon. If you don't, that's literally what we do at Clockworks — fixed price, two-week ship, full handoff. Either way, plug the leak.

— Parker Swanson, CEO of Clockworks
