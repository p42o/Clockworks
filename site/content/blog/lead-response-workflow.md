---
title: "A Missed-Call Lead-Response Workflow"
date: "2026-03-18"
description: "A proposed lead-response workflow: the trigger, the AI, the SMS, and the human handoff."
legacyPath: "/blog/lead-response-workflow.html"
tags: [automation, leads, workflow]
---

Shop scenario: a composite of situations common in Twin Cities shops. Not a real client. Names and numbers are illustrative, and your results will differ.

I would plan a missed-call workflow around a clear handoff: collect the caller's request, check available appointments, and route anything uncertain to a person. This guide describes a proposed workflow, not a finished installation.

## What you'll need

- A business phone number you can route (Google Voice, OpenPhone, Dialpad, RingCentral, anything that supports webhooks or call forwarding)
- A scheduling tool with availability you can read programmatically (Jobber, Housecall Pro, Calendly, Acuity, Google Calendar)
- An automation hub: Zapier, Make, or n8n (self-hosted if you want to save the subscription)
- An LLM key (Claude or OpenAI), ~$5/month for a small business
- A texting service: Twilio is the cheapest; OpenPhone has built-in SMS API on paid plans

For example, I would budget a total monthly software cost of **~$60 to $120**.

---

## A proposed flow, in plain English

1. **Caller dials your business line.** The call rings your team for 25 seconds. If nobody picks up, the call routes to the AI handler instead of voicemail.
2. **The AI agent answers in your voice.** Greets them by your business name, asks three questions: what's the issue, what's the address (zip is fine), and is it an emergency.
3. **The agent checks your real calendar.** Reads available slots from your scheduler and offers two times that fit. Books the slot if the caller says yes.
4. **Send an SMS confirmation after booking.** "Hi Sarah, confirmed for Thursday 10 AM at your address on Elm. Reply YES to confirm or call us back to change."
5. **Slack or text alert to the owner.** You get a one-line summary: "New job booked: Sarah, broken garbage disposal, Thursday 10 AM. Emergency: no."
6. **Emergency escalation.** If the caller said it's an emergency (water everywhere, no heat, no power), the AI texts you immediately and explains how to reach a person without promising a callback time.

> Notice what isn't here: a chatbot, an AI receptionist replacing your team, or any "fully autonomous" claim. The AI handles the missed call. Your team handles the relationship.

---

## The system prompt that makes it work

I would adapt this sample prompt to the business and test it alongside the phone, calendar, and messaging connections.

*"You are answering the phone for [Business Name], a [trade] company in [city]. Your only job is to: (1) find out what the caller needs, (2) confirm their address or zip, (3) determine if it's an emergency, and (4) offer two appointment times from this list: [calendar_slots]. Speak like a calm, friendly receptionist with 10 years on the job. Never quote prices. Never promise anything specific. If the caller is upset, acknowledge it once and keep moving. If they want to speak to a human, collect their callback details and route the request to a person. Do not promise a callback time."*

That's the whole brain. The rest is just the connective tissue between your phone, your calendar, and your phone again.

---

## Mistakes I would avoid

1. **Letting the AI handle every call.** Don't. Front-line goes to your team. AI is the safety net.
2. **Trying to make it sell.** An AI on a 30-second call is a great triage tool and a terrible salesperson. Book the appointment, end the call.
3. **No emergency path.** I would check that an urgent request, such as a flooded basement, reaches a person instead of an offer to schedule for next Tuesday.
4. **No human review.** Review calls, correct the prompt, and keep checking how the workflow handles exceptions.
5. **Building it themselves with no fallback.** When the integration breaks at 9 PM on a Saturday, who fixes it? Have a plan.

---

## How I would evaluate the workflow

I would track missed calls, completed bookings, failed handoffs, and the time spent reviewing calls. I would compare those records with the previous process before drawing conclusions about value.

Software costs depend on the tools and usage. Setup, maintenance, and human review also need to be considered. This workflow does not guarantee bookings, time savings, or revenue.

Call or send a message at mnclockworks.com.
