import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ViewTransitions } from "next-view-transitions";
import { site } from "@/lib/site";
import { phone } from "@/lib/copy";
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
  name: site.name,
  url: site.url,
  telephone: phone.schema,
  email: site.email,
  founder: { "@type": "Person", name: site.owner },
  description: site.description,
  areaServed: { "@type": "AdministrativeArea", name: "Minnesota (Twin Cities)" },
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
          {/* Analytics hook only. No tracking script is loaded on this build.
              A later property would go here, and would stay off /v3 previews. */}
          <a href="#content" className="skip-link">
            Skip to content
          </a>
          <Header />
          <main id="content" className="flex-1">
            {children}
          </main>
          <Footer />
          <ChatWidget />
        </body>
      </html>
    </ViewTransitions>
  );
}
