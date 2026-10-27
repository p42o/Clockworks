import type { Metadata } from "next";
import Script from "next/script";
import { Instrument_Serif } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ViewTransitions } from "next-view-transitions";
import { site } from "@/lib/site";
import { phone, serviceTowns } from "@/lib/copy";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatGate from "@/components/ChatGate";
import "./globals.css";

const instrument = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "MN Clockworks",
    template: "%s · MN Clockworks",
  },
  description: site.description,
  keywords: [
    "AI agents Minnesota",
    "AI for plumbers",
    "AI for HVAC",
    "AI for electricians",
    "Maple Grove",
    "Twin Cities",
  ],
  openGraph: {
    type: "website",
    url: site.url,
    siteName: site.name,
    title: "Your AI team. I'll handle the setup.",
    description: site.description,
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your AI team. I'll handle the setup.",
    description: site.description,
    images: ["/og.png"],
  },
  robots: process.env.NEXT_PUBLIC_BASE_PATH
    ? { index: false, follow: false }
    : { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["ProfessionalService", "LocalBusiness"],
  "@id": "https://mnclockworks.com/#business",
  name: site.name,
  url: site.url,
  telephone: phone.schema,
  email: site.email,
  address: { "@type": "PostalAddress", addressLocality: "Maple Grove", addressRegion: "MN", addressCountry: "US" },
  contactPoint: [{ "@type": "ContactPoint", contactType: "customer service", telephone: phone.schema, email: site.email, areaServed: "US-MN", availableLanguage: "en" }],
  founder: { "@type": "Person", name: site.owner },
  description: site.description,
  areaServed: [
    ...serviceTowns.map((name) => ({ "@type": "City", name, containedInPlace: { "@type": "State", name: "Minnesota" } })),
    { "@type": "State", name: "Minnesota" },
  ],
  logo: `${site.url}/icon.svg`,
  image: `${site.url}/og.png`,
  sameAs: [
    "https://www.facebook.com/profile.php?id=61580475420690",
    "https://x.com/ClockworksMN",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ViewTransitions>
      <html
        lang="en"
        className={`${instrument.variable} ${GeistSans.variable} ${GeistMono.variable}`}
      >
        <body className="grain min-h-dvh flex flex-col" data-cw="v2">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          {/* GA4 — same property as the legacy site; omitted on /v3 previews */}
          {!process.env.NEXT_PUBLIC_BASE_PATH && (
            <>
              {/* GA4 loader with a Global Privacy Control guard (Counsel ruling 2026-10-23): under GPC
                  (or DNT) gtag.js is never requested and no page_view is sent. check-pages enforces it. */}
              <Script id="ga4" strategy="afterInteractive">
                {`window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  (function () {
                    var n = window.navigator || {};
                    if (n.globalPrivacyControl === true || n.doNotTrack === "1" || window.doNotTrack === "1") {
                      window["ga-disable-G-PSNYLVG4V1"] = true;
                      return;
                    }
                    var s = document.createElement("script");
                    s.async = true;
                    s.src = "https://www.googletagmanager.com/gtag/js?id=G-PSNYLVG4V1";
                    document.head.appendChild(s);
                    gtag('js', new Date());
                    gtag('config', 'G-PSNYLVG4V1');
                  })();`}
              </Script>
              {/* Shared GA4 events (calls, email, booking). Reduced data; see public/cw-events.js */}
              <Script src="/cw-events.js" strategy="afterInteractive" />
              {/* Iris public site chat (see /iris/iris.js for the irisPublicChat flag). */}
              <Script src="/iris/iris.js?v=20261027b" strategy="afterInteractive" />
            </>
          )}
          <a href="#content" className="skip-link">
            Skip to content
          </a>
          <Header />
          <main id="content" tabIndex={-1} className="flex-1">
            {children}
          </main>
          <Footer />
          <ChatGate />
        </body>
      </html>
    </ViewTransitions>
  );
}
