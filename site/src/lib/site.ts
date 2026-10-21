export const site = {
  name: "MN Clockworks",
  url: "https://mnclockworks.com",
  email: "parker@mnclockworks.com",
  owner: "Parker Swanson",
  city: "Maple Grove",
  region: "Minnesota",
  area: "Minnesota (Twin Cities)",
  description:
    "I'm Parker, in Maple Grove. I set up an AI team of agents for the messages, quotes, and paperwork that pile up while you're working. You share your screen. I do the setup and explain what I'm doing.",
  cta: {
    label: "Get my free 15-minute phone audit",
    sub: "Call (763) 296-9777",
  },
} as const;

/** Homepage anchors. Other pages prefix these with the site root. */
export const nav = [
  { href: "/#team", label: "Team" },
  { href: "/#how", label: "How it works" },
  { href: "/#industries", label: "Industries" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

/** Legacy pages that live outside the Next app — always plain <a>, never Link. */
export const legacy = {
  privacy: "https://mnclockworks.com/portal/client/#/privacy-notice",
  terms: "/terms/",
  resources: "/resources.html",
  blog: "/blog/",
} as const;

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Prefix public/ assets referenced via raw <img>/<a> so /v3 previews resolve. */
export const asset = (p: string) => `${basePath}${p}`;
