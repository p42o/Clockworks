import type { Metadata } from "next";
import Script from "next/script";
import { Instrument_Serif } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ViewTransitions } from "next-view-transitions";
import { site } from "@/lib/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
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
    default: "MN Clockworks: Chief of Staff AI for small businesses",
    template: "%s · MN Clockworks",
  },
  description: site.description,
  keywords: [
    "AI automation Minnesota",
    "AI team setup",
    "Chief of Staff AI",
    "missed call text back",
    "AI receptionist Twin Cities",
    "NW Twin Cities metro",
    "Maple Grove",
    "Minneapolis",
    "St. Paul",
  ],
  openGraph: {
    type: "website",
    url: site.url,
    siteName: site.name,
    title: "Get your evenings back — MN Clockworks",
    description: site.description,
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Get your evenings back — MN Clockworks",
    description: site.description,
    images: ["/og.png"],
  },
  // The /v3 preview build must never get indexed; the root build must.
  robots: process.env.NEXT_PUBLIC_BASE_PATH
    ? { index: false, follow: false }
    : { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: site.name,
  legalName: site.legalName,
  telephone: site.phone.schema,
  email: site.email,
  image: `${site.url}/og.png`,
  "@id": `${site.url}/#business`,
  contactPoint: { "@type": "ContactPoint", email: site.email, telephone: site.phone.schema, contactType: "customer service", areaServed: "US", availableLanguage: "English" },
  url: site.url,
  founder: { "@type": "Person", name: site.owner },
  description: site.description,
  address: {
    "@type": "PostalAddress",
    addressLocality: site.city,
    addressRegion: site.region,
    addressCountry: "US",
  },
  areaServed: [
    { "@type": "City", name: site.city },
    { "@type": "AdministrativeArea", name: "Northwest Twin Cities metro (Minneapolis–St. Paul, MN)" },
  ],
  knowsAbout: [
    "AI automation",
    "missed-call text back",
    "quote follow-up automation",
    "review automation",
    "Jobber",
    "QuickBooks",
    "Housecall Pro",
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
        <body className="grain min-h-dvh flex flex-col" data-cw="v3">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          {/* GA4 — same property as the legacy site; omitted on /v3 previews */}
          {!process.env.NEXT_PUBLIC_BASE_PATH && (
            <>
              <Script
                src="https://www.googletagmanager.com/gtag/js?id=G-PSNYLVG4V1"
                strategy="afterInteractive"
              />
              <Script id="ga4" strategy="afterInteractive">
                {`window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', 'G-PSNYLVG4V1');`}
              </Script>
            </>
          )}
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ChatWidget />
        </body>
      </html>
    </ViewTransitions>
  );
}
