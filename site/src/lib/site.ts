export const site = {
  name: "MN Clockworks",
  url: "https://mnclockworks.com",
  email: "parker@mnclockworks.com",
  owner: "Parker Swanson",
  city: "Maple Grove",
  region: "MN",
  area: "Twin Cities, Minnesota",
  description:
    "Practical AI systems for Twin Cities trades businesses — plumbing, HVAC, electrical, landscaping. Never miss a call, chase every quote, get your evenings back.",
  cta: {
    label: "Book your free audit",
    sub: "30 minutes, no pitch. You leave with a written plan either way.",
  },
} as const;

export const nav = [
  { href: "/what-i-do/", label: "What I do" },
  { href: "/your-own-agent/", label: "Your own agent" },
  { href: "/how-it-works/", label: "How it works" },
  { href: "/results/", label: "Results" },
  { href: "/blog/", label: "Field notes" },
  { href: "/about/", label: "About" },
] as const;

/** Legacy pages that live outside the Next app — always plain <a>, never Link. */
export const legacy = {
  privacy: "/privacy.html",
  terms: "/terms.html",
  resources: "/resources.html",
  blog: "/blog/",
} as const;

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Prefix public/ assets referenced via raw <img>/<a> so /v3 previews resolve. */
export const asset = (p: string) => `${basePath}${p}`;
