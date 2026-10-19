export const site = {
  name: "MN Clockworks",
  legalName: "PGS Ventures LLC",
  phone: { display: "(763) 202-7778", e164: "+17632027778", schema: "+1-763-202-7778", href: "tel:+17632027778" },
  areaServed: "Maple Grove and the northwest Twin Cities metro",
  url: "https://mnclockworks.com",
  email: "parker@mnclockworks.com",
  owner: "Parker Swanson",
  city: "Maple Grove",
  region: "MN",
  area: "Twin Cities, Minnesota",
  description:
    "A ready AI team for your business, set up in person and working on day one. You own it, and you approve what goes out. MN Clockworks, Maple Grove, MN.",
  cta: {
    label: "Call or send a message",
    sub: "Call or text (763) 202-7778, or send a message. A real person answers.",
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
