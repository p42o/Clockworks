import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import PhoneCTA from "@/components/PhoneCTA";
import { ownershipLine, primaryCta, serviceTowns } from "@/lib/copy";
import { pageSocial, site } from "@/lib/site";

/* Copy: Sprocket, presence/2026-10-23-offer-pages-copy.md (/what-i-do/). */
const title = "AI team setup in Maple Grove | MN Clockworks";
const description =
  "I\u2019m Parker in Maple Grove. I set up six AI agents with you over screen share. You approve the drafts and own your account. Start with a free phone audit.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/what-i-do/" },
  ...pageSocial(title, description, "/what-i-do/"),
};

const agents: [string, string][] = [
  ["Call Catch", "helps you follow up with callers you missed."],
  ["Quote Chaser", "follows up on quotes that have gone quiet."],
  ["Review Engine", "asks every customer for a review, the same way each time."],
  ["Paper Mover", "drafts reminders for unpaid invoices and keeps paperwork moving."],
  ["Intel Desk", "keeps an eye on local demand and what competitors are doing, using public information."],
  ["Front Desk", "helps answer customer questions from information you approve."],
];

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "AI team setup",
  serviceType: "AI agent setup for small businesses",
  url: `${site.url}/what-i-do/`,
  provider: { "@id": `${site.url}/#business` },
  areaServed: serviceTowns.map((name) => ({ "@type": "City", name, containedInPlace: { "@type": "State", name: "Minnesota" } })),
};

function Section({ n, eyebrow, heading, children }: { n: string; eyebrow: string; heading: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <p className="eyebrow section-rule">{n} / {eyebrow}</p>
      <h2 className="display mb-6 mt-4 text-4xl sm:text-5xl">{heading}</h2>
      <div className="max-w-3xl space-y-4 text-lg leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export default function WhatIDo() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-36 sm:px-8">
        <p className="eyebrow section-rule">What I set up</p>
        <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">AI help for the work around your work</h1>
      </section>
      <Section n="01" eyebrow="Introduction" heading="One person in Maple Grove">
        <p>
          I&apos;m Parker Swanson, based in Maple Grove. I run MN Clockworks myself. I&apos;ve spent years in hands-on technical operations, and I started building AI systems for my own life before setting them up for other businesses. When you work with me, I do the setup. There is no account manager between you and the person building it.
        </p>
        <p>
          I focus on the messages, quotes and paperwork around the work you already do. A caller needs a reply. A quote has gone quiet. An invoice is still open. Those are specific jobs, so I give each agent a specific job too.
        </p>
      </Section>
      <Section n="02" eyebrow="The team" heading="Six agents, with a job for each">
        <ul className="space-y-3">
          {agents.map(([name, job]) => (
            <li key={name}>
              <strong className="font-medium text-ink">{name}</strong> {job}
            </li>
          ))}
        </ul>
        <p>
          These are the jobs I set up, rather than a claim that your business should run itself. The agents work from your business information and instructions. You decide whether a draft fits the customer and the situation before it goes anywhere.
        </p>
      </Section>
      <Section n="03" eyebrow="Approval" heading="Drafts, with you making the decision">
        <p>
          This is not autopilot. I build the team around owner approval. A follow-up draft is still a draft, and an invoice reminder still needs your judgment. You approve the words that go out. When a conversation needs a person, it comes to one.
        </p>
        <p>
          That matters for the small details too: what your business handles, what a customer asked, and what you are ready to say. I set up the team with you so those instructions come from you.
        </p>
      </Section>
      <Section n="04" eyebrow="Setup" heading="Start with a phone conversation">
        <p>
          The free 15-minute phone audit is a place to talk through the work that piles up: missed callers, unanswered questions, quiet quotes and paperwork. If you want a separate look at how your business appears online, the optional $50 Online Presence Assessment checks search, AI assistants and review sites. It includes the exact searches and prompts and an interactive report.
        </p>
        <p data-setup-mode="screen-share">
          The deployment is $500 one time, over screen share. You share your screen while I build the team with you, explain the setup, test it with you and walk you through using it. Video is available if you like. The account belongs to you after setup.
        </p>
      </Section>
      <Section n="05" eyebrow="Ownership" heading="Your information and your account">
        <p>{ownershipLine}</p>
        <p>
          I confirm the scope in writing. Please read the{" "}
          <Link href="/terms/" className="link-draw text-ink">Starter Terms</Link> and{" "}
          <a href="/portal/client/#/privacy-notice" className="link-draw text-ink">Privacy Notice</a> before buying.
        </p>
      </Section>
      <Section n="06" eyebrow="Towns" heading="Based in Maple Grove">
        <p>
          I serve {serviceTowns.join(", ")}, and Minnesota businesses by phone and screen share.
        </p>
      </Section>
      <PhoneCTA button={primaryCta} sub="Tell me which messages or paperwork are piling up." />
    </>
  );
}
