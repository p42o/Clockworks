/**
 * Approved V2 marketing copy. Homepage and subpages render these strings
 * so visible FAQ text and FAQPage JSON-LD stay identical.
 * No em dashes, no en dashes, no prices beyond the three approved offers.
 */

/**
 * Business phone: the ONE place it lives. Every page, the header, footer,
 * contact page and the LocalBusiness JSON-LD read from here.
 * Parker, 2026-10-23 1:14 PM CT: (763) 296-9777, the Iris voice line.
 */
export const PHONE_DIGITS = "7632969777";

function businessPhone(digits: string) {
  return {
    display: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`,
    tel: `tel:+1${digits}`,
    schema: `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`,
    pending: false as boolean,
  };
}

export const phone = businessPhone(PHONE_DIGITS);

/**
 * Call disclosure (Counsel, mandatory next to any call number). Tied to the
 * phone above: PhoneCTA renders it right under phone.display. If the number
 * Parker confirms is NOT answered by Iris, set PHONE_ANSWERED_BY_IRIS = false
 * and the Iris line drops everywhere the phone CTA appears.
 */
export const PHONE_ANSWERED_BY_IRIS = true;
export const irisNotice =
  "Iris is an AI assistant. Calls are recorded and transcribed by our AI service provider.";

/** Approved service-area list. No Saint Paul. No doorway page. */
export const serviceTowns = [
  "Maple Grove",
  "Osseo",
  "Brooklyn Park",
  "Plymouth",
  "New Hope",
  "Golden Valley",
  "Rogers",
  "Dayton",
  "Corcoran",
  "Medina",
  "Champlin",
  "Anoka",
  "Coon Rapids",
  "Brooklyn Center",
  "Minneapolis",
] as const;

export const ownershipLine =
  "Your business information, your instructions and the content we write for you are yours, and your AI team runs on your own platform account.";

export const deploymentLine =
  "The deployment is $500, one time. We do it together on a call with screen share, and video if you like. We set up your AI team with you, test it together, and walk you through how to use it.";

export const assessmentLine =
  "The online presence assessment is $50. We check how your business shows up across search, AI assistants, and ratings and review sites. You get the exact searches and prompts we ran, plus an interactive report showing where you showed up that day and what we'd recommend improving. It's a snapshot, since search results and AI answers change on their own, but it gives you a baseline to compare against later.";

export const agreementLine =
  "Simple written terms, in plain English. Please read the Starter Terms and Privacy Notice before you buy.";

export const quoteLine =
  "Nothing on this site is a quote or a contract. Parker confirms everything in writing.";

export const cancelLine =
  "Cancelling is covered in the Starter Terms, your written agreement with PGS Ventures LLC (MN Clockworks). Please read them before you buy.";

export const formHonestLine =
  "I can't book a time from this form. Parker will reach out.";

export const primaryCta = "Get my free 15-minute phone audit";
export const assessmentCta = "Get the $50 Online Presence Assessment";
export const chatCta = "Talk to the Front Desk";

export const hero = {
  h1: "Your AI team. I'll handle the setup.",
  sub: "I'm Parker, in Maple Grove. I set up an AI team of agents for the messages, quotes, and paperwork that pile up while you're working. You share your screen. I do the setup and explain what I'm doing.",
} as const;

export type Agent = {
  id: string;
  name: string;
  line: string;
  task: string;
  draft: string;
};

export const agents: Agent[] = [
  {
    id: "call-catch",
    name: "Call Catch",
    line: "helps you follow up with callers you missed.",
    task: "A caller hangs up while you are on a job.",
    draft:
      "Sorry we missed your call. Reply with what you need and a good time for a call back.",
  },
  {
    id: "quote-chaser",
    name: "Quote Chaser",
    line: "follows up on quotes that have gone quiet.",
    task: "A quote you sent has gone quiet.",
    draft:
      "Checking in on the quote I sent. Happy to answer questions or adjust the scope. Want me to hold a date?",
  },
  {
    id: "review-engine",
    name: "Review Engine",
    line: "asks every customer for a review, the same way each time.",
    task: "The job is done, and the review ask is still unsent.",
    draft:
      "Thanks again for having us out. An honest review helps neighbors find a local shop. Here is the link.",
  },
  {
    id: "paper-mover",
    name: "Paper Mover",
    line: "drafts reminders for unpaid invoices and keeps paperwork moving.",
    task: "An invoice is still open.",
    draft:
      "A reminder that this invoice is still open. Here is the pay link if you want it. Tell me if anything on the bill looks off.",
  },
  {
    id: "intel-desk",
    name: "Intel Desk",
    line: "keeps an eye on local demand and what competitors are doing, using public information.",
    task: "A look at public posts about what people nearby are asking for.",
    draft:
      "Public posts this week mention furnace checks and water heater leaks in the north metro. No private data. This note stays with you. It is not a message to send.",
  },
  {
    id: "front-desk",
    name: "Front Desk",
    line: "helps answer customer questions from information you approve.",
    task: "A customer asks a question you have already approved an answer for.",
    draft:
      "We do handle that. I can take the address and the best time for a call back. Nothing here goes out until you approve it.",
  },
];

export const jobExample = {
  kicker: "Example",
  title: "One missed call. The team finishes that job together.",
  note: "The team drafts. You approve. Nothing goes out until you say so.",
  steps: [
    {
      agent: "Call Catch",
      does: "Drafts the follow-up for the caller you missed.",
      draft:
        "Sorry we missed your call. Reply with what you need and a good time for a call back.",
    },
    {
      agent: "Front Desk",
      does: "Drafts an answer to the question, from information you already approved.",
      draft:
        "We can help with that. Share the address and a time that works for a call back, and we will confirm once you approve the reply.",
    },
    {
      agent: "Quote Chaser",
      does: "Drafts a follow-up when the quote goes quiet.",
      draft:
        "Checking in on the quote. Happy to walk through it or change the scope. Should I hold a date?",
    },
    {
      agent: "Paper Mover",
      does: "Drafts a reminder for the unpaid invoice.",
      draft:
        "A reminder that this invoice is still open. Here is the pay link. Tell me if a line looks wrong.",
    },
    {
      agent: "Review Engine",
      does: "Drafts the review ask, the same way as the last one.",
      draft:
        "Thanks again for having us out. An honest review helps other people nearby find us.",
    },
    {
      agent: "Intel Desk",
      does: "Leaves you a note from public information. It does not message anyone.",
      draft:
        "Public posts nearby are asking about the same kind of job. This is a note for you, not a draft to send.",
    },
  ],
} as const;

export type Industry = {
  id: string;
  name: string;
  group: "primary" | "secondary";
  fit: string[];
  example: string;
};

export const industries: Industry[] = [
  {
    id: "plumbing",
    name: "Plumbing",
    group: "primary",
    fit: ["Call Catch", "Front Desk", "Quote Chaser", "Paper Mover", "Review Engine"],
    example:
      "Example: you are under a sink and miss a call about a water heater. Call Catch drafts the follow-up. You approve it before anything goes out.",
  },
  {
    id: "hvac",
    name: "HVAC",
    group: "primary",
    fit: ["Call Catch", "Front Desk", "Quote Chaser", "Review Engine", "Intel Desk"],
    example:
      "Example: someone asks about a furnace that will not start. Front Desk drafts an answer from the information you approved. Quote Chaser drafts a follow-up if you send a quote.",
  },
  {
    id: "electrical",
    name: "Electrical",
    group: "primary",
    fit: ["Call Catch", "Front Desk", "Paper Mover", "Review Engine"],
    example:
      "Example: a shop calls about a panel while you are on another job. Call Catch drafts the missed-call note. Paper Mover drafts the invoice reminder after the work. You approve each one.",
  },
  {
    id: "real-estate",
    name: "Real estate",
    group: "primary",
    fit: ["Front Desk", "Call Catch", "Paper Mover"],
    example:
      "Example: a buyer asks about a listing. Front Desk can draft an inquiry summary, an appointment request, or a listing draft. All of it waits for your approval.",
  },
  {
    id: "landscaping",
    name: "Landscaping",
    group: "primary",
    fit: ["Quote Chaser", "Review Engine", "Call Catch", "Front Desk"],
    example:
      "Example: a cleanup quote goes quiet. Quote Chaser drafts the follow-up. After the work, Review Engine drafts the review ask, the same way each time. You approve both.",
  },
  {
    id: "property",
    name: "Property management",
    group: "secondary",
    fit: ["Front Desk", "Paper Mover", "Call Catch"],
    example:
      "Example: a tenant asks a maintenance question you have answered before. Front Desk drafts a reply from the information you approved. Nothing goes out until you say so.",
  },
  {
    id: "cleaning",
    name: "Cleaning",
    group: "secondary",
    fit: ["Front Desk", "Quote Chaser", "Paper Mover", "Review Engine"],
    example:
      "Example: a recurring client asks to add a visit. Front Desk drafts the reply. If a bill is open, Paper Mover drafts the reminder. You approve what goes out.",
  },
  {
    id: "professional",
    name: "Professional services",
    group: "secondary",
    fit: ["Front Desk", "Call Catch", "Paper Mover", "Intel Desk"],
    example:
      "Example: a new inquiry asks about a first meeting. Front Desk drafts a short answer and an appointment request. You approve it before it is sent.",
  },
];

export const steps = [
  {
    n: "1",
    title: "Free 15-minute phone audit",
    body: `Call ${phone.display}. Iris, our AI phone assistant, takes your details for Parker. We look at missed calls, quiet quotes, open invoices, review asks, and the questions you answer over and over.`,
  },
  {
    n: "2",
    title: "Optional $50 online presence assessment",
    body: assessmentLine,
  },
  {
    n: "3",
    title: "$500 one-time deployment, done together over screen share",
    body: "We do it together on a call with screen share, and video if you like. We set up your AI team with you, test it together, and walk you through how to use it. You watch it get built.",
  },
  {
    n: "4",
    title: "It runs on your own account",
    body: ownershipLine,
  },
] as const;

export const easyPoints = [
  { t: "No IT project", d: "You share your screen. I do the setup and explain what I'm doing." },
  { t: "No new app to learn", d: "The team works from the tools and the account you already use. I am not handing you a rented inbox." },
  { t: "Your own account", d: "Not an app you rent from me. The team runs on your own AI account, under your own plan with that platform." },
  { t: "You approve what goes out", d: "The team drafts. You approve. Nothing goes out until you say so." },
  { t: "I do it myself", d: "I build these, so let me be precise instead of breathless. There is no sales team on the call." },
  { t: "Plain written terms", d: agreementLine },
] as const;

export const faq: { q: string; a: string }[] = [
  {
    q: "What is Clockworks?",
    a: "Clockworks sets up a real team of AI agents for your business, each with its own job, running on your own AI account. I do the setup with you on a screen-share call. The team drafts. You approve. Nothing goes out until you say so.",
  },
  {
    q: "How does setup work?",
    a: `You call ${phone.display} for a free 15-minute phone audit. If you want it, the online presence assessment is $50. Then the deployment is $500, one time. We do it together on a call with screen share, and video if you like. We set up your AI team with you, test it together, and walk you through how to use it. After that it runs on your own account.`,
  },
  {
    q: "Whose account does it run on?",
    a: ownershipLine,
  },
  {
    q: "Who approves messages?",
    a: "The team drafts. You approve. Nothing goes out until you say so. I set the team up with you, and you decide what is allowed to send.",
  },
  {
    q: "Which businesses does this fit?",
    a: "Plumbing, HVAC, and electrical first, with real estate alongside them: inquiry summaries, appointment requests, and listing drafts, all subject to your approval. Landscaping is a fit too. So are property management, cleaning, and professional services. These are examples of the work, not a client list.",
  },
  {
    q: "Do I need to be technical?",
    a: "No. This is not an IT project, and there is no new app to learn. You share your screen. I do the setup and explain what I'm doing.",
  },
  {
    q: "Is my information mine?",
    a: ownershipLine,
  },
  {
    q: "What about contracts and cancelling?",
    a: cancelLine,
  },
  {
    q: "What does it cost?",
    a: `The phone audit is free and takes 15 minutes. ${assessmentLine} ${deploymentLine} ${quoteLine}`,
  },
  {
    q: "Can I talk to a person?",
    a: `Yes. Call ${phone.display}. Iris, our AI phone assistant, answers and takes a message for Parker, and calls are recorded and transcribed. You can also leave a note on the book page, and Parker will reach out. Or use Talk to the Front Desk on this site.`,
  },
];

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
