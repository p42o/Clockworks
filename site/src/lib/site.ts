export const site = {
  name: "MN Clockworks",
  legalName: "PGS Ventures LLC",
  phone: { display: "(763) 202-7778", e164: "+17632027778", schema: "+1-763-202-7778", href: "tel:+17632027778" },
  areaServed: "Maple Grove and the northwest Twin Cities metro",
  url: "https://mnclockworks.com",
  email: "parker@mnclockworks.com",
  /** Absolute logo URL for schema (current clock mark, same file as the favicon). */
  logo: "https://mnclockworks.com/icon.svg",
  /** Profiles the site already linked (legacy /contact/). Never add unverified URLs. */
  sameAs: [
    "https://www.facebook.com/profile.php?id=61580475420690",
    "https://x.com/ClockworksMN",
  ],
  owner: "Parker Swanson",
  city: "Maple Grove",
  region: "MN",
  area: "Twin Cities, Minnesota",
  description:
    "Chief of Staff AI for small businesses. Email, quotes, marketing from day one. You approve what goes out. In person in the Twin Cities, remote elsewhere.",
  cta: {
    label: "Get in touch",
    sub: "Call or text (763) 202-7778, or send a message. A real person answers.",
  },
} as const;

export const nav = [
  { href: "/how-it-works/", label: "How it works" },
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
